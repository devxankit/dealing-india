import MegaRewardShareLink from '../models/MegaRewardShareLink.model.js';
import MegaRewardClickLog from '../models/MegaRewardClickLog.model.js';
import MegaRewardSettings from '../models/MegaRewardSettings.model.js';

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
                exists: true
            };
        }

        // 2. If NO link exists, generate a stateless "temporary" code
        // Format: "lazy_<base64(userId:reelId:platform:campaignId)>"
        // This avoids creating a DB record just for clicking the button
        const payload = `${userId}:${reelId}:${platform}:${activeSettings._id}`;
        const encoded = Buffer.from(payload).toString('base64');
        const tempCode = `lazy_${encoded}`;

        return {
            linkCode: tempCode,
            exists: false
        };
    }

    /**
     * Track a click on a share link
     * Returns: { success: boolean, isNewClick: boolean }
     */
    async trackClick(linkCode, ipAddress, fingerprint, userAgent) {
        let shareLink;

        // 1. Check if this is a Lazy Link (Temporary)
        if (linkCode.startsWith('lazy_')) {
            try {
                // Decode payload: "userId:reelId:platform:megaRewardId"
                const encoded = linkCode.replace('lazy_', '');
                const payload = Buffer.from(encoded, 'base64').toString('utf8');
                const [userId, reelId, platform, megaRewardId] = payload.split(':');

                if (!userId || !reelId || !platform || !megaRewardId) {
                    throw new Error('Invalid temporary link format');
                }

                // Double-check if persistent link was created in the meantime (Race condition)
                shareLink = await MegaRewardShareLink.findOne({ userId, reelId, platform })
                    .populate('reelId', 'title description videoUrl thumbnail');

                // If not, CREATE it now (The "Lazy Creation" step)
                if (!shareLink) {
                    const settings = await MegaRewardSettings.findById(megaRewardId);
                    if (!settings) throw new Error('Campaign not found');

                    shareLink = await MegaRewardShareLink.create({
                        userId,
                        reelId,
                        megaRewardId,
                        platform,
                        expiresAt: settings.endDate
                    });

                    // Populate reelId for the newly created link
                    await shareLink.populate('reelId', 'title description videoUrl thumbnail');
                }
            } catch (err) {
                console.error('Lazy link creation failed:', err);
                throw new Error('Invalid or corrupted share link');
            }
        } else {
            // 2. Normal Persistent Link
            shareLink = await MegaRewardShareLink.findOne({ linkCode })
                .populate('reelId', 'title description videoUrl thumbnail');
        }

        if (!shareLink) {
            throw new Error('Invalid share link');
        }

        // Check if link has expired
        if (new Date() > shareLink.expiresAt) {
            throw new Error('Share link has expired');
        }

        try {
            // Try to create a new click log (will fail if duplicate due to unique index)
            await MegaRewardClickLog.create({
                shareLinkId: shareLink._id,
                ipAddress,
                fingerprint: fingerprint || '',
                userAgent: userAgent || '',
                platform: shareLink.platform
            });

            // Increment unique click count
            shareLink.uniqueClickCount += 1;

            // Check if eligibility threshold is met
            const settings = await MegaRewardSettings.findById(shareLink.megaRewardId);
            if (settings) {
                const requiredClicks = settings.requiredClicks[shareLink.platform];
                if (shareLink.uniqueClickCount >= requiredClicks) {
                    shareLink.isEligible = true;
                }
            }

            await shareLink.save();

            return {
                success: true,
                isNewClick: true,
                uniqueClickCount: shareLink.uniqueClickCount,
                shareLink
            };
        } catch (error) {
            // Duplicate click (same IP + fingerprint)
            if (error.code === 11000) {
                return {
                    success: true,
                    isNewClick: false,
                    message: 'Click already recorded',
                    shareLink
                };
            }
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
                const [userId, reelId] = payload.split(':');

                // Fetch reel to provide real metadata for OG tags even if record doesn't exist yet
                // This prevents bots from triggering DB writes just to see OG tags
                const PromotionalReel = mongoose.model('PromotionalReel');
                const reel = await PromotionalReel.findById(reelId);

                if (reel) {
                    return {
                        reelId: reel,
                        userId: { name: 'A friend' },
                        isLazy: true
                    };
                }
            } catch (e) {
                return null;
            }
        }

        return shareLink;
    }
}

export default new MegaRewardShareService();
