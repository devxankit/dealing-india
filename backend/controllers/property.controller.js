import Property from '../models/Property.model.js';
import Vendor from '../models/Vendor.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import VendorPropertySubscription from '../models/VendorPropertySubscription.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

// @desc    Add new property
// @route   POST /api/property/add
// @access  Vendor
export const addProperty = asyncHandler(async (req, res) => {
    const vendorId = req.userDoc._id;

    // Get vendor's business type settings to check limits
    const vendor = await Vendor.findById(vendorId).populate('businessTypeRef');
    if (!vendor || !vendor.businessTypeRef) {
        return res.status(400).json({ success: false, message: 'Vendor business type not configured' });
    }

    const settings = await BusinessTypeSettings.findOne({ businessTypeId: vendor.businessTypeRef._id });
    const propertySub = await VendorPropertySubscription.findOne({ vendorId });

    const maxImages = propertySub?.maxImagesPerProperty || settings?.maxImagesPerProperty || 5;

    const { media } = req.body;
    if (media && media.length > maxImages) {
        return res.status(400).json({
            success: false,
            message: `Image limit exceeded. Maximum ${maxImages} images allowed for your business type.`
        });
    }

    const propertyData = {
        ...req.body,
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
        const vendor = await Vendor.findById(vendorId).populate('businessTypeRef');
        const settings = await BusinessTypeSettings.findOne({ businessTypeId: vendor.businessTypeRef._id });
        const propertySub = await VendorPropertySubscription.findOne({ vendorId });
        const maxImages = propertySub?.maxImagesPerProperty || settings?.maxImagesPerProperty || 5;

        if (req.body.media.length > maxImages) {
            return res.status(400).json({
                success: false,
                message: `Image limit exceeded. Maximum ${maxImages} images allowed.`
            });
        }
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
    const properties = await Property.find({ vendorId });

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

    const property = await Property.findById(propertyId);

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
// @route   GET /api/public/property/list
// @access  Public
export const getAllProperties = asyncHandler(async (req, res) => {
    const properties = await Property.find({ isActive: true }).populate('vendorId', 'storeName address');
    res.status(200).json({
        success: true,
        data: properties
    });
});
