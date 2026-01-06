import VendorWallet from '../models/VendorWallet.model.js';
import WithdrawalRequest from '../models/WithdrawalRequest.model.js';
import VendorWalletTransaction from '../models/VendorWalletTransaction.model.js';
import mongoose from 'mongoose';

class VendorWalletService {
    /**
     * Get or create a wallet for a vendor
     */
    async getOrCreateWallet(vendorId) {
        let wallet = await VendorWallet.findOne({ vendorId });
        if (!wallet) {
            wallet = await VendorWallet.create({
                vendorId,
                balance: 0,
                pendingBalance: 0
            });
        }
        return wallet;
    }

    /**
     * Credit vendor wallet (e.g., from order settlement)
     */
    async creditWallet(vendorId, amount, description, referenceId, referenceType = 'order') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);
            const balanceBefore = wallet.balance;
            wallet.balance += amount;
            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'credit',
                amount,
                balanceBefore,
                balanceAfter: wallet.balance,
                description,
                referenceId,
                referenceType,
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Credit pending vendor wallet (during return window)
     */
    async creditPendingWallet(vendorId, amount, description, referenceId, referenceType = 'order') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);
            const pendingBalanceBefore = wallet.pendingBalance;
            wallet.pendingBalance += amount;
            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'credit',
                amount,
                balanceBefore: pendingBalanceBefore,
                balanceAfter: wallet.pendingBalance,
                description: `(Pending) ${description}`,
                referenceId,
                referenceType,
                metadata: { isPending: true }
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Release pending funds to available balance
     */
    async releasePendingFunds(vendorId, amount, description, referenceId, referenceType = 'order') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);

            if (wallet.pendingBalance < amount) {
                console.warn(`Insufficient pending balance for release. Vendor: ${vendorId}, Required: ${amount}, Available: ${wallet.pendingBalance}`);
            }

            const pendingBefore = wallet.pendingBalance;
            const balanceBefore = wallet.balance;

            wallet.pendingBalance -= amount;
            wallet.balance += amount;

            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'credit',
                amount,
                balanceBefore,
                balanceAfter: wallet.balance,
                description: `Funds Released: ${description}`,
                referenceId,
                referenceType,
                metadata: { wasReleasedFromPending: true }
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Debit vendor wallet (prioritizing pending balance, then main balance)
     */
    async debitPendingOrBalance(vendorId, amount, description, referenceId, referenceType = 'refund') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);

            let debitedFrom = 'balance';
            let balanceBefore = wallet.balance;
            let balanceAfter = wallet.balance;

            // Try debiting from pending balance first (since returns usually happen within the window)
            if (wallet.pendingBalance >= amount) {
                balanceBefore = wallet.pendingBalance;
                wallet.pendingBalance -= amount;
                balanceAfter = wallet.pendingBalance;
                debitedFrom = 'pendingBalance';
            } else if (wallet.balance >= amount) {
                // Fallback to main balance
                wallet.balance -= amount;
                balanceAfter = wallet.balance;
            } else {
                // Insufficient funds in both (allow negative balance? policy decision)
                // For now, allow negative main balance to ensure customer gets refund
                wallet.balance -= amount;
                balanceAfter = wallet.balance;
            }

            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'debit',
                amount,
                balanceBefore,
                balanceAfter,
                description: `${description} (from ${debitedFrom === 'pendingBalance' ? 'Pending' : 'Available'})`,
                referenceId,
                referenceType,
                metadata: { source: debitedFrom }
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Debit vendor wallet (e.g., for refunds/returns)
     */
    async debitWallet(vendorId, amount, description, referenceId, referenceType = 'refund') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const wallet = await this.getOrCreateWallet(vendorId);

            // Check balance (optional: allow negative balance for refunds? usually yes, to be preserved from next settlement)
            // For now, we allow negative balance for refunds as vendors might have withdrawn everything

            const balanceBefore = wallet.balance;
            wallet.balance -= amount;
            await wallet.save({ session });

            await VendorWalletTransaction.create([{
                vendorId,
                type: 'debit',
                amount,
                balanceBefore,
                balanceAfter: wallet.balance,
                description,
                referenceId,
                referenceType,
            }], { session });

            await session.commitTransaction();
            return wallet;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Request withdrawal (full balance only)
     */
    async requestWithdrawal(vendorId) {
        const wallet = await this.getOrCreateWallet(vendorId);
        if (wallet.balance <= 0) {
            throw new Error('Insufficient balance for withdrawal');
        }

        // Check if there's already a pending request
        const pendingRequest = await WithdrawalRequest.findOne({ vendorId, status: 'pending' });
        if (pendingRequest) {
            throw new Error('You already have a pending withdrawal request');
        }

        const amount = wallet.balance;

        const request = await WithdrawalRequest.create({
            vendorId,
            amount,
            status: 'pending',
        });

        return request;
    }

    /**
     * Approve withdrawal request (Admin)
     */
    async approveWithdrawal(requestId, adminId, notes, transactionId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const request = await WithdrawalRequest.findById(requestId).session(session);
            if (!request) throw new Error('Withdrawal request not found');
            if (request.status !== 'pending') throw new Error('Request already processed');

            const wallet = await VendorWallet.findOne({ vendorId: request.vendorId }).session(session);
            if (!wallet) throw new Error('Vendor wallet not found');
            if (wallet.balance < request.amount) throw new Error('Insufficient wallet balance');

            const balanceBefore = wallet.balance;
            wallet.balance -= request.amount;
            wallet.totalWithdrawn += request.amount;
            wallet.lastWithdrawalDate = new Date();
            await wallet.save({ session });

            // Record transaction
            await VendorWalletTransaction.create([{
                vendorId: request.vendorId,
                type: 'withdrawal',
                amount: request.amount,
                balanceBefore,
                balanceAfter: wallet.balance,
                description: `Withdrawal approved: ${transactionId || 'N/A'}`,
                referenceId: request._id.toString(),
                referenceType: 'withdrawal',
                performedBy: adminId,
                performedByModel: 'Admin',
            }], { session });

            // Update request
            request.status = 'approved';
            request.processedAt = new Date();
            request.processedBy = adminId;
            request.adminNotes = notes;
            request.transactionId = transactionId;
            await request.save({ session });

            await session.commitTransaction();
            return request;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Reject withdrawal request (Admin)
     */
    async rejectWithdrawal(requestId, adminId, reason) {
        const request = await WithdrawalRequest.findById(requestId);
        if (!request) throw new Error('Withdrawal request not found');
        if (request.status !== 'pending') throw new Error('Request already processed');

        request.status = 'rejected';
        request.processedAt = new Date();
        request.processedBy = adminId;
        request.rejectionReason = reason;
        await request.save();

        return request;
    }

    /**
     * Get withdrawal history for a vendor
     */
    async getVendorWithdrawals(vendorId, status = null) {
        const query = { vendorId };
        if (status) query.status = status;
        return await WithdrawalRequest.find(query).sort({ requestedAt: -1 });
    }

    /**
     * Get transaction history for a vendor
     */
    async getVendorTransactions(vendorId) {
        return await VendorWalletTransaction.find({ vendorId }).sort({ createdAt: -1 });
    }

    /**
     * Get all pending withdrawals (Admin)
     */
    async getPendingWithdrawals() {
        return await WithdrawalRequest.find({ status: 'pending' })
            .populate('vendorId', 'name storeName')
            .sort({ requestedAt: 1 });
    }

    /**
     * Get withdrawal reports (Admin)
     */
    async getWithdrawalReports(filters = {}) {
        const query = {};
        if (filters.status) query.status = filters.status;
        if (filters.startDate && filters.endDate) {
            query.requestedAt = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
        }
        if (filters.vendorId) query.vendorId = filters.vendorId;

        return await WithdrawalRequest.find(query)
            .populate('vendorId', 'name storeName')
            .sort({ requestedAt: -1 });
    }

    /**
     * Get wallet dashboard stats (Admin)
     */
    async getAdminStats() {
        const totalWithdrawn = await WithdrawalRequest.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const pendingCount = await WithdrawalRequest.countDocuments({ status: 'pending' });
        const processedToday = await WithdrawalRequest.countDocuments({
            status: { $in: ['approved', 'rejected'] },
            processedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        return {
            totalWithdrawn: totalWithdrawn[0]?.total || 0,
            pendingCount,
            processedToday
        };
    }
    /**
     * Get all vendor wallets (Admin)
     */
    async getAllVendorWallets() {
        return await VendorWallet.find()
            .populate('vendorId', 'name storeName email phone')
            .sort({ balance: -1 });
    }

    /**
     * Get specific vendor wallet (Admin)
     */
    async getVendorWallet(vendorId) {
        return await this.getOrCreateWallet(vendorId);
    }
}

export default new VendorWalletService();
