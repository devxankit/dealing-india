import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import BusinessType from '../models/BusinessType.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

// @desc    Admin: Get all business settings
// @route   GET /api/admin/business-settings
// @access  Admin
export const getAllBusinessSettings = asyncHandler(async (req, res) => {
    const settings = await BusinessTypeSettings.find().populate('businessTypeId');
    res.status(200).json({
        success: true,
        data: settings,
    });
});

// @desc    Admin: Update business settings
// @route   PUT /api/admin/business-settings/update/:id
// @access  Admin
export const updateBusinessSettings = asyncHandler(async (req, res) => {
    const { enabledModules, maxImagesPerProperty, features, isActive } = req.body;

    let settings = await BusinessTypeSettings.findById(req.params.id);

    if (!settings) {
        return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    settings.enabledModules = enabledModules || settings.enabledModules;
    settings.maxImagesPerProperty = maxImagesPerProperty !== undefined ? maxImagesPerProperty : settings.maxImagesPerProperty;
    settings.features = features || settings.features;
    settings.isActive = isActive !== undefined ? isActive : settings.isActive;

    await settings.save();

    res.status(200).json({
        success: true,
        data: settings,
    });
});

// @desc    Admin: Get settings by Business Type Slug
// @route   GET /api/admin/business-settings/:slug
// @access  Admin/Vendor
export const getSettingsBySlug = asyncHandler(async (req, res) => {
    const businessType = await BusinessType.findOne({ slug: req.params.slug });
    if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
    }

    const settings = await BusinessTypeSettings.findOne({ businessTypeId: businessType._id });

    res.status(200).json({
        success: true,
        data: settings,
        businessType
    });
});
