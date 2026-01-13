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
        let session = null;
        try {
            // Attempt to start a session if possible (may fail on standalone DB)
            try {
                session = await mongoose.startSession();
                session.startTransaction();
                console.log('[MegaRewardWinnerService] Transaction started');
            } catch (sessionError) {
                console.warn('[MegaRewardWinnerService] Transactions not supported, proceeding without transaction');
                session = null;
            }

            const options = session ? { session } : {};

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

            // Get already selected winner user IDs for this campaign (excluding range winners for now)
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

            console.log(`[MegaRewardWinnerService] Found ${eligibleEntries.length} eligible entries`);

            // Randomly select a winner
            const randomIndex = Math.floor(Math.random() * eligibleEntries.length);
            const selectedEntry = eligibleEntries[randomIndex];

            // Mark entry as winner
            await MegaRewardEntry.findByIdAndUpdate(
                selectedEntry._id,
                { status: 'winner' },
                options
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
            }], options);

            // Send notification
            await this.sendWinnerNotification(
                selectedEntry.userId,
                prizeRank,
                prizeConfig.amount,
                settings.prizeTitle,
                selectedEntry.ticketId,
                session
            );

            if (session) {
                await session.commitTransaction();
                console.log('[MegaRewardWinnerService] Transaction committed');
            }

            return winner[0];
        } catch (error) {
            console.error('[MegaRewardWinnerService] declareWinner Error:', error);
            if (session) await session.abortTransaction();
            throw error;
        } finally {
            if (session) session.endSession();
        }
    }

    /**
     * Declare a winner manually (for 1st, 2nd, 3rd)
     */
    async declareManualWinner(megaRewardId, entryId, prizeRank, adminId) {
        let session = null;
        try {
            try {
                session = await mongoose.startSession();
                session.startTransaction();
            } catch (sessionError) {
                session = null;
            }

            const options = session ? { session } : {};

            const settings = await MegaRewardSettings.findById(megaRewardId).session(session);
            if (!settings) throw new Error('Mega Reward campaign not found');

            const prizeConfig = settings.prizes.find(p => p.rank === prizeRank);
            if (!prizeConfig) throw new Error(`Prize rank "${prizeRank}" not found`);

            const existingWinners = await MegaRewardWinner.find({ megaRewardId }).session(session);
            if (existingWinners.some(w => w.prizeRank === prizeRank)) {
                throw new Error(`Winner for "${prizeRank}" already declared`);
            }

            const entry = await MegaRewardEntry.findById(entryId).session(session);
            if (!entry || entry.status !== 'active') throw new Error('Invalid or inactive entry');

            if (existingWinners.some(w => w.userId.toString() === entry.userId.toString())) {
                throw new Error('This user has already won a prize in this campaign');
            }

            // Mark entry as winner
            await MegaRewardEntry.findByIdAndUpdate(entryId, { status: 'winner' }, options);

            // Credit wallet
            const walletResult = await this.creditWallet(
                entry.userId,
                prizeConfig.amount,
                megaRewardId,
                prizeRank,
                session
            );

            // Create winner record
            const winner = await MegaRewardWinner.create([{
                entryId: entry._id,
                userId: entry.userId,
                megaRewardId,
                prizeRank,
                prizeAmount: prizeConfig.amount,
                prizeDescription: prizeConfig.description,
                walletTransactionId: walletResult.transactionId,
                declaredBy: adminId
            }], options);

            // Send notification
            await this.sendWinnerNotification(
                entry.userId,
                prizeRank,
                prizeConfig.amount,
                settings.prizeTitle,
                entry.ticketId,
                session
            );

            if (session) await session.commitTransaction();
            return winner[0];
        } catch (error) {
            console.error('[MegaRewardWinnerService] declareManualWinner Error:', error);
            if (session) await session.abortTransaction();
            throw error;
        } finally {
            if (session) session.endSession();
        }
    }

    /**
     * Declare winners for a range randomly
     */
    async declareRangeWinners(megaRewardId, rangeIndex, adminId) {
        let session = null;
        try {
            try {
                session = await mongoose.startSession();
                session.startTransaction();
            } catch (sessionError) {
                session = null;
            }

            const options = session ? { session } : {};

            const settings = await MegaRewardSettings.findById(megaRewardId).session(session);
            if (!settings) throw new Error('Mega Reward campaign not found');

            const range = settings.customRanges[rangeIndex];
            if (!range) throw new Error('Range configuration not found');

            const numWinnersToSelect = range.endRank - range.startRank + 1;
            const prizeRankBase = `${range.startRank}th-${range.endRank}th Prize`;

            // Check existing winners for this range
            const existingWinners = await MegaRewardWinner.find({
                megaRewardId,
                prizeRank: { $regex: new RegExp(`^${range.startRank}th-${range.endRank}th`) }
            }).session(session);

            if (existingWinners.length >= numWinnersToSelect) {
                throw new Error('Winners for this range already declared');
            }

            const alreadyWinnerUserIds = (await MegaRewardWinner.find({ megaRewardId }).session(session)).map(w => w.userId);

            const eligibleEntries = await MegaRewardEntry.find({
                megaRewardId,
                status: 'active',
                userId: { $nin: alreadyWinnerUserIds }
            }).session(session);

            if (eligibleEntries.length < numWinnersToSelect) {
                throw new Error(`Only ${eligibleEntries.length} eligible entries available, need ${numWinnersToSelect}`);
            }

            // Shuffle and pick winners
            const shuffled = eligibleEntries.sort(() => 0.5 - Math.random());
            const selectedWinners = shuffled.slice(0, numWinnersToSelect);

            const results = [];
            for (let i = 0; i < selectedWinners.length; i++) {
                const entry = selectedWinners[i];
                const rankDisplay = `${range.startRank + i}${getOrdinalSuffix(range.startRank + i)} Prize`;

                await MegaRewardEntry.findByIdAndUpdate(entry._id, { status: 'winner' }, options);

                const walletResult = await this.creditWallet(
                    entry.userId,
                    range.prizeAmount,
                    megaRewardId,
                    rankDisplay,
                    session
                );

                const winner = await MegaRewardWinner.create([{
                    entryId: entry._id,
                    userId: entry.userId,
                    megaRewardId,
                    prizeRank: rankDisplay,
                    prizeAmount: range.prizeAmount,
                    prizeDescription: range.description,
                    walletTransactionId: walletResult.transactionId,
                    declaredBy: adminId
                }], options);

                await this.sendWinnerNotification(
                    entry.userId,
                    rankDisplay,
                    range.prizeAmount,
                    settings.prizeTitle,
                    entry.ticketId,
                    session
                );

                results.push(winner[0]);
            }

            if (session) await session.commitTransaction();
            return results;
        } catch (error) {
            console.error('[MegaRewardWinnerService] declareRangeWinners Error:', error);
            if (session) await session.abortTransaction();
            throw error;
        } finally {
            if (session) session.endSession();
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
        const winners = await MegaRewardWinner.find({ megaRewardId }).populate('userId', 'name email').populate('entryId', 'ticketId');

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

        // Add range status
        const rangeStatus = settings.customRanges.map((range, index) => {
            const rangePrefix = new RegExp(`^(\\d+)(st|nd|rd|th) Prize$`);
            const rangeWinners = winners.filter(w => {
                const match = w.prizeRank.match(rangePrefix);
                if (match) {
                    const rankNum = parseInt(match[1]);
                    return rankNum >= range.startRank && rankNum <= range.endRank;
                }
                return false;
            });

            const totalSlots = range.endRank - range.startRank + 1;
            return {
                rank: `${range.startRank}th-${range.endRank}th Prize`,
                amount: range.prizeAmount,
                totalSlots,
                declared: rangeWinners.length,
                remaining: totalSlots - rangeWinners.length,
                winners: rangeWinners,
                isRange: true,
                rangeIndex: index
            };
        });

        return [...status, ...rangeStatus];
    }
}

function getOrdinalSuffix(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return "st";
    }
    if (j == 2 && k != 12) {
        return "nd";
    }
    if (j == 3 && k != 13) {
        return "rd";
    }
    return "th";
}

export default new MegaRewardWinnerService();
