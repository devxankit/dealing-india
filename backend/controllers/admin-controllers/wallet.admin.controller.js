import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Admin Wallet Controller - DISABLED (B2C REMOVAL)
 */

export const getWalletAnalytics = async (req, res, next) => {
    res.status(200).json({
        success: true,
        data: {
            total: { count: 0, amount: 0, avgAmount: 0 },
            today: { count: 0, amount: 0 },
            thisWeek: { count: 0, amount: 0 },
            thisMonth: { count: 0, amount: 0 },
        },
    });
};

export const getAllWalletTransactions = async (req, res, next) => {
    res.status(200).json({
        success: true,
        data: {
            transactions: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        },
    });
};

