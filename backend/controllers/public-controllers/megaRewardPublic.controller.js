import MegaRewardShareService from '../../services/megaRewardShare.service.js';
import PromotionalReel from '../../models/PromotionalReel.model.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Public Mega Reward Controller
 * Handles share link click tracking (no auth required)
 */

// Track click and redirect with Open Graph support
export const trackClick = asyncHandler(async (req, res) => {
    const { linkCode } = req.params;

    // Determine Client Info
    const userAgent = req.headers['user-agent'] || '';

    // Advanced Bot Detection (More lenient for testing)
    const bots = [
        'WhatsApp', 'facebookexternalhit', 'Facebot', 'Twitterbot',
        'TelegramBot', 'Discordbot', 'Slackbot', 'Googlebot', 'Bingbot',
        'Baiduspider', 'yandex', 'linkedinbot', 'Pinterest'
    ];
    // Don't flag as bot if it contains common mobile browser strings even if bot names are present
    const isMobileBrowser = /Mobi|Android|iPhone|iPad/i.test(userAgent);
    const isBot = !isMobileBrowser && bots.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));

    try {
        // Just get metadata for OG tags
        // Case-insensitive lookup here as well
        const shareLink = await MegaRewardShareLink.findOne({
            linkCode: { $regex: new RegExp(`^${linkCode}$`, 'i') }
        }).populate('reelId', 'title description videoUrl thumbnail');

        // Determine Redirect URL
        let frontendUrl = process.env.FRONTEND_URL;
        if (!frontendUrl) {
            const host = req.get('host') || '';
            if (host.includes('dealingindia') || host.includes('onrender')) {
                frontendUrl = 'https://www.dealingindia.com';
            } else {
                frontendUrl = 'http://localhost:5173';
            }
        }

        let redirectUrl = `${frontendUrl}/app/reels`;
        let ogTitle = 'Mega Reward';
        let ogDescription = 'Check out this amazing reel and win prizes!';
        let ogImage = '';
        let linkOwnerId = null;

        if (shareLink && shareLink.reelId) {
            const reelId = shareLink.reelId._id || shareLink.reelId;
            redirectUrl = `${frontendUrl}/app/reels/${reelId}?source=${shareLink.platform || 'share'}`;
            ogTitle = shareLink.reelId.title || 'Mega Reward Reel';
            ogDescription = shareLink.reelId.description || 'Watch and share to win huge rewards!';
            ogImage = shareLink.reelId.thumbnail || '';
            linkOwnerId = shareLink.userId?.toString() || null;
        }

        // Return HTML with Open Graph tags + JS Logic
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${ogTitle}</title>
                
                <!-- Open Graph / Social Previews -->
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
                    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fafafa; color: #333; }
                    .loader { border: 3px solid #eee; border-top: 3px solid #7c3aed; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .content { text-align: center; }
                    .status { font-size: 12px; color: #999; margin-top: 10px; }
                </style>
                
                <script>
                    function getUserIdFromToken() {
                        try {
                            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                            if (!token) return null;
                            const payload = token.split('.')[1];
                            if (!payload) return null;
                            const decoded = JSON.parse(atob(payload));
                            return decoded.userId || decoded._id || decoded.id || null;
                        } catch (e) { return null; }
                    }
                    
                    async function completeRedirect() {
                        const isBot = ${isBot};
                        const redirectUrl = "${redirectUrl}";
                        const linkCode = "${linkCode}";
                        const linkOwnerId = "${linkOwnerId}";
                        const apiHost = window.location.origin;

                        console.log('[MegaReward] Tracking click for:', linkCode);

                        if (!isBot) {
                            try {
                                const viewerUserId = getUserIdFromToken();
                                console.log('[MegaReward] Viewer ID:', viewerUserId);
                                
                                if (viewerUserId && viewerUserId === linkOwnerId) {
                                  console.warn('[MegaReward] Owner self-click detected. Will not count but redirecting...');
                                }

                                // Securely log the click via API
                                const response = await fetch(apiHost + '/api/mega-reward/track-log/' + encodeURIComponent(linkCode), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ viewerUserId: viewerUserId })
                                });
                                
                                const result = await response.json();
                                console.log('[MegaReward] Tracking response:', result);
                            } catch (e) {
                                console.error('[MegaReward] Tracking failed:', e);
                            }
                        } else {
                            console.log('[MegaReward] Bot detected or preview mode. Skipping track.');
                        }
                        
                        // Final destination
                        setTimeout(() => {
                            window.location.href = redirectUrl;
                        }, 500);
                    }
                    
                    // Start process
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', completeRedirect);
                    } else {
                        completeRedirect();
                    }
                </script>
            </head>
            <body>
                <div class="content">
                    <div class="loader" style="margin: 0 auto 20px auto;"></div>
                    <p>${isBot ? 'Previewing Reel...' : 'Opening Reel...'}</p>
                    <div class="status" id="track-status">Wait a moment while we redirect you...</div>
                    <a href="${redirectUrl}" style="color: #7c3aed; text-decoration: none; font-size: 14px; display: block; mt-4: 20px;">Click here if not redirected</a>
                </div>
            </body>
            </html>
        `;

        res.send(html);

    } catch (error) {
        console.error('Click tracking error:', error.message);
        const frontendUrl = process.env.FRONTEND_URL || 'https://www.dealingindia.com';
        res.redirect(302, `${frontendUrl}/app/reels`);
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
