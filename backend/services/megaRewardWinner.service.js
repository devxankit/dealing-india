import MegaRewardWinner from '../models/MegaRewardWinner.model.js';
import MegaRewardEntry from '../models/MegaRewardEntry.model.js';
import MegaRewardSettings from '../models/MegaRewardSettings.model.js';
import Wallet from '../models/Wallet.model.js';
import WalletTransaction from '../models/WalletTransaction.model.js';
import Notification from '../models/Notification.model.js';
import mongoose from 'mongoose';

/**
 * MegaRewardWinner Service
 * Handles winner selection and prize distribution
 */
class MegaRewardWinnerService {
    /**
     * Declare a winner for a specific prize rank
     * Uses MongoDB transactions for safety
     */
    async declareWinner(megaRewardId, prizeRank, adminId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get the campaign settings
            const settings = await MegaRewardSettings.findById(megaRewardId).session(session);

            if (!settings) {
                throw new Error('Mega Reward campaign not found');
            }

            // Find the prize configuration for this rank
            const prizeConfig = settings.prizes.find(p => p.rank === prizeRank);

            if (!prizeConfig) {
                throw new Error(`Prize rank "${prizeRank}" not found in campaign`);
            }

            // Get already selected winner user IDs for this campaign
            const existingWinners = await MegaRewardWinner.find({ megaRewardId }).session(session);
            const winnerUserIds = existingWinners.map(w => w.userId.toString());

            // Check how many winners already exist for this prize rank
            const existingRankWinners = existingWinners.filter(w => w.prizeRank === prizeRank);
            const remainingSlots = prizeConfig.winnerCount - existingRankWinners.length;

            if (remainingSlots <= 0) {
                throw new Error(`All ${prizeConfig.winnerCount} winners for "${prizeRank}" have been declared`);
            }

            // Get eligible entries (active status, not already winners)
            const eligibleEntries = await MegaRewardEntry.find({
                megaRewardId,
                status: 'active',
                userId: { $nin: winnerUserIds.map(id => new mongoose.Types.ObjectId(id)) }
            }).session(session);

            if (eligibleEntries.length === 0) {
                throw new Error('No eligible entries available for winner selection');
            }

            // Randomly select a winner
            const randomIndex = Math.floor(Math.random() * eligibleEntries.length);
            const selectedEntry = eligibleEntries[randomIndex];

            // Mark entry as winner
            await MegaRewardEntry.findByIdAndUpdate(
                selectedEntry._id,
                { status: 'winner' },
                { session }
            );

            // Credit wallet
            const walletResult = await this.creditWallet(
                selectedEntry.userId,
                prizeConfig.amount,
                megaRewardId,
                prizeRank,
                session
            );

            // Create winner record
            const winner = await MegaRewardWinner.create([{
                entryId: selectedEntry._id,
                userId: selectedEntry.userId,
                megaRewardId,
                prizeRank,
                prizeAmount: prizeConfig.amount,
                prizeDescription: prizeConfig.description,
                walletTransactionId: walletResult.transactionId,
                declaredBy: adminId
            }], { session });

            // Send notification
            await this.sendWinnerNotification(
                selectedEntry.userId,
                prizeRank,
                prizeConfig.amount,
                settings.prizeTitle,
                selectedEntry.ticketId,
                session
            );

            await session.commitTransaction();

            return winner[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Credit prize amount to user's wallet
     */
    async creditWallet(userId, amount, megaRewardId, prizeRank, session) {
        // Find or create wallet
        let wallet = await Wallet.findOne({ userId }).session(session);

        if (!wallet) {
            wallet = await Wallet.create([{ userId, balance: 0 }], { session });
            wallet = wallet[0];
        }

        // Update wallet balance
        wallet.balance += amount;
        await wallet.save({ session });

        // Create transaction record
        const transaction = await WalletTransaction.create([{
            walletId: wallet._id,
            userId,
            type: 'credit',
            amount,
            description: `Mega Reward - ${prizeRank} Prize`,
            referenceId: megaRewardId.toString(),
            referenceType: 'mega_reward',
            status: 'completed'
        }], { session });

        return { wallet, transactionId: transaction[0]._id };
    }

    /**
     * Send notification to winner
     */
    async sendWinnerNotification(userId, prizeRank, amount, campaignTitle, ticketId, session) {
        await Notification.create([{
            recipientId: userId,
            recipientType: 'user',
            recipientTypeModel: 'User',
            type: 'mega_reward_winner',
            title: '🏆 Congratulations! You Won!',
            message: `Amazing news! Your ticket ${ticketId} won the ${prizeRank} in ${campaignTitle}! ₹${amount.toLocaleString()} has been credited to your wallet.`,
            actionUrl: '/app/wallet',
            metadata: {
                prizeRank,
                amount,
                ticketId
            }
        }], { session });

        return true;
    }

    /**
     * Get all winners for a campaign
     */
    async getWinners(megaRewardId) {
        return await MegaRewardWinner.find({ megaRewardId })
            .populate('userId', 'name email phone')
            .populate('entryId', 'ticketId')
            .populate('declaredBy', 'name')
            .sort({ declaredAt: -1 });
    }

    /**
     * Get all winners (across all campaigns)
     */
    async getAllWinners() {
        return await MegaRewardWinner.find()
            .populate('userId', 'name email phone')
            .populate('entryId', 'ticketId')
            .populate('megaRewardId', 'prizeTitle')
            .populate('declaredBy', 'name')
            .sort({ declaredAt: -1 });
    }

    /**
     * Get winner selection status for a campaign
     */
    async getWinnerStatus(megaRewardId) {
        const settings = await MegaRewardSettings.findById(megaRewardId);
        const winners = await MegaRewardWinner.find({ megaRewardId });

        const status = settings.prizes.map(prize => {
            const prizeWinners = winners.filter(w => w.prizeRank === prize.rank);
            return {
                rank: prize.rank,
                amount: prize.amount,
                totalSlots: prize.winnerCount,
                declared: prizeWinners.length,
                remaining: prize.winnerCount - prizeWinners.length,
                winners: prizeWinners
            };
        });

        return status;
    }
}

export default new MegaRewardWinnerService();
