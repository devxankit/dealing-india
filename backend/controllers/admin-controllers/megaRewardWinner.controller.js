import MegaRewardWinnerService from '../../services/megaRewardWinner.service.js';
import MegaRewardSettingsService from '../../services/megaRewardSettings.service.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Admin Mega Reward Winner Controller
 */

// Declare a new winner
export const declareWinner = asyncHandler(async (req, res) => {
    const adminId = req.user.adminId || req.user._id;
    let { megaRewardId, prizeRank, entryId, rangeIndex, type } = req.body;

    // If no megaRewardId, use active campaign
    if (!megaRewardId) {
        const activeSettings = await MegaRewardSettingsService.getActiveSettings();
        if (!activeSettings) {
            return res.status(400).json({
                success: false,
                message: 'No active Mega Reward campaign'
            });
        }
        megaRewardId = activeSettings._id;
    }

    let result;
    if (type === 'manual') {
        if (!entryId || !prizeRank) {
            return res.status(400).json({ success: false, message: 'Entry ID and Prize Rank are required for manual selection' });
        }
        result = await MegaRewardWinnerService.declareManualWinner(megaRewardId, entryId, prizeRank, adminId);
    } else if (type === 'range') {
        if (rangeIndex === undefined) {
            return res.status(400).json({ success: false, message: 'Range index is required' });
        }
        result = await MegaRewardWinnerService.declareRangeWinners(megaRewardId, rangeIndex, adminId);
    } else {
        if (!prizeRank) {
            return res.status(400).json({
                success: false,
                message: 'Prize rank is required'
            });
        }
        result = await MegaRewardWinnerService.declareWinner(megaRewardId, prizeRank, adminId);
    }

    res.status(201).json({
        success: true,
        message: `Winner(s) declared successfully!`,
        data: result
    });
});

// Get all winners for a campaign
export const getWinners = asyncHandler(async (req, res) => {
    let megaRewardId = req.query.megaRewardId;

    if (megaRewardId) {
        const winners = await MegaRewardWinnerService.getWinners(megaRewardId);
        return res.status(200).json({
            success: true,
            count: winners.length,
            data: winners
        });
    }

    // Get all winners across all campaigns
    const winners = await MegaRewardWinnerService.getAllWinners();

    res.status(200).json({
        success: true,
        count: winners.length,
        data: winners
    });
});

// Get winner selection status
export const getWinnerStatus = asyncHandler(async (req, res) => {
    let megaRewardId = req.query.megaRewardId;

    if (!megaRewardId) {
        const activeSettings = await MegaRewardSettingsService.getActiveSettings();
        if (!activeSettings) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }
        megaRewardId = activeSettings._id;
    }

    const status = await MegaRewardWinnerService.getWinnerStatus(megaRewardId);

    res.status(200).json({
        success: true,
        data: status
    });
});
