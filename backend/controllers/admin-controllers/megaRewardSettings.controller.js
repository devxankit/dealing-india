import MegaRewardSettingsService from '../../services/megaRewardSettings.service.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import redisService from '../../services/redis.service.js';

/**
 * Helper to clear mega reward cache
 */
const clearMegaRewardCache = async () => {
    try {
        await Promise.all([
            redisService.clearPattern('public:mega-reward:*'),
            redisService.clearPattern('user:mega-reward:*'),
            redisService.clearPattern('admin:mega-reward:*')
        ]);
    } catch (error) {
        console.error('Error clearing mega reward cache:', error);
    }
};

/**
 * Admin Mega Reward Settings Controller
 */

// Create new campaign settings
export const createSettings = asyncHandler(async (req, res) => {
    const adminId = req.user.adminId || req.user._id;
    const settings = await MegaRewardSettingsService.createSettings(req.body, adminId);

    await clearMegaRewardCache();

    res.status(201).json({
        success: true,
        message: 'Mega Reward campaign created successfully',
        data: settings
    });
});

// Update campaign settings
export const updateSettings = asyncHandler(async (req, res) => {
    const settings = await MegaRewardSettingsService.updateSettings(req.params.id, req.body);

    await clearMegaRewardCache();

    res.status(200).json({
        success: true,
        message: 'Mega Reward campaign updated successfully',
        data: settings
    });
});

// Get all campaigns
export const getAllSettings = asyncHandler(async (req, res) => {
    const settings = await MegaRewardSettingsService.getAllSettings();

    res.status(200).json({
        success: true,
        count: settings.length,
        data: settings
    });
});

// Get active campaign
export const getActiveSettings = asyncHandler(async (req, res) => {
    const settings = await MegaRewardSettingsService.getActiveSettings();

    res.status(200).json({
        success: true,
        data: settings
    });
});

// Get single campaign by ID
export const getSettingsById = asyncHandler(async (req, res) => {
    const settings = await MegaRewardSettingsService.getSettingsById(req.params.id);

    if (!settings) {
        return res.status(404).json({
            success: false,
            message: 'Mega Reward campaign not found'
        });
    }

    res.status(200).json({
        success: true,
        data: settings
    });
});

// Delete campaign
export const deleteSettings = asyncHandler(async (req, res) => {
    await MegaRewardSettingsService.deleteSettings(req.params.id);

    await clearMegaRewardCache();

    res.status(200).json({
        success: true,
        message: 'Mega Reward campaign deleted successfully'
    });
});
