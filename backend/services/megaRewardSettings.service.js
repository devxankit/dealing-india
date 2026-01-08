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

        // Restriction: If campaign status is active and it has already started, block updates
        const now = new Date();
        if (existing.isActive && existing.startDate <= now) {
            // Check if they are trying to change anything other than deactivating it
            // Actually, user said block all updates. Let's see if we should allow deactivation.
            // If they only change isActive to false, maybe it's okay? 
            // But user said "change nhi kar skta update nhi kar skt h".
            // Let's stick to the user's request: Block if started.
            throw new Error('Campaign has already started. Editing is disabled to ensure fairness.');
        }

        // If activating this campaign, deactivate others
        if (data.isActive) {
            await MegaRewardSettings.updateMany(
                { _id: { $ne: id }, isActive: true },
                { isActive: false }
            );
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
     * Get the currently active campaign
     */
    async getActiveSettings() {
        const settings = await MegaRewardSettings.findOne({ isActive: true })
            .populate('createdBy', 'name email');

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
