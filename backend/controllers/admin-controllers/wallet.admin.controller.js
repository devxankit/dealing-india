import WalletTransaction from '../../models/WalletTransaction.model.js';
import User from '../../models/User.model.js';
import mongoose from 'mongoose';

/**
 * Get wallet recharge analytics
 * @returns {Object} Analytics data
 */
export const getWalletAnalytics = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        // Build date filter
        const dateFilter = { type: 'credit', referenceType: 'razorpay_recharge' };
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }

        // Get total recharges count and amount
        const totalStats = await WalletTransaction.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalCount: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    avgAmount: { $avg: '$amount' },
                },
            },
        ]);

        // Get today's recharges
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayStats = await WalletTransaction.aggregate([
            {
                $match: {
                    type: 'credit',
                    referenceType: 'razorpay_recharge',
                    createdAt: { $gte: todayStart, $lte: todayEnd },
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' },
                },
            },
        ]);

        // Get this week's recharges
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);

        const weekStats = await WalletTransaction.aggregate([
            {
                $match: {
                    type: 'credit',
                    referenceType: 'razorpay_recharge',
                    createdAt: { $gte: weekStart },
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' },
                },
            },
        ]);

        // Get this month's recharges
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthStats = await WalletTransaction.aggregate([
            {
                $match: {
                    type: 'credit',
                    referenceType: 'razorpay_recharge',
                    createdAt: { $gte: monthStart },
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' },
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data: {
                total: {
                    count: totalStats[0]?.totalCount || 0,
                    amount: totalStats[0]?.totalAmount || 0,
                    avgAmount: totalStats[0]?.avgAmount || 0,
                },
                today: {
                    count: todayStats[0]?.count || 0,
                    amount: todayStats[0]?.amount || 0,
                },
                thisWeek: {
                    count: weekStats[0]?.count || 0,
                    amount: weekStats[0]?.amount || 0,
                },
                thisMonth: {
                    count: monthStats[0]?.count || 0,
                    amount: monthStats[0]?.amount || 0,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all wallet transactions for admin
 * @returns {Object} Paginated transactions
 */
export const getAllWalletTransactions = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            type,
            referenceType,
            status,
            startDate,
            endDate,
            search,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter
        const filter = {};

        // Default to recharges only
        if (referenceType) {
            filter.referenceType = referenceType;
        } else {
            filter.referenceType = 'razorpay_recharge';
        }

        if (type) filter.type = type;
        if (status) filter.status = status;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // If search, find user IDs first
        let userIds = null;
        if (search) {
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                ],
            }).select('_id');
            userIds = users.map(u => u._id);
            filter.userId = { $in: userIds };
        }

        // Get transactions
        const transactions = await WalletTransaction.find(filter)
            .populate('userId', 'name email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await WalletTransaction.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                transactions: transactions.map(t => ({
                    id: t._id,
                    userId: t.userId?._id,
                    userName: t.userId?.name || 'Unknown',
                    userEmail: t.userId?.email,
                    userPhone: t.userId?.phone,
                    type: t.type,
                    amount: t.amount,
                    description: t.description,
                    referenceId: t.referenceId,
                    referenceType: t.referenceType,
                    status: t.status,
                    createdAt: t.createdAt,
                })),
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
