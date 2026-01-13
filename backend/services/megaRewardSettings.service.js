import MegaRewardSettings from '../models/MegaRewardSettings.model.js';

/**
 * MegaRewardSettings Service
 * Handles campaign configuration CRUD operations
 */
class MegaRewardSettingsService {
    /**
     * Create a new Mega Reward campaign
     */
    async createSettings(data, adminId) {
        // Validate ranges
        this.validateRanges(data.customRanges);

        // If this campaign is active, deactivate others first
        if (data.isActive) {
            await MegaRewardSettings.updateMany(
                { isActive: true },
                { isActive: false }
            );
        }

        const settings = await MegaRewardSettings.create({
            ...data,
            createdBy: adminId
        });

        return settings;
    }

    /**
     * Update an existing campaign
     */
    async updateSettings(id, data) {
        const existing = await MegaRewardSettings.findById(id);
        if (!existing) {
            throw new Error('Mega Reward settings not found');
        }

        // Restriction: If campaign status is active and it is currently running, block updates
        // EXCEPT for deactivating the campaign
        const now = new Date();
        if (existing.isActive && existing.startDate <= now && existing.endDate >= now) {
            // If the user is trying to deactivate, only allow that field to change
            if (data.isActive === false) {
                const settings = await MegaRewardSettings.findByIdAndUpdate(
                    id,
                    { isActive: false },
                    { new: true, runValidators: true }
                );
                return settings;
            }
            throw new Error('Campaign is currently running. Editing is disabled to ensure fairness.');
        }

        // If activating this campaign, deactivate others
        if (data.isActive) {
            await MegaRewardSettings.updateMany(
                { _id: { $ne: id }, isActive: true },
                { isActive: false }
            );
        }

        // Validate ranges
        if (data.customRanges) {
            this.validateRanges(data.customRanges);
        }

        const settings = await MegaRewardSettings.findByIdAndUpdate(
            id,
            data,
            { new: true, runValidators: true }
        );

        if (!settings) {
            throw new Error('Mega Reward settings not found');
        }

        return settings;
    }

    /**
     * Validate range configuration
     */
    validateRanges(ranges) {
        if (!ranges || ranges.length === 0) return;
        if (ranges.length > 5) throw new Error('Maximum 5 ranges allowed');

        // Sort ranges by startRank to check overlapping
        const sortedRanges = [...ranges].sort((a, b) => a.startRank - b.startRank);

        for (let i = 0; i < sortedRanges.length; i++) {
            const range = sortedRanges[i];

            if (range.startRank < 4) throw new Error('Ranges must start from 4 or higher');
            if (range.endRank < range.startRank) throw new Error('End rank cannot be less than start rank');

            // Check overlap with next range
            if (i < sortedRanges.length - 1) {
                const nextRange = sortedRanges[i + 1];
                if (range.endRank >= nextRange.startRank) {
                    throw new Error(`Range Overlap: Range ${range.startRank}-${range.endRank} overlaps with ${nextRange.startRank}-${nextRange.endRank}`);
                }
            }
        }
    }

    /**
     * Get the currently active campaign
     */
    async getActiveSettings() {
        const settings = await MegaRewardSettings.findOne({ isActive: true })
            .populate('createdBy', 'name email');

        if (settings) {
            const now = new Date();
            // If the campaign has ended, automatically deactivate it
            if (settings.endDate < now) {
                settings.isActive = false;
                await settings.save();
                return null; // Return null as there is no longer an "active" campaign
            }
        }

        return settings;
    }

    /**
     * Get the currently running campaign (active AND within date range)
     */
    async getRunningSettings() {
        const now = new Date();
        const settings = await MegaRewardSettings.findOne({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).populate('createdBy', 'name email');

        return settings;
    }

    /**
     * Get all campaigns
     */
    async getAllSettings() {
        return await MegaRewardSettings.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email');
    }

    /**
     * Get a single campaign by ID
     */
    async getSettingsById(id) {
        return await MegaRewardSettings.findById(id)
            .populate('createdBy', 'name email');
    }

    /**
     * Delete a campaign
     */
    async deleteSettings(id) {
        const settings = await MegaRewardSettings.findById(id);

        if (!settings) {
            throw new Error('Mega Reward settings not found');
        }

        // Don't allow deleting active campaign
        if (settings.isActive) {
            throw new Error('Cannot delete active campaign. Deactivate it first.');
        }

        return await MegaRewardSettings.findByIdAndDelete(id);
    }

    /**
     * Check if a campaign is currently running (within date range)
     */
    async isActiveCampaignRunning() {
        const now = new Date();
        const settings = await MegaRewardSettings.findOne({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        return !!settings;
    }
}

export default new MegaRewardSettingsService();
