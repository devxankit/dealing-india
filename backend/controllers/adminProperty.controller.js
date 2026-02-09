import Property from '../models/Property.model.js';
import Vendor from '../models/Vendor.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

/**
 * Get all Properties (Admin/Public)
 * GET /api/admin/properties
 */
export const getAllProperties = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', status = 'all', vendor = 'all', listingType = 'all', businessType = 'all' } = req.query;

    const query = {};

    // Search
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { 'location.city': { $regex: search, $options: 'i' } },
            { 'location.address': { $regex: search, $options: 'i' } },
            { propertyType: { $regex: search, $options: 'i' } }
        ];
    }

    // Status Filter (Assuming 'isActive' is used for visibility)
    if (status !== 'all') {
        if (status === 'active') query.isActive = true;
        else if (status === 'inactive') query.isActive = false;
    }

    // Listing Type Filter
    if (listingType !== 'all') {
        query.listingType = listingType;
    }

    // Business Type Filter (Vendor's Business Type)
    if (businessType !== 'all') {
        const vendors = await Vendor.find({ businessType: businessType }).select('_id');
        const vendorIds = vendors.map(v => v._id);
        if (vendorIds.length > 0) {
            // If we already have a vendorId query (from specific vendor search), we need to check intersection
            // But for simplicity, let's assume this adds to it or we use $in
            if (query.vendorId) {
                // If vendorId is already set (single vendor), we check if it's in the allowed list
                // This is a bit complex if they don't match, but usually these filters are exclusive or intersecting
                // For now, let's just overwrite or AND it.
                // Simpler: If user searched for a specific vendor AND filtered by type, 
                // we should only find that vendor IF they match the type.

                // However, the previous logic sets query.vendorId = vendorDoc._id
                // So let's check if that ID is in our list
                const vid = query.vendorId.toString();
                if (!vendorIds.map(id => id.toString()).includes(vid)) {
                    // No match
                    return res.status(200).json({
                        success: true,
                        data: [],
                        pagination: { page, limit, total: 0, pages: 0 }
                    });
                }
            } else {
                query.vendorId = { $in: vendorIds };
            }
        } else {
            return res.status(200).json({
                success: true,
                data: [],
                pagination: { page, limit, total: 0, pages: 0 }
            });
        }
    }

    // Vendor Filter (Search by name/email)
    if (vendor !== 'all' && !query.vendorId) { // Only run if we haven't already filtered to 0 matches or set strict ID
        // Find Vendor by name or email
        const vendorDoc = await Vendor.findOne({
            $or: [
                { storeName: { $regex: vendor, $options: 'i' } },
                { email: { $regex: vendor, $options: 'i' } }
            ]
        });
        if (vendorDoc) {
            // If we already have a vendorId set by businessType filter
            if (query.vendorId) {
                // Check if this vendor is in the allowed list
                const allowedIds = query.vendorId.$in.map(id => id.toString());
                if (allowedIds.includes(vendorDoc._id.toString())) {
                    query.vendorId = vendorDoc._id; // Specific vendor wins
                } else {
                    // Vendor found but doesn't match business type filter
                    return res.status(200).json({
                        success: true,
                        data: [],
                        pagination: { page, limit, total: 0, pages: 0 }
                    });
                }
            } else {
                query.vendorId = vendorDoc._id;
            }
        } else {
            // If vendor not found, return empty result
            return res.status(200).json({
                success: true,
                data: [],
                pagination: { page, limit, total: 0, pages: 0 }
            });
        }
    }

    // Optimize: Run count and find in parallel with lean()
    const [total, properties] = await Promise.all([
        Property.countDocuments(query),
        Property.find(query)
            .populate('vendorId', 'name storeName email vendorType status businessType')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean()
    ]);

    // Format for response
    const formattedProperties = properties.map(prop => ({
        _id: prop._id,
        title: prop.title,
        type: prop.propertyType,
        listingType: prop.listingType,
        price: prop.price,
        location: prop.location,
        status: prop.status,
        isActive: prop.isActive,
        media: prop.media,
        vendor: prop.vendorId ? {
            name: prop.vendorId.storeName || prop.vendorId.name,
            email: prop.vendorId.email,
            type: prop.vendorId.vendorType
        } : null,
        createdAt: prop.createdAt
    }));

    res.status(200).json({
        success: true,
        data: formattedProperties,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });

});

/**
 * Get Property By ID (Admin)
 * GET /api/admin/properties/:id
 */
export const getPropertyById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const property = await Property.findById(id)
        .populate('vendorId', 'name storeName email phone vendorType status businessType')
        .lean(); // Add lean() for performance

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    res.status(200).json({
        success: true,
        data: property
    });
});

/**
 * Update Property Status (Admin)
 * PATCH /api/admin/properties/:id/status
 */
export const updatePropertyStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const property = await Property.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
    );

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    res.status(200).json({
        success: true,
        message: `Property ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: property
    });
});
