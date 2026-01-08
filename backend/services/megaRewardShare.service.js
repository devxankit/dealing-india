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

        // Check if link already exists
        let shareLink = await MegaRewardShareLink.findOne({
            userId,
            reelId,
            platform
        });

        if (shareLink) {
            return shareLink;
        }

        // Create new share link
        shareLink = await MegaRewardShareLink.create({
            userId,
            reelId,
            megaRewardId: activeSettings._id,
            platform,
            expiresAt: activeSettings.endDate
        });

        return shareLink;
    }

    /**
     * Track a click on a share link
     * Returns: { success: boolean, isNewClick: boolean }
     */
    async trackClick(linkCode, ipAddress, fingerprint, userAgent) {
        const shareLink = await MegaRewardShareLink.findOne({ linkCode });

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
            const requiredClicks = settings.requiredClicks[shareLink.platform];

            if (shareLink.uniqueClickCount >= requiredClicks) {
                shareLink.isEligible = true;
            }

            await shareLink.save();

            return { success: true, isNewClick: true, uniqueClickCount: shareLink.uniqueClickCount };
        } catch (error) {
            // Duplicate click (same IP + fingerprint)
            if (error.code === 11000) {
                return { success: true, isNewClick: false, message: 'Click already recorded' };
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
     * Get share link by link code
     */
    async getShareLinkByCode(linkCode) {
        return await MegaRewardShareLink.findOne({ linkCode })
            .populate('userId', 'name email')
            .populate('reelId', 'title videoUrl');
    }
}

export default new MegaRewardShareService();
