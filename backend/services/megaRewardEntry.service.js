import MegaRewardEntry from '../models/MegaRewardEntry.model.js';
import MegaRewardSettings from '../models/MegaRewardSettings.model.js';
import MegaRewardShareLink from '../models/MegaRewardShareLink.model.js';
import Notification from '../models/Notification.model.js';

/**
 * MegaRewardEntry Service
 * Handles ticket/entry management
 */
class MegaRewardEntryService {
    /**
     * Generate a ticket for a user if all eligibility conditions are met
     */
    async generateTicket(userId, reelId) {
        // Get active campaign
        const activeSettings = await MegaRewardSettings.findOne({ isActive: true });

        if (!activeSettings) {
            throw new Error('No active Mega Reward campaign');
        }

        // Check if user already has an entry for this campaign
        const existingEntry = await MegaRewardEntry.findOne({
            userId,
            megaRewardId: activeSettings._id
        });

        if (existingEntry) {
            return { entry: existingEntry, isNew: false };
        }

        // Get all share links for this user and reel
        const shareLinks = await MegaRewardShareLink.find({
            userId,
            reelId,
            megaRewardId: activeSettings._id
        });

        // Check eligibility for each platform
        const eligibility = {
            whatsapp: false,
            instagram: false,
            facebook: false
        };

        for (const link of shareLinks) {
            eligibility[link.platform] = link.isEligible;
        }

        // All conditions must be met
        if (!eligibility.whatsapp || !eligibility.instagram || !eligibility.facebook) {
            throw new Error('Eligibility conditions not met for all platforms');
        }

        // Create the entry
        const entry = await MegaRewardEntry.create({
            userId,
            megaRewardId: activeSettings._id,
            reelId,
            eligibilityMet: eligibility,
            status: 'active'
        });

        // Send notification to user
        await Notification.create({
            recipientId: userId,
            recipientType: 'user',
            recipientTypeModel: 'User',
            type: 'mega_reward_ticket_generated',
            title: '🎉 Mega Reward Ticket Generated!',
            message: `Congratulations! Your ticket ${entry.ticketId} has been generated for the ${activeSettings.prizeTitle}. Good luck!`,
            actionUrl: '/app/mega-reward'
        });

        return { entry, isNew: true };
    }

    /**
     * Get user's entry for the active campaign
     */
    async getUserEntry(userId) {
        const activeSettings = await MegaRewardSettings.findOne({ isActive: true });

        if (!activeSettings) {
            return null;
        }

        return await MegaRewardEntry.findOne({
            userId,
            megaRewardId: activeSettings._id
        })
            .populate('userId', 'name email phone')
            .populate('reelId', 'title');
    }

    /**
     * Get all entries for admin view with pagination
     */
    async getEntriesForAdmin(megaRewardId, options = {}) {
        const { page = 1, limit = 20, search = '', status = '' } = options;

        const query = { megaRewardId };

        if (status) {
            query.status = status;
        }

        let entries = await MegaRewardEntry.find(query)
            .populate('userId', 'name email phone')
            .populate('reelId', 'title')
            .sort({ generatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Filter by search if provided
        if (search) {
            const searchLower = search.toLowerCase();
            entries = entries.filter(entry =>
                entry.userId?.name?.toLowerCase().includes(searchLower) ||
                entry.userId?.email?.toLowerCase().includes(searchLower) ||
                entry.ticketId?.toLowerCase().includes(searchLower)
            );
        }

        const total = await MegaRewardEntry.countDocuments(query);

        return {
            entries,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get entry statistics for dashboard
     */
    async getEntryStats(megaRewardId) {
        const [total, active, winners] = await Promise.all([
            MegaRewardEntry.countDocuments({ megaRewardId }),
            MegaRewardEntry.countDocuments({ megaRewardId, status: 'active' }),
            MegaRewardEntry.countDocuments({ megaRewardId, status: 'winner' })
        ]);

        return { total, active, winners };
    }

    /**
     * Get a single entry by ID
     */
    async getEntryById(id) {
        return await MegaRewardEntry.findById(id)
            .populate('userId', 'name email phone')
            .populate('reelId', 'title')
            .populate('megaRewardId', 'prizeTitle');
    }

    /**
     * Mark an entry as winner
     */
    async markAsWinner(entryId) {
        return await MegaRewardEntry.findByIdAndUpdate(
            entryId,
            { status: 'winner' },
            { new: true }
        );
    }
}

export default new MegaRewardEntryService();
