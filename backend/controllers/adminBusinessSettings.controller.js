import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import BusinessType from '../models/BusinessType.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

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
    const {
        enabledModules,
        features,
        isActive,
        dashboardWidgets,
        allowedPlans
    } = req.body;

    let settings = await BusinessTypeSettings.findById(req.params.id);

    if (!settings) {
        return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    settings.enabledModules = enabledModules || settings.enabledModules;

    settings.features = features || settings.features;
    settings.dashboardWidgets = dashboardWidgets !== undefined ? dashboardWidgets : settings.dashboardWidgets;
    settings.allowedPlans = allowedPlans !== undefined ? allowedPlans : settings.allowedPlans;
    settings.isActive = isActive !== undefined ? isActive : settings.isActive;

    await settings.save();

    // Also update BusinessType if needed (name, description, subTypes)
    if (req.body.businessTypeId && typeof req.body.businessTypeId === 'object') {
        const btUpdates = {};
        if (req.body.businessTypeId.name) btUpdates.name = req.body.businessTypeId.name;
        if (req.body.businessTypeId.description) btUpdates.description = req.body.businessTypeId.description;
        if (req.body.businessTypeId.subTypes) btUpdates.subTypes = req.body.businessTypeId.subTypes;

        if (Object.keys(btUpdates).length > 0) {
            await BusinessType.findByIdAndUpdate(settings.businessTypeId, btUpdates);
        }
    }

    // Clear plan cache so vendors see updated plan availability
    try {
        await redisService.clearPattern('public:b2b-plans:*');
    } catch (cacheError) {
        console.error('Error clearing cache in updateBusinessSettings:', cacheError);
    }

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
