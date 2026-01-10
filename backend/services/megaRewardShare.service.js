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
        console.log(`[MegaRewardShare] Tracking click for code: ${linkCode.substring(0, 20)}... from IP: ${ipAddress}${viewerUserId ? `, viewerUserId: ${viewerUserId}` : ''}`);

        // 1. Check if this is a Lazy Link (Temporary)
        if (linkCode.startsWith('lazy_')) {
            try {
                // Decode payload: "userId:reelId:platform:megaRewardId"
                const encoded = linkCode.substring(5); // Safer than replace
                const payload = Buffer.from(encoded, 'base64').toString('utf8');
                const [userId, reelId, platform, megaRewardId] = payload.split(':');

                console.log(`[MegaRewardShare] Lazy link decoded: userId=${userId}, reelId=${reelId}, platform=${platform}`);

                if (!userId || !reelId || !platform || !megaRewardId) {
                    throw new Error('Invalid temporary link format');
                }

                // Double-check if persistent link was created in the meantime (Race condition)
                shareLink = await MegaRewardShareLink.findOne({
                    userId: new mongoose.Types.ObjectId(userId),
                    reelId: new mongoose.Types.ObjectId(reelId),
                    platform
                }).populate('reelId', 'title description videoUrl thumbnail');

                // If not, CREATE it now (The "Lazy Creation" step)
                if (!shareLink) {
                    console.log(`[MegaRewardShare] Creating persistent share link...`);
                    const settings = await MegaRewardSettings.findById(megaRewardId);
                    if (!settings) {
                        console.error(`[MegaRewardShare] Campaign ${megaRewardId} not found`);
                        throw new Error('Campaign not found');
                    }

                    shareLink = await MegaRewardShareLink.create({
                        userId: new mongoose.Types.ObjectId(userId),
                        reelId: new mongoose.Types.ObjectId(reelId),
                        megaRewardId: new mongoose.Types.ObjectId(megaRewardId),
                        platform,
                        expiresAt: settings.endDate
                    });

                    // Populate reelId for the newly created link
                    await shareLink.populate('reelId', 'title description videoUrl thumbnail');
                    console.log(`[MegaRewardShare] Persistent link created: ${shareLink._id}`);
                }
            } catch (err) {
                console.error('[MegaRewardShare] Lazy link track failed:', err.message);
                throw new Error('Invalid or corrupted share link');
            }
        } else {
            // 2. Normal Persistent Link
            shareLink = await MegaRewardShareLink.findOne({ linkCode })
                .populate('reelId', 'title description videoUrl thumbnail');
        }

        if (!shareLink) {
            console.error(`[MegaRewardShare] Share link not found for code: ${linkCode}`);
            throw new Error('Invalid share link');
        }

        // Check if link has expired
        if (new Date() > shareLink.expiresAt) {
            console.error(`[MegaRewardShare] Link expired:`, {
                linkCode,
                expiresAt: shareLink.expiresAt,
                now: new Date()
            });
            throw new Error('Share link has expired');
        }

        // CRITICAL: Prevent link owner from clicking their own link
        if (viewerUserId && shareLink.userId.toString() === viewerUserId.toString()) {
            console.log(`[MegaRewardShare] Link owner tried to click own link - not counting`);
            return {
                success: true,
                isNewClick: false,
                message: 'Link owners cannot count their own clicks',
                shareLink
            };
        }

        // CHECK 1: If viewerUserId is provided, check if this user already clicked
        if (viewerUserId) {
            const existingUserClick = await MegaRewardClickLog.findOne({
                shareLinkId: shareLink._id,
                viewerUserId: new mongoose.Types.ObjectId(viewerUserId)
            });

            if (existingUserClick) {
                console.log(`[MegaRewardShare] User ${viewerUserId} already clicked this link`);
                return {
                    success: true,
                    isNewClick: false,
                    message: 'You have already clicked this link',
                    shareLink
                };
            }
        }

        try {
            console.log(`[MegaRewardShare] Creating click log:`, {
                shareLinkId: shareLink._id,
                linkOwnerUserId: shareLink.userId,
                viewerUserId: viewerUserId || 'guest',
                ipAddress,
                fingerprint: fingerprint || 'none',
                platform: shareLink.platform
            });

            // Try to create a new click log (will fail if duplicate due to unique index on IP+fingerprint)
            const clickLog = await MegaRewardClickLog.create({
                shareLinkId: shareLink._id,
                linkOwnerUserId: shareLink.userId,
                viewerUserId: viewerUserId ? new mongoose.Types.ObjectId(viewerUserId) : null,
                ipAddress,
                fingerprint: fingerprint || '',
                userAgent: userAgent || '',
                platform: shareLink.platform,
                counted: true
            });

            console.log(`[MegaRewardShare] Click log created:`, clickLog._id);

            // Increment unique click count
            shareLink.uniqueClickCount += 1;
            console.log(`[MegaRewardShare] Incremented click count to:`, shareLink.uniqueClickCount);

            // Check if eligibility threshold is met
            const settings = await MegaRewardSettings.findById(shareLink.megaRewardId);
            if (settings) {
                const requiredClicks = settings.requiredClicks[shareLink.platform];
                console.log(`[MegaRewardShare] Checking eligibility:`, {
                    currentClicks: shareLink.uniqueClickCount,
                    requiredClicks,
                    platform: shareLink.platform
                });

                if (shareLink.uniqueClickCount >= requiredClicks) {
                    shareLink.isEligible = true;
                    console.log(`[MegaRewardShare] Platform ${shareLink.platform} is now eligible!`);
                }
            }

            await shareLink.save();
            console.log(`[MegaRewardShare] ShareLink saved successfully`);

            return {
                success: true,
                isNewClick: true,
                uniqueClickCount: shareLink.uniqueClickCount,
                shareLink
            };
        } catch (error) {
            // Duplicate click (same IP + fingerprint)
            if (error.code === 11000) {
                console.log(`[MegaRewardShare] Duplicate click detected:`, {
                    ipAddress,
                    fingerprint,
                    shareLinkId: shareLink._id
                });
                return {
                    success: true,
                    isNewClick: false,
                    message: 'Click already recorded',
                    shareLink
                };
            }
            console.error(`[MegaRewardShare] Error creating click log:`, {
                error: error.message,
                code: error.code,
                stack: error.stack
            });
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
        // 1. Check persistent link
        let shareLink = await MegaRewardShareLink.findOne({ linkCode })
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
