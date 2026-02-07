import BusinessType from '../models/BusinessType.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

// @desc    Get all active business types
// @route   GET /api/business-types
// @access  Public
export const getActiveBusinessTypes = asyncHandler(async (req, res) => {
    const businessTypes = await BusinessType.find({ isActive: true });
    res.status(200).json({
        success: true,
        data: businessTypes,
    });
});

// @desc    Admin: Create business type
// @route   POST /api/admin/business-types
// @access  Admin
export const createBusinessType = asyncHandler(async (req, res) => {
    const { name, slug, description } = req.body;

    const businessType = await BusinessType.create({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
    });

    // Create default settings for this business type
    await BusinessTypeSettings.create({
        businessTypeId: businessType._id,
        enabledModules: ['subscription', 'profile', 'settings'], // Minimal defaults
    });

    res.status(201).json({
        success: true,
        data: businessType,
    });
});

// @desc    Admin: Update business type
// @route   PUT /api/admin/business-types/:id
// @access  Admin
export const updateBusinessType = asyncHandler(async (req, res) => {
    const businessType = await BusinessType.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
    }

    res.status(200).json({
        success: true,
        data: businessType,
    });
});
