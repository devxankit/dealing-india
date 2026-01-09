import MegaRewardShareService from '../../services/megaRewardShare.service.js';
import PromotionalReel from '../../models/PromotionalReel.model.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Public Mega Reward Controller
 * Handles share link click tracking (no auth required)
 */

// Track click and redirect
// Track click and redirect with Open Graph support
export const trackClick = asyncHandler(async (req, res) => {
    const { linkCode } = req.params;

    // Get client IP
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || req.ip
        || 'unknown';

    // Cookie-based Fingerprinting (Robust against same-IP networks like WiFi)
    let fingerprint = null;

    // 1. Try to read existing fingerprint from cookie
    if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split('=');
            acc[name] = value;
            return acc;
        }, {});
        fingerprint = cookies['mr_fp'];
    }

    // 2. If no cookie, generate a new persistent fingerprint
    if (!fingerprint) {
        const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        fingerprint = `fp_${Date.now()}_${randomPart}`;

        // Set long-lived cookie (1 year)
        res.cookie('mr_fp', fingerprint, {
            maxAge: 365 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
    }

    const userAgent = req.headers['user-agent'] || '';

    try {
        // Track the click (using the cookie fingerprint)
        await MegaRewardShareService.trackClick(
            linkCode,
            ipAddress,
            fingerprint,
            userAgent
        );

        // Get the share link details to find the reel
        const shareLink = await MegaRewardShareService.getShareLinkByCode(linkCode);

        // Determine Redirect URL
        // Priority: Env Var > Request Host (if not local) > Production Default
        let frontendUrl = process.env.FRONTEND_URL;

        if (!frontendUrl) {
            const host = req.get('host') || '';
            if (host.includes('dealingindia') || host.includes('onrender')) {
                // If backend is on production-like host, use production frontend
                frontendUrl = 'https://www.dealingindia.com';
            } else {
                // Local development fallback
                frontendUrl = 'http://localhost:5173';
            }
        }

        let redirectUrl = `${frontendUrl}/app/reels`; // Default fallback

        let ogTitle = 'Mega Reward';
        let ogDescription = 'Check out this amazing reel and win prizes!';
        let ogImage = '';

        if (shareLink && shareLink.reelId) {
            // Redirect to the dedicated single reel page
            redirectUrl = `${frontendUrl}/app/reels/${shareLink.reelId._id}?source=${shareLink.platform || 'share'}`;
            ogTitle = shareLink.reelId.title || 'Mega Reward Reel';
            ogDescription = shareLink.reelId.description || 'Watch and share to win huge rewards!';
            ogImage = shareLink.reelId.thumbnail || '';
        }

        // Return HTML with Open Graph tags + JS Redirect
        // This ensures social platforms can scrape metadata for the "Link Form" (Preview Card)
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${ogTitle}</title>
                
                <!-- Open Graph / Facebook / WhatsApp -->
                <meta property="og:type" content="website">
                <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">
                <meta property="og:title" content="${ogTitle}">
                <meta property="og:description" content="${ogDescription}">
                ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}

                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:title" content="${ogTitle}">
                <meta property="twitter:description" content="${ogDescription}">
                ${ogImage ? `<meta property="twitter:image" content="${ogImage}">` : ''}

                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #000; color: #fff; }
                    .loader { border: 3px solid #333; border-top: 3px solid #7c3aed; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .content { text-align: center; }
                </style>
                
                <script>
                    window.location.href = "${redirectUrl}";
                </script>
            </head>
            <body>
                <div class="content">
                    <div class="loader" style="margin: 0 auto 20px auto;"></div>
                    <p>Opening Reel...</p>
                    <a href="${redirectUrl}" style="color: #7c3aed; text-decoration: none; font-size: 14px;">Click here if not redirected</a>
                </div>
            </body>
            </html>
        `;

        res.send(html);

    } catch (error) {
        console.error('Click tracking/redirect error:', error.message);
        // Fallback hard redirect
        const frontendUrl = process.env.FRONTEND_URL || 'https://www.dealingindia.com';
        res.redirect(302, `${frontendUrl}/app/reels`);
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
