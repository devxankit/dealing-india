import mongoose from 'mongoose';
import MegaRewardShareLink from '../models/MegaRewardShareLink.model.js';
import MegaRewardClickLog from '../models/MegaRewardClickLog.model.js';
import MegaRewardSettings from '../models/MegaRewardSettings.model.js';
import PromotionalReel from '../models/PromotionalReel.model.js';

/**
 * MegaRewardShare Service
 * Handles share link generation and click tracking
 */
class MegaRewardShareService {
    /**
     * Generate a unique share link for a user + reel + platform
     * Uses "Lazy Creation" - returns a temporary signed code if no DB record exists
     * to prevent database bloat from unused share buttons.
     */
    async generateShareLink(userId, reelId, platform) {
        // Get active running campaign
        const now = new Date();
        const activeSettings = await MegaRewardSettings.findOne({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        if (!activeSettings) {
            throw new Error('No active or running Mega Reward campaign found');
        }

        // 1. Check if a persistent link ALREADY exists
        let shareLink = await MegaRewardShareLink.findOne({
            userId,
            reelId,
            platform
        });

        if (shareLink) {
            // Return the existing persistent short code
            return {
                linkCode: shareLink.linkCode,
                exists: true,
                uniqueClickCount: shareLink.uniqueClickCount,
                isEligible: shareLink.isEligible
            };
        }

        // 2. If NO link exists, CREATE it now (PERSISTENT)
        console.log(`[MegaRewardShare] Creating new persistent share link for user ${userId}, reel ${reelId}, platform ${platform}`);

        shareLink = await MegaRewardShareLink.create({
            userId: new mongoose.Types.ObjectId(userId),
            reelId: new mongoose.Types.ObjectId(reelId),
            megaRewardId: activeSettings._id,
            platform,
            expiresAt: activeSettings.endDate
        });

        return {
            linkCode: shareLink.linkCode,
            exists: true, // It exists now because we just created it
            uniqueClickCount: 0,
            isEligible: false
        };
    }

    /**
     * Track a click on a share link
     * Returns: { success: boolean, isNewClick: boolean }
     * 
     * Enhanced logic:
     * - Checks IP + fingerprint for guest uniqueness
     * - Checks viewerUserId for logged-in user uniqueness
     * - A single user can only count once per link regardless of IP/device changes
     */
    async trackClick(linkCode, ipAddress, fingerprint, userAgent, viewerUserId = null) {
        let shareLink;
        const logPrefix = `[MegaRewardShare][trackClick][${linkCode}]`;
        console.info(`${logPrefix} Start tracking click. IP: ${ipAddress}, Viewer: ${viewerUserId || 'Guest'}`);

        // 1. Find the link (Case-insensitive)
        try {
            if (linkCode.startsWith('lazy_')) {
                // ... (Lazy link logic remains same but with more logging)
                const encoded = linkCode.substring(5);
                const payload = Buffer.from(encoded, 'base64').toString('utf8');
                const [userId, reelId, platform, megaRewardId] = payload.split(':');

                console.info(`${logPrefix} Lazy link decoded: user=${userId}, platform=${platform}`);

                shareLink = await MegaRewardShareLink.findOne({
                    userId: new mongoose.Types.ObjectId(userId),
                    reelId: new mongoose.Types.ObjectId(reelId),
                    platform
                }).populate('reelId');

                if (!shareLink) {
                    console.info(`${logPrefix} Lazy link: Creating persistent link...`);
                    const settings = await MegaRewardSettings.findById(megaRewardId);
                    if (!settings) throw new Error('Campaign settings not found');

                    shareLink = await MegaRewardShareLink.create({
                        userId: new mongoose.Types.ObjectId(userId),
                        reelId: new mongoose.Types.ObjectId(reelId),
                        megaRewardId: new mongoose.Types.ObjectId(megaRewardId),
                        platform,
                        expiresAt: settings.endDate
                    });
                    console.info(`${logPrefix} Lazy link: Persistent link created: ${shareLink._id}`);
                }
            } else {
                shareLink = await MegaRewardShareLink.findOne({
                    linkCode: { $regex: new RegExp(`^${linkCode}$`, 'i') }
                }).populate('reelId');
            }
        } catch (err) {
            console.error(`${logPrefix} DB Error during link lookup:`, err.message);
            throw err;
        }

        if (!shareLink) {
            console.warn(`${logPrefix} Link not found: ${linkCode}`);
            return { success: false, message: 'Invalid or expired share link' };
        }

        console.info(`${logPrefix} Link found: ID=${shareLink._id}, Platform=${shareLink.platform}, Current Clicks=${shareLink.uniqueClickCount}`);

        // 2. Security Check: Link Expiry
        if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
            console.warn(`${logPrefix} Link expired: ${linkCode} on ${shareLink.expiresAt}`);
            return { success: false, message: 'Link has expired', shareLink };
        }

        // 3. Duplicate Prevention (Fraud Prevention)
        const normalizedViewerId = (viewerUserId && viewerUserId !== 'null' && mongoose.Types.ObjectId.isValid(viewerUserId))
            ? viewerUserId.toString()
            : null;

        // Owner Self-Click Check
        if (normalizedViewerId && shareLink.userId?.toString() === normalizedViewerId) {
            console.info(`${logPrefix} Owner self-click detected. Not counting but allowing redirect.`);
            return { success: true, isNewClick: false, message: 'Owner self-click', shareLink };
        }

        // Log the attempt
        console.info(`${logPrefix} Tracking attempt: IP=${ipAddress}, Fingerprint=${fingerprint ? fingerprint.substring(0, 10) + '...' : 'None'}, ViewerID=${normalizedViewerId || 'Guest'}`);

        // Logged-in user duplicate check
        if (normalizedViewerId) {
            const hasClicked = await MegaRewardClickLog.findOne({
                shareLinkId: shareLink._id,
                viewerUserId: new mongoose.Types.ObjectId(normalizedViewerId)
            });
            if (hasClicked) {
                console.info(`${logPrefix} User duplicate: Already clicked by user ${normalizedViewerId}`);
                return { success: true, isNewClick: false, message: 'You have already clicked this', shareLink };
            }
        }

        // Guest duplicate check (manual lookup before attempt to be safe)
        const hasGuestClicked = await MegaRewardClickLog.findOne({
            shareLinkId: shareLink._id,
            ipAddress,
            fingerprint: fingerprint || ''
        });
        if (hasGuestClicked) {
            console.info(`${logPrefix} Guest duplicate: Already clicked from IP ${ipAddress}`);
            return { success: true, isNewClick: false, message: 'Already clicked from this browser', shareLink };
        }

        // 4. Record Click & Increment
        try {
            console.info(`${logPrefix} Recording new unique click...`);
            await MegaRewardClickLog.create({
                shareLinkId: shareLink._id,
                linkOwnerUserId: shareLink.userId,
                viewerUserId: normalizedViewerId ? new mongoose.Types.ObjectId(normalizedViewerId) : null,
                ipAddress,
                fingerprint: fingerprint || '',
                userAgent: userAgent || '',
                platform: shareLink.platform,
                counted: true
            });

            shareLink.uniqueClickCount = (shareLink.uniqueClickCount || 0) + 1;

            // Eligibility logic
            const settings = await MegaRewardSettings.findById(shareLink.megaRewardId);
            if (settings) {
                const reqClicks = settings.requiredClicks?.[shareLink.platform] || 1;
                if (shareLink.uniqueClickCount >= reqClicks) {
                    shareLink.isEligible = true;
                    console.info(`${logPrefix} Target reached! Platform ${shareLink.platform} is now eligible.`);
                }
            }

            await shareLink.save();
            console.info(`${logPrefix} Success! Count saved: ${shareLink.uniqueClickCount}`);

            return {
                success: true,
                isNewClick: true,
                uniqueClickCount: shareLink.uniqueClickCount,
                shareLink
            };

        } catch (error) {
            if (error.code === 11000) {
                console.info(`${logPrefix} Duplicate caught by DB index`);
                return { success: true, isNewClick: false, message: 'Duplicate click', shareLink };
            }
            console.error(`${logPrefix} Error saving click:`, error.message);
            throw error;
        }
    }

    /**
     * Get click statistics for a share link
     */
    async getClickStats(shareLinkId) {
        const clickCount = await MegaRewardClickLog.countDocuments({ shareLinkId });
        const shareLink = await MegaRewardShareLink.findById(shareLinkId);

        return {
            totalClicks: clickCount,
            uniqueClickCount: shareLink?.uniqueClickCount || 0,
            isEligible: shareLink?.isEligible || false
        };
    }

    /**
     * Get a user's share links for a specific reel
     */
    async getUserShareLinks(userId, reelId) {
        return await MegaRewardShareLink.find({ userId, reelId });
    }

    /**
     * Check eligibility status for a user across all platforms for a reel
     */
    async checkEligibility(userId, reelId) {
        const shareLinks = await MegaRewardShareLink.find({ userId, reelId });

        const eligibility = {
            whatsapp: false,
            instagram: false,
            facebook: false,
            allMet: false
        };

        const stats = {
            whatsapp: { clicks: 0, required: 5 },
            instagram: { clicks: 0, required: 1 },
            facebook: { clicks: 0, required: 1 }
        };

        for (const link of shareLinks) {
            eligibility[link.platform] = link.isEligible;
            stats[link.platform].clicks = link.uniqueClickCount;
        }

        eligibility.allMet = eligibility.whatsapp && eligibility.instagram && eligibility.facebook;

        return { eligibility, stats };
    }

    /**
     * Get share link by link code (Supports both short codes and lazy codes)
     */
    async getShareLinkByCode(linkCode) {
        // 1. Check persistent link - Case-insensitive lookup
        let shareLink = await MegaRewardShareLink.findOne({
            linkCode: { $regex: new RegExp(`^${linkCode}$`, 'i') }
        })
            .populate('userId', 'name email')
            .populate('reelId', 'title description videoUrl thumbnail');

        // 2. If not found and is lazy, decode and return mock/temp info for OG tags
        if (!shareLink && linkCode.startsWith('lazy_')) {
            try {
                const encoded = linkCode.replace('lazy_', '');
                const payload = Buffer.from(encoded, 'base64').toString('utf8');
                const [userId, reelId, platform] = payload.split(':');

                // Fetch reel to provide real metadata for OG tags even if record doesn't exist yet
                const reel = await PromotionalReel.findById(reelId);

                if (reel) {
                    return {
                        reelId: reel,
                        userId: { name: 'A friend' },
                        platform: platform || 'share',
                        isLazy: true
                    };
                }
            } catch (e) {
                console.error('Lazy link decode error:', e);
                return null;
            }
        }

        return shareLink;
    }
}

export default new MegaRewardShareService();
