import MegaRewardShareService from '../../services/megaRewardShare.service.js';
import PromotionalReel from '../../models/PromotionalReel.model.js';
import MegaRewardShareLink from '../../models/MegaRewardShareLink.model.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Public Mega Reward Controller
 * Handles share link click tracking (no auth required)
 */

// Track click and redirect with Open Graph support
export const trackClick = asyncHandler(async (req, res) => {
    const { linkCode } = req.params;
    const userAgent = req.headers['user-agent'] || '';

    // Advanced Bot Detection
    const bots = ['googlebot', 'facebookexternalhit', 'twitterbot', 'whatsapp', 'linkedinbot', 'bingbot'];
    const isMobileBrowser = /Mobi|Android|iPhone|iPad/i.test(userAgent);
    const isBot = !isMobileBrowser && bots.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));

    try {
        // 1. Get metadata for OG tags
        const shareLink = await MegaRewardShareLink.findOne({
            linkCode: { $regex: new RegExp(`^${linkCode}$`, 'i') }
        }).populate('reelId');

        // 2. Determine base URLs
        let frontendUrl = process.env.FRONTEND_URL;
        const requestHost = req.get('host') || '';
        const requestOrigin = req.get('origin') || req.get('referer') || '';

        if (!frontendUrl) {
            if (requestHost.includes('dealingindia') || requestHost.includes('onrender')) {
                frontendUrl = 'https://www.dealingindia.com';
            } else if (requestOrigin.includes(':3000')) {
                frontendUrl = 'http://localhost:3000';
            } else {
                frontendUrl = 'http://localhost:5173';
            }
        }

        let redirectUrl = `${frontendUrl}/app/reels`;
        let ogTitle = 'Mega Reward';
        let ogDescription = 'Check out this amazing reel and win prizes!';
        let ogImage = '';
        let platform = 'share';

        if (shareLink) {
            platform = shareLink.platform || 'share';
            if (shareLink.reelId) {
                const reelId = shareLink.reelId._id || shareLink.reelId;
                redirectUrl = `${frontendUrl}/app/reels/${reelId}?source=${platform}`;
                ogTitle = shareLink.reelId.title || 'Mega Reward Reel';
                ogDescription = shareLink.reelId.description || 'Watch and share to win huge rewards!';
                ogImage = shareLink.reelId.thumbnail || '';
            }
        }

        const metaTags = `
            <meta property="og:type" content="website">
            <meta property="og:url" content="${req.protocol}://${requestHost}${req.originalUrl}">
            <meta property="og:title" content="${ogTitle}">
            <meta property="og:description" content="${ogDescription}">
            ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
            <meta property="twitter:card" content="summary_large_image">
            <meta property="twitter:title" content="${ogTitle}">
            <meta property="twitter:description" content="${ogDescription}">
            ${ogImage ? `<meta property="twitter:image" content="${ogImage}">` : ''}
        `;

        // Bot Response
        if (isBot) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                    <head>${metaTags}<meta http-equiv="refresh" content="0;url=${redirectUrl}"></head>
                    <body>Redirecting to Dealing India...</body>
                </html>
            `);
        }

        // Real User Response
        const apiHost = `${req.protocol}://${requestHost}`;
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${metaTags}
                <title>Redirecting...</title>
                <style>
                    body { font-family: -apple-system, system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb; color: #1f2937; }
                    .loader { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 24px; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    h1 { font-size: 1.25rem; margin-bottom: 8px; }
                    p { font-size: 0.875rem; color: #6b7280; }
                    .btn { margin-top: 32px; padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 0.875rem; cursor: pointer; }
                </style>
            </head>
            <body>
                <div class="loader"></div>
                <h1>Opening Reel...</h1>
                <p id="status">Verifying your unique click...</p>
                <a href="${redirectUrl}" class="btn" id="skipBtn">Click here if not redirected</a>

                <script>
                    const linkCode = "${linkCode}";
                    const redirectUrl = "${redirectUrl}";
                    const apiHost = "${apiHost}";
                    
                    async function track() {
                        try {
                            const viewerUserId = (function() {
                                try {
                                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                                    if (!token) return null;
                                    return JSON.parse(atob(token.split('.')[1])).userId;
                                } catch(e) { return null; }
                            })();

                            await fetch(apiHost + '/api/mega-reward/track-log/' + encodeURIComponent(linkCode), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ viewerUserId }),
                                keepalive: true
                            });
                        } catch (err) {
                            console.error('[MegaReward] Tracking error:', err);
                        } finally {
                            setTimeout(() => { window.location.href = redirectUrl; }, 300);
                        }
                    }
                    
                    document.getElementById('skipBtn').onclick = () => { window.location.href = redirectUrl; };
                    track();
                    setTimeout(() => { if(window.location.href !== redirectUrl) window.location.href = redirectUrl; }, 3000);
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('[MegaReward] Controller Error:', error);
        const fbUrl = process.env.FRONTEND_URL || 'https://www.dealingindia.com';
        res.redirect(`${fbUrl}/app/reels`);
    }
});

// Record the actual click (POST handler called by JS)
export const recordClick = asyncHandler(async (req, res) => {
    const { linkCode } = req.params;
    const { viewerUserId } = req.body;

    console.info(`[MegaRewardController] recordClick: code=${linkCode}, viewer=${viewerUserId || 'Guest'}`);

    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || req.ip
        || 'unknown';

    let fingerprint = null;
    if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split('=');
            if (name === 'mr_fp') acc[name] = value;
            return acc;
        }, {});
        fingerprint = cookies['mr_fp'];
    }

    if (!fingerprint) {
        fingerprint = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        res.cookie('mr_fp', fingerprint, {
            maxAge: 365 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: true,
            sameSite: 'none' // Better for in-app browser POSTs
        });
    }

    const userAgent = req.headers['user-agent'] || '';

    try {
        const result = await MegaRewardShareService.trackClick(
            linkCode,
            ipAddress,
            fingerprint,
            userAgent,
            viewerUserId
        );

        res.status(200).json(result);
    } catch (error) {
        console.error(`[MegaRewardController] Tracking failed for ${linkCode}:`, error.message);
        res.status(500).json({
            success: false,
            message: error.message,
            error: true
        });
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
