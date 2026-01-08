import MegaRewardWinnerService from '../../services/megaRewardWinner.service.js';
import MegaRewardSettingsService from '../../services/megaRewardSettings.service.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Admin Mega Reward Winner Controller
 */

// Declare a new winner
export const declareWinner = asyncHandler(async (req, res) => {
    const adminId = req.user.adminId || req.user._id;
    let { megaRewardId, prizeRank } = req.body;

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

    if (!prizeRank) {
        return res.status(400).json({
            success: false,
            message: 'Prize rank is required'
        });
    }

    const winner = await MegaRewardWinnerService.declareWinner(megaRewardId, prizeRank, adminId);

    res.status(201).json({
        success: true,
        message: `${prizeRank} winner declared successfully!`,
        data: winner
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
