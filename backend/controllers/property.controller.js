import Property from '../models/Property.model.js';
import Vendor from '../models/Vendor.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import VendorPropertySubscription from '../models/VendorPropertySubscription.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { uploadBase64ToCloudinary, deleteFromCloudinary, isBase64DataUrl } from '../utils/cloudinary.util.js';

/**
 * Helper function to process media uploads to Cloudinary
 * @param {Array} mediaArray - Array of media objects with url field (base64 or existing URL)
 * @returns {Promise<Array>} - Array of processed media objects with Cloudinary URLs
 */
const processMediaUploads = async (mediaArray) => {
    if (!mediaArray || !Array.isArray(mediaArray) || mediaArray.length === 0) {
        return [];
    }

    const processedMedia = [];

    for (const mediaItem of mediaArray) {
        try {
            // If it's already a Cloudinary URL or other HTTP URL, keep it as is
            if (mediaItem.url && mediaItem.url.startsWith('http')) {
                processedMedia.push({
                    url: mediaItem.url,
                    publicId: mediaItem.publicId || null,
                    uploadedAt: mediaItem.uploadedAt || new Date()
                });
                continue;
            }

            // If it's base64 data, upload to Cloudinary
            if (mediaItem.url && isBase64DataUrl(mediaItem.url)) {
                const uploadResult = await uploadBase64ToCloudinary(
                    mediaItem.url,
                    'properties' // Folder name in Cloudinary
                );

                if (uploadResult && uploadResult.secure_url) {
                    processedMedia.push({
                        url: uploadResult.secure_url,
                        publicId: uploadResult.public_id,
                        uploadedAt: new Date()
                    });
                }
            }
        } catch (error) {
            console.error('[Property Media Upload Error]:', error.message);
            // Skip failed uploads but continue with others
        }
    }

    return processedMedia;
};

// @desc    Add new property
// @route   POST /api/property/add
// @access  Vendor
export const addProperty = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;

    // Get maxImages from subscription middleware (set based on business type)
    // Developer: 50 images, Broker: 5 images
    const maxImages = req.subscriptionLimits?.property?.maxImages || 50;

    const { media } = req.body;
    if (media && media.length > maxImages) {
        return res.status(400).json({
            success: false,
            message: `Image limit exceeded. Maximum ${maxImages} images allowed for your subscription.`
        });
    }

    // Process media uploads to Cloudinary
    let processedMedia = [];
    if (media && media.length > 0) {
        processedMedia = await processMediaUploads(media);

        if (processedMedia.length === 0 && media.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Failed to upload images. Please try again.'
            });
        }
    }

    const propertyData = {
        ...req.body,
        media: processedMedia,
        vendorId,
    };

    const property = await Property.create(propertyData);

    // Flatten specifications for frontend compatibility
    const responseData = property.toObject();
    if (Array.isArray(responseData.specifications) && responseData.specifications.length > 0) {
        responseData.specifications = responseData.specifications[0];
    }

    res.status(201).json({
        success: true,
        data: responseData,
    });
});

// @desc    Update property
// @route   PUT /api/property/update/:id
// @access  Vendor
export const updateProperty = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;
    const propertyId = req.params.id;

    let property = await Property.findById(propertyId);

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Security: Check ownership
    if (property.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    // Check limits again if media is being updated
    if (req.body.media) {
        // Get maxImages from subscription middleware (set based on business type)
        // Developer: 50 images, Broker: 5 images
        const maxImages = req.subscriptionLimits?.property?.maxImages || 50;

        if (req.body.media.length > maxImages) {
            return res.status(400).json({
                success: false,
                message: `Image limit exceeded. Maximum ${maxImages} images allowed for your subscription.`
            });
        }

        // Process media uploads to Cloudinary
        const processedMedia = await processMediaUploads(req.body.media);
        req.body.media = processedMedia;
    }

    property = await Property.findByIdAndUpdate(propertyId, req.body, {
        new: true,
        runValidators: true,
    }).lean();

    // Flatten specifications for frontend compatibility
    if (Array.isArray(property.specifications) && property.specifications.length > 0) {
        property.specifications = property.specifications[0];
    }

    res.status(200).json({
        success: true,
        data: property,
    });
});

// @desc    Delete property
// @route   DELETE /api/property/delete/:id
// @access  Vendor
export const deleteProperty = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId);

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Clean up Cloudinary images
    if (property.media && property.media.length > 0) {
        for (const mediaItem of property.media) {
            if (mediaItem.publicId) {
                try {
                    await deleteFromCloudinary(mediaItem.publicId);
                } catch (error) {
                    console.error('[Property Delete] Failed to delete image from Cloudinary:', error.message);
                    // Continue with deletion even if image cleanup fails
                }
            }
        }
    }

    await property.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Property removed successfully',
    });
});

// @desc    List vendor properties
// @route   GET /api/property/list
// @access  Vendor
export const listProperties = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;
    const properties = await Property.find({ vendorId }).lean();

    // Flatten specifications for frontend compatibility
    const formattedProperties = properties.map(prop => ({
        ...prop,
        specifications: Array.isArray(prop.specifications) && prop.specifications.length > 0
            ? prop.specifications[0]
            : prop.specifications
    }));

    res.status(200).json({
        success: true,
        data: formattedProperties,
    });
});

// @desc    Get single property details
// @route   GET /api/property/details/:id
// @access  Vendor
export const getPropertyById = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId).lean();

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Flatten specifications for frontend compatibility
    if (Array.isArray(property.specifications) && property.specifications.length > 0) {
        property.specifications = property.specifications[0];
    }

    res.status(200).json({
        success: true,
        data: property,
    });
});

// @desc    Get all properties (Public/Admin)
// @route   GET /api/public/property/all
// @access  Public
export const getAllProperties = asyncHandler(async (req, res) => {
    const { search, city, area, market, minPrice, maxPrice, minSize, maxSize, priceUnit, areaUnit, type, listingType, vendorId } = req.query;

    let query = { isActive: true };
    const queryConditions = [];

    if (vendorId) queryConditions.push({ vendorId });
    if (listingType && listingType !== 'All') queryConditions.push({ listingType });
    if (city && city !== 'All Cities') queryConditions.push({ 'location.city': { $regex: city, $options: 'i' } });
    if (area && area !== 'All Areas') queryConditions.push({ 'location.area': { $regex: area, $options: 'i' } });

    // Handle Search
    if (search) {
        queryConditions.push({
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { 'location.area': { $regex: search, $options: 'i' } },
                { propertyType: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        });
    }

    // Filter by Price Unit/Denomination - REMOVED for normalization support

    if (queryConditions.length > 0) {
        query.$and = queryConditions;
    }

    // Filter by Vendor Market and Type
    let vendorMatch = {};
    if (market && market !== 'All Markets') {
        vendorMatch['address.market'] = { $regex: market, $options: 'i' };
    }
    if (type === 'developer') {
        vendorMatch.businessType = { $regex: 'developer', $options: 'i' };
    } else if (type === 'broker') {
        vendorMatch.businessType = { $regex: 'broker', $options: 'i' };
    }

    let properties = await Property.find(query)
        .populate({
            path: 'vendorId',
            select: 'storeName address businessType phone storeLogo',
            match: Object.keys(vendorMatch).length > 0 ? vendorMatch : undefined
        })
        .lean();

    // Filter out properties where vendor didn't match the type
    let filteredResults = properties.filter(p => p.vendorId !== null);

    // Helpers for normalization
    const getPriceInLakhs = (amount, unit) => {
        const val = parseFloat(amount) || 0;
        const normalizedUnit = (unit || 'Lakh').trim();
        switch (normalizedUnit) {
            case 'Thousand': return val / 100;
            case 'Lakh': return val;
            case 'Crore': return val * 100;
            default: return val;
        }
    };

    const getAreaInSqFt = (area, unit) => {
        const val = parseFloat(String(area).replace(/[^0-9.]/g, '')) || 0;
        const normalizedUnit = (unit || 'Sq. Ft.').trim();
        switch (normalizedUnit) {
            case 'Sq. Ft.': return val;
            case 'Sq. Mt.': return val * 10.7639;
            case 'Sq. Yd.': return val * 9;
            case 'Acre': return val * 43560;
            case 'Gaj': return val * 9;
            default: return val;
        }
    };

    // Advanced Budget and Size Filtering in JS
    const hasPriceFilter = (minPrice && String(minPrice).trim() !== '') || (maxPrice && String(maxPrice).trim() !== '');
    const hasSizeFilter = (minSize && String(minSize).trim() !== '') || (maxSize && String(maxSize).trim() !== '');

    if (hasPriceFilter || hasSizeFilter) {
        // Price Filter Range (Local Scale to Lakhs)
        const filterPUnit = (priceUnit && priceUnit !== 'All') ? priceUnit : 'Lakh';
        const fMinP = minPrice ? parseFloat(minPrice) : 0;
        const fMaxP = maxPrice ? parseFloat(maxPrice) : Infinity;
        const normFilterMinP = getPriceInLakhs(fMinP, filterPUnit);
        const normFilterMaxP = getPriceInLakhs(fMaxP, filterPUnit);

        // Size Filter Range (Local Scale to Sq. Ft.)
        const filterAUnit = areaUnit || 'Sq. Ft.';
        const fMinS = minSize ? parseFloat(minSize) : 0;
        const fMaxS = maxSize ? parseFloat(maxSize) : Infinity;
        const normFilterMinS = getAreaInSqFt(fMinS, filterAUnit);
        const normFilterMaxS = getAreaInSqFt(fMaxS, filterAUnit);

        filteredResults = filteredResults.filter(p => {
            // 1. Price check
            if (hasPriceFilter) {
                let pMinInLakhs = 0;
                let pMaxInLakhs = 0;

                if (p.listingType === 'Sale' && p.saleDetails) {
                    pMinInLakhs = getPriceInLakhs(p.saleDetails.priceMin, p.saleDetails.priceUnit);
                    pMaxInLakhs = getPriceInLakhs(p.saleDetails.priceMax || p.saleDetails.priceMin, p.saleDetails.priceUnit);
                } else if (p.listingType === 'Rent' && p.rentDetails) {
                    pMinInLakhs = getPriceInLakhs(p.rentDetails.monthlyRent, p.rentDetails.rentUnit || 'Thousand');
                    pMaxInLakhs = pMinInLakhs;
                } else if (p.listingType === 'Lease' && p.leaseDetails) {
                    pMinInLakhs = getPriceInLakhs(p.leaseDetails.monthlyLeaseRate, p.leaseDetails.leaseUnit);
                    pMaxInLakhs = pMinInLakhs;
                } else {
                    pMinInLakhs = (p.price?.amount || 0) / 100000;
                    pMaxInLakhs = pMinInLakhs;
                }

                const matchesPrice = (pMinInLakhs <= normFilterMaxP && pMaxInLakhs >= normFilterMinP);
                if (!matchesPrice) return false;
            }

            // 2. Size check
            if (hasSizeFilter) {
                const specs = Array.isArray(p.specifications) && p.specifications.length > 0
                    ? p.specifications[0]
                    : (p.specifications || {});

                const areaVal = specs.builtUpArea || p.totalArea || 0;
                const propAreaInSqFt = getAreaInSqFt(areaVal, specs.builtUpAreaUnit);

                const matchesSize = (propAreaInSqFt >= normFilterMinS && propAreaInSqFt <= normFilterMaxS);
                if (!matchesSize) return false;
            }

            return true;
        });
    }

    // Flatten specifications for frontend compatibility
    const finalProperties = filteredResults.map(prop => ({
        ...prop,
        specifications: Array.isArray(prop.specifications) && prop.specifications.length > 0
            ? prop.specifications[0]
            : prop.specifications
    }));

    res.status(200).json({
        success: true,
        count: finalProperties.length,
        data: finalProperties
    });
});

// @desc    Get single property details (Public)
// @route   GET /api/property/public/details/:id
// @access  Public
export const getPublicPropertyById = asyncHandler(async (req, res) => {
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId).populate('vendorId', 'storeName address businessType phone storeLogo storeDescription').lean();

    if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Flatten specifications for frontend compatibility
    if (Array.isArray(property.specifications) && property.specifications.length > 0) {
        property.specifications = property.specifications[0];
    }

    res.status(200).json({
        success: true,
        data: property,
    });
});
