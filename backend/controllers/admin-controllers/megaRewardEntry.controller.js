import MegaRewardEntryService from '../../services/megaRewardEntry.service.js';
import MegaRewardSettingsService from '../../services/megaRewardSettings.service.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Admin Mega Reward Entry Controller
 */

// Get all entries for active or specified campaign
export const getEntries = asyncHandler(async (req, res) => {
    let megaRewardId = req.query.megaRewardId;

    // If no ID provided, use active campaign
    if (!megaRewardId) {
        const activeSettings = await MegaRewardSettingsService.getActiveSettings();
        if (!activeSettings) {
            return res.status(200).json({
                success: true,
                data: { entries: [], pagination: { total: 0 } }
            });
        }
        megaRewardId = activeSettings._id;
    }

    const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search || '',
        status: req.query.status || ''
    };

    const result = await MegaRewardEntryService.getEntriesForAdmin(megaRewardId, options);

    res.status(200).json({
        success: true,
        data: result
    });
});

// Get entry statistics
export const getEntryStats = asyncHandler(async (req, res) => {
    let megaRewardId = req.query.megaRewardId;

    if (!megaRewardId) {
        const activeSettings = await MegaRewardSettingsService.getActiveSettings();
        if (!activeSettings) {
            return res.status(200).json({
                success: true,
                data: { total: 0, active: 0, winners: 0 }
            });
        }
        megaRewardId = activeSettings._id;
    }

    const stats = await MegaRewardEntryService.getEntryStats(megaRewardId);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Get single entry details
export const getEntryById = asyncHandler(async (req, res) => {
    const entry = await MegaRewardEntryService.getEntryById(req.params.id);

    if (!entry) {
        return res.status(404).json({
            success: false,
            message: 'Entry not found'
        });
    }

    res.status(200).json({
        success: true,
        data: entry
    });
});
