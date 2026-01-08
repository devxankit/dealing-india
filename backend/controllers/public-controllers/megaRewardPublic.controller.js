import MegaRewardShareService from '../../services/megaRewardShare.service.js';
import PromotionalReel from '../../models/PromotionalReel.model.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Public Mega Reward Controller
 * Handles share link click tracking (no auth required)
 */

// Track click and redirect
export const trackClick = asyncHandler(async (req, res) => {
    const { linkCode } = req.params;

    // Get client IP (handle proxies)
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || req.ip
        || 'unknown';

    // Get fingerprint from header or generate from user agent
    const fingerprint = req.headers['x-fingerprint']
        || req.query.fp
        || Buffer.from(req.headers['user-agent'] || 'unknown').toString('base64').slice(0, 20);

    const userAgent = req.headers['user-agent'] || '';

    try {
        // Track the click
        const result = await MegaRewardShareService.trackClick(
            linkCode,
            ipAddress,
            fingerprint,
            userAgent
        );

        // Get the share link to find the reel
        const shareLink = await MegaRewardShareService.getShareLinkByCode(linkCode);

        if (!shareLink || !shareLink.reelId) {
            return res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
        }

        // Redirect to the reel/app
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/app/reels?type=promotional&reel=${shareLink.reelId._id}&source=${shareLink.platform}`;

        res.redirect(302, redirectUrl);
    } catch (error) {
        console.error('Click tracking error:', error.message);

        // Still redirect even if tracking fails
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(302, `${frontendUrl}/app/mega-reward`);
    }
});

// Get link info (public, for preview)
export const getLinkInfo = asyncHandler(async (req, res) => {
    const { linkCode } = req.params;

    const shareLink = await MegaRewardShareService.getShareLinkByCode(linkCode);

    if (!shareLink) {
        return res.status(404).json({
            success: false,
            message: 'Share link not found'
        });
    }

    res.status(200).json({
        success: true,
        data: {
            platform: shareLink.platform,
            reel: shareLink.reelId ? {
                title: shareLink.reelId.title,
                thumbnail: shareLink.reelId.thumbnail
            } : null,
            sharedBy: shareLink.userId?.name || 'A friend'
        }
    });
});
