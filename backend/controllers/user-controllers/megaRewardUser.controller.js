import MegaRewardSettingsService from '../../services/megaRewardSettings.service.js';
import MegaRewardShareService from '../../services/megaRewardShare.service.js';
import MegaRewardEntryService from '../../services/megaRewardEntry.service.js';
import PromotionalReel from '../../models/PromotionalReel.model.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * User Mega Reward Controller
 */

// Get active running campaign details for user
export const getActiveCampaign = asyncHandler(async (req, res) => {
    const settings = await MegaRewardSettingsService.getRunningSettings();

    if (!settings) {
        return res.status(200).json({
            success: true,
            data: null,
            message: 'No active campaign'
        });
    }

    // Get associated promotional reels
    const reels = await PromotionalReel.find({
        megaRewardId: settings._id,
        isActive: true
    }).select('title description videoUrl thumbnail likes comments shares');

    res.status(200).json({
        success: true,
        data: {
            campaign: settings,
            reels
        }
    });
});

// Get user's participation status
export const getMyStatus = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id;

    // Get active running campaign
    const settings = await MegaRewardSettingsService.getRunningSettings();

    if (!settings) {
        return res.status(200).json({
            success: true,
            data: {
                hasActiveCampaign: false
            }
        });
    }

    // Get user's entry if exists
    const entry = await MegaRewardEntryService.getUserEntry(userId);

    // Get promotional reels linked to this campaign
    const reels = await PromotionalReel.find({
        megaRewardId: settings._id,
        isActive: true
    }).select('_id title likes comments shares');

    // Get eligibility status for the first reel (main tracking)
    let eligibility = null;
    if (reels.length > 0) {
        eligibility = await MegaRewardShareService.checkEligibility(userId, reels[0]._id);
    }

    res.status(200).json({
        success: true,
        data: {
            hasActiveCampaign: true,
            campaign: {
                prizeTitle: settings.prizeTitle,
                prizes: settings.prizes,
                customRanges: settings.customRanges,
                endDate: settings.endDate
            },
            entry: entry ? {
                ticketId: entry.ticketId,
                status: entry.status,
                generatedAt: entry.generatedAt
            } : null,
            eligibility,
            reels
        }
    });
});

// Generate share link for a platform
export const generateShareLink = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    const { reelId, platform } = req.body;

    if (!reelId || !platform) {
        return res.status(400).json({
            success: false,
            message: 'Reel ID and platform are required'
        });
    }

    if (!['whatsapp', 'instagram', 'facebook'].includes(platform)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid platform. Must be whatsapp, instagram, or facebook'
        });
    }

    const shareLink = await MegaRewardShareService.generateShareLink(userId, reelId, platform);

    // Construct the full share URL
    // Use dynamic host if BACKEND_URL is not set (better for local network testing)
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${backendUrl}/api/mega-reward/r/${shareLink.linkCode}`;

    res.status(200).json({
        success: true,
        data: {
            linkCode: shareLink.linkCode,
            shareUrl,
            platform,
            uniqueClickCount: shareLink.uniqueClickCount,
            isEligible: shareLink.isEligible
        }
    });
});

// Get user's current entry
export const getMyEntry = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    const entry = await MegaRewardEntryService.getUserEntry(userId);

    res.status(200).json({
        success: true,
        data: entry
    });
});

// Try to generate ticket if eligible
export const tryGenerateTicket = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    const { reelId } = req.body;

    if (!reelId) {
        return res.status(400).json({
            success: false,
            message: 'Reel ID is required'
        });
    }

    try {
        const result = await MegaRewardEntryService.generateTicket(userId, reelId);

        res.status(result.isNew ? 201 : 200).json({
            success: true,
            message: result.isNew ? 'Ticket generated successfully!' : 'You already have a ticket',
            data: result.entry
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
