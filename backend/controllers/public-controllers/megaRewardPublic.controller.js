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

    // Determine Client Info
    const userAgent = req.headers['user-agent'] || '';

    // Advanced Bot Detection (Extended List)
    const bots = [
        'WhatsApp', 'facebookexternalhit', 'Facebot', 'Twitterbot',
        'TelegramBot', 'Discordbot', 'Slackbot', 'Googlebot', 'Bingbot',
        'Baiduspider', 'yandex', 'embedly', 'quora-bot', 'linkedinbot',
        'Pinterest', 'VisionUtils', 'criteo', 'outbrain',
        'slack-imgProxy', 'vkShare', 'W3C_Validator', 'Redditbot',
        'HeadlessChrome', 'PhantomJS', 'Centroid', 'spider', 'crawler', 'scraper'
    ];
    const isBot = bots.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase())) || !userAgent;

    try {
        // Just get metadata for OG tags, do not track/increment yet on the initial GET request
        // This prevents social media preview-bots from triggering counts
        const shareLink = await MegaRewardShareService.getShareLinkByCode(linkCode);

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

        if (shareLink && shareLink.reelId) {
            const reelId = shareLink.reelId._id || shareLink.reelId;
            redirectUrl = `${frontendUrl}/app/reels/${reelId}?source=${shareLink.platform || 'share'}`;
            ogTitle = shareLink.reelId.title || 'Mega Reward Reel';
            ogDescription = shareLink.reelId.description || 'Watch and share to win huge rewards!';
            ogImage = shareLink.reelId.thumbnail || '';
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
                    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #000; color: #fff; }
                    .loader { border: 3px solid #333; border-top: 3px solid #7c3aed; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .content { text-align: center; }
                </style>
                
                <script>
                    async function completeRedirect() {
                        const isBot = ${isBot};
                        const redirectUrl = "${redirectUrl}";
                        const linkCode = "${linkCode}";

                        if (!isBot) {
                            try {
                                // Real human -> Securely log the click via API before redirecting
                                // This filters out bots that don't execute JS
                                await fetch('/api/mega-reward/track-log/' + encodeURIComponent(linkCode), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' }
                                });
                            } catch (e) {
                                console.error('Tracking error:', e);
                            }
                        }
                        
                        // Proceed to final destination
                        if (!isBot) {
                            window.location.href = redirectUrl;
                        }
                    }
                    
                    // Small delay for smooth transition
                    setTimeout(completeRedirect, 800);
                </script>
            </head>
            <body>
                <div class="content">
                    <div class="loader" style="margin: 0 auto 20px auto;"></div>
                    <p>${isBot ? 'Previewing Reel...' : 'Opening Reel...'}</p>
                    <a href="${redirectUrl}" style="color: #7c3aed; text-decoration: none; font-size: 14px;">Click here if not redirected</a>
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
    console.log(`[MegaRewardController] recordClick hit for code: ${linkCode.substring(0, 20)}...`);

    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || req.ip
        || 'unknown';

    console.log(`[MegaRewardController] Client IP: ${ipAddress}`);

    let fingerprint = null;
    if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split('=');
            acc[name] = value;
            return acc;
        }, {});
        fingerprint = cookies['mr_fp'];
    }

    if (!fingerprint) {
        const randomPart = Math.random().toString(36).substring(2, 11);
        fingerprint = `fp_${Date.now()}_${randomPart}`;
        console.log(`[MegaRewardController] Generated new fingerprint: ${fingerprint}`);
        res.cookie('mr_fp', fingerprint, {
            maxAge: 365 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
    } else {
        console.log(`[MegaRewardController] Using existing fingerprint: ${fingerprint}`);
    }

    const userAgent = req.headers['user-agent'] || '';

    try {
        console.log(`[MegaRewardController] Calling trackClick service...`);
        const result = await MegaRewardShareService.trackClick(
            linkCode,
            ipAddress,
            fingerprint,
            userAgent
        );

        console.log(`[MegaRewardController] trackClick result:`, {
            success: result.success,
            isNewClick: result.isNewClick,
            uniqueClickCount: result.uniqueClickCount
        });

        res.status(200).json(result);
    } catch (error) {
        console.error(`[MegaRewardController] recordClick error:`, {
            message: error.message,
            stack: error.stack,
            linkCode,
            ipAddress
        });
        throw error;
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
