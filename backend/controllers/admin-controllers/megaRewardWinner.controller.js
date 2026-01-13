import MegaRewardWinnerService from '../../services/megaRewardWinner.service.js';
import MegaRewardSettingsService from '../../services/megaRewardSettings.service.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Admin Mega Reward Winner Controller
 */

// Declare a new winner
export const declareWinner = asyncHandler(async (req, res) => {
    const adminId = req.user.adminId || req.user._id || req.user.userId;
    let { megaRewardId, prizeRank, entryId, rangeIndex, type } = req.body;

    if (!adminId) {
        return res.status(401).json({
            success: false,
            message: 'Admin ID not found in session'
        });
    }

    // If no megaRewardId, use active campaign or the most recent one
    if (!megaRewardId) {
        let activeSettings = await MegaRewardSettingsService.getActiveSettings();
        if (!activeSettings) {
            // If no active campaign, get the most recent one (even if inactive)
            const allSettings = await MegaRewardSettingsService.getAllSettings();
            if (allSettings && allSettings.length > 0) {
                activeSettings = allSettings[0];
            }
        }

        if (!activeSettings) {
            return res.status(400).json({
                success: false,
                message: 'No Mega Reward campaign found'
            });
        }
        megaRewardId = activeSettings._id;
    }

    try {
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
    } catch (error) {
        console.error('❌ Declare Winner error detail:', error);
        res.status(error.status || 500).json({
            success: false,
            message: error.message || 'Internal Server Error during winner declaration'
        });
    }
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
        let activeSettings = await MegaRewardSettingsService.getActiveSettings();
        if (!activeSettings) {
            // If no active campaign, get the most recent one (even if inactive)
            const allSettings = await MegaRewardSettingsService.getAllSettings();
            if (allSettings && allSettings.length > 0) {
                activeSettings = allSettings[0];
            }
        }

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
