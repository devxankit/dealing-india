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

    res.status(201).json({
        success: true,
        data: property,
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
    });

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

    res.status(200).json({
        success: true,
        data: properties,
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

    if (vendorId) {
        query.vendorId = vendorId;
    }

    if (listingType && listingType !== 'All') {
        query.listingType = listingType;
    }

    if (city && city !== 'All Cities') {
        query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (area) {
        query['location.area'] = { $regex: area, $options: 'i' };
    }

    // Filter by Price Unit/Denomination
    if (priceUnit && priceUnit !== 'All') {
        query.$or = [
            { 'saleDetails.priceUnit': priceUnit },
            { 'rentDetails.rentUnit': priceUnit },
            { 'leaseDetails.leaseUnit': priceUnit }
        ];
    }

    // Filter by Vendor Market (from vendor address.market)
    let vendorMatch = {};
    if (market && market !== 'All Markets') {
        vendorMatch['address.market'] = { $regex: market, $options: 'i' };
    }

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { 'location.area': { $regex: search, $options: 'i' } },
            { propertyType: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    // Price filtering - checking both direct price and range-based prices
    if (minPrice || maxPrice) {
        // Front-end sends prices in Lakhs
        const minLakh = minPrice ? parseFloat(minPrice) : 0;
        const maxLakh = maxPrice ? parseFloat(maxPrice) : Infinity;

        const min = minLakh * 100000;
        const max = maxLakh * 100000;

        const priceFilter = [
            // Case 1: Direct amount
            { 'price.amount': { $gte: min, $lte: max } },
            // Case 2: Sale price range
            { 'saleDetails.priceMin': { $lte: maxLakh }, 'saleDetails.priceMax': { $gte: minLakh } },
            // Case 3: Monthly rent
            { 'rentDetails.monthlyRent': { $gte: minPrice || 0, $lte: maxPrice || Infinity } }
        ];

        if (query.$or) {
            query.$and = [{ $or: query.$or }, { $or: priceFilter }];
            delete query.$or;
        } else {
            query.$or = priceFilter;
        }
    }

    // Size filtering
    if (minSize || maxSize) {
        const minS = minSize ? parseFloat(minSize) : 0;
        const maxS = maxSize ? parseFloat(maxSize) : Infinity;

        // Mongo can't easily convert string to number in $match without $expr (which is slow)
        // Since builtUpArea is String, we'll handle this in the JS filter layer for now
        // or we could use regex/lexicographical if they were padded, but they aren't.
        // Let's add it to the final filtering stage.
    }

    // Filter by Vendor Business Type (Developer vs Broker)
    if (type === 'developer') {
        vendorMatch.businessType = { $regex: 'developer', $options: 'i' };
    } else if (type === 'broker') {
        vendorMatch.businessType = { $regex: 'broker', $options: 'i' };
    }

    const properties = await Property.find(query)
        .populate({
            path: 'vendorId',
            select: 'storeName address businessType phone storeLogo',
            match: Object.keys(vendorMatch).length > 0 ? vendorMatch : undefined
        })
        .lean();

    // Filter out properties where vendor didn't match the type
    let filteredProperties = properties.filter(p => p.vendorId !== null);

    // Size filtering (Built-up Area)
    if (minSize || maxSize) {
        // Normalize filter range to Sq. Ft. if an areaUnit is provided
        const filterUnit = areaUnit || 'Sq. Ft.';
        const filterConversion = {
            'Sq. Ft.': 1,
            'Sq. Mt.': 10.7639,
            'Sq. Yd.': 9,
            'Acre': 43560,
            'Gaj': 9
        };
        const filterMultiplier = filterConversion[filterUnit] || 1;
        const normalizedMinS = minS * filterMultiplier;
        const normalizedMaxS = maxS * filterMultiplier;

        filteredProperties = filteredProperties.filter(p => {
            const areaStr = p.specifications?.builtUpArea || p.totalArea || '0';
            const propertyUnit = p.specifications?.builtUpAreaUnit || 'Sq. Ft.';
            let areaNum = parseFloat(areaStr.replace(/[^0-9.]/g, ''));

            // Normalize property area to Sq. Ft.
            const propertyMultiplier = filterConversion[propertyUnit] || 1;
            const areaInSqFt = areaNum * propertyMultiplier;

            return areaInSqFt >= normalizedMinS && areaInSqFt <= normalizedMaxS;
        });
    }

    res.status(200).json({
        success: true,
        count: filteredProperties.length,
        data: filteredProperties
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

    res.status(200).json({
        success: true,
        data: property,
    });
});
