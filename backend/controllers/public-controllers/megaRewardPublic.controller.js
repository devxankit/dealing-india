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

        console.info(`[MegaReward] Tracking landing: code=${linkCode}, found=${!!shareLink}`);

        // 2. Determine base URLs (more robust detection)
        let frontendUrl = process.env.FRONTEND_URL;
        const requestHost = req.get('host') || '';
        const isProductionHost = requestHost.includes('dealingindia') || requestHost.includes('onrender');

        // Logic: If on production host but frontendUrl points to localhost, or if frontendUrl is missing, auto-detect.
        if (!frontendUrl || (isProductionHost && frontendUrl.includes('localhost'))) {
            if (isProductionHost) {
                // Production preference: Use main domain or Vercel
                frontendUrl = 'https://www.dealingindia.com';
            } else {
                frontendUrl = 'http://localhost:3000';
            }
        }

        let redirectUrl = `${frontendUrl}/app`;
        let ogTitle = 'Mega Reward';
        let ogDescription = 'Check out this amazing reel and win prizes!';
        let ogImage = '';
        let platform = 'share';

        if (shareLink) {
            platform = shareLink.platform || 'share';
            // Use the stored reelId directly if populate failed (e.g. reel was deleted but link exists)
            const reelId = shareLink.reelId?._id || shareLink.reelId;

            if (reelId) {
                redirectUrl = `${frontendUrl}/app/reels/${reelId}?source=${platform}&lc=${linkCode}`;

                if (shareLink.reelId && typeof shareLink.reelId === 'object') {
                    ogTitle = shareLink.reelId.title || 'Mega Reward Reel';
                    ogDescription = shareLink.reelId.description || 'Watch and share to win huge rewards!';
                    ogImage = shareLink.reelId.thumbnail || '';
                }
            }
        }

        console.info(`[MegaReward] Redirect will go to: ${redirectUrl}`);

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
                        const statusEl = document.getElementById('status');
                        try {
                            const viewerUserId = (function() {
                                try {
                                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                                    if (!token) return null;
                                    return JSON.parse(atob(token.split('.')[1])).userId;
                                } catch(e) { return null; }
                            })();

                            const clientFingerprint = (function() {
                                try {
                                    return btoa([navigator.userAgent, navigator.language, screen.width + 'x' + screen.height].join('|'));
                                } catch(e) { return 'anon'; }
                            })();

                            console.log('[MegaReward] Dispatching tracking request...');
                            
                            const trackPromise = fetch(apiHost + '/api/mega-reward/track-log/' + encodeURIComponent(linkCode), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ viewerUserId, clientFp: clientFingerprint }),
                                keepalive: true
                            });

                            // Give fetch a small head-start before navigating
                            await Promise.race([
                                trackPromise,
                                new Promise(resolve => setTimeout(resolve, 800)) // Max wait for response
                            ]);

                            console.log('[MegaReward] Tracking dispatched. Redirecting...');
                            if (statusEl) statusEl.innerText = "Redirecting to dealingindia.com...";
                        } catch (err) {
                            console.error('[MegaReward] Tracking error:', err);
                        } finally {
                            // Essential wait: navigating too fast kills the request even with keepalive in some Browsers
                            setTimeout(() => { window.location.href = redirectUrl; }, 200);
                        }
                    }
                    
                    document.getElementById('skipBtn').onclick = (e) => { 
                        e.preventDefault();
                        window.location.href = redirectUrl; 
                    };
                    track();
                    setTimeout(() => { if(window.location.href !== redirectUrl) window.location.href = redirectUrl; }, 4000);
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('[MegaReward] Controller Error:', error);
        const currentHost = req.get('host') || '';
        const isProd = currentHost.includes('dealingindia') || currentHost.includes('onrender');
        const fbUrl = (isProd && process.env.FRONTEND_URL?.includes('localhost'))
            ? 'https://www.dealingindia.com'
            : (process.env.FRONTEND_URL || 'https://www.dealingindia.com');
        res.redirect(`${fbUrl}/app`);
    }
});

// Record the actual click (POST handler called by JS)
export const recordClick = asyncHandler(async (req, res) => {
    const { linkCode } = req.params;
    const { viewerUserId, clientFp } = req.body;

    console.info(`[MegaReward] recordClick: code=${linkCode}, viewer=${viewerUserId || 'Guest'}, clientFp=${!!clientFp}`);

    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || req.ip
        || 'unknown';

    let fingerprint = null;

    // 1. Try cookie fingerprint
    if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const parts = cookie.trim().split('=');
            if (parts[0] === 'mr_fp') acc[parts[0]] = parts[1];
            return acc;
        }, {});
        fingerprint = cookies['mr_fp'];
    }

    // 2. Fallback to client-side fingerprint if cookie fails (common in incognito)
    if (!fingerprint && clientFp) {
        console.info(`[MegaReward] Using client-side FP for code=${linkCode}`);
        fingerprint = clientFp;
    }

    // 3. Last resort - Generate and set cookie for next time
    if (!fingerprint) {
        fingerprint = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Always try to set/refresh the cookie
    res.cookie('mr_fp', fingerprint, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });

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
        console.error(`[MegaReward] Tracking failed for ${linkCode}:`, error.message);
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
