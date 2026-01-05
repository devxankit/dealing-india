import VendorWalletService from '../../services/vendorWallet.service.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Get vendor wallet balance and stats
 */
export const getWallet = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId;
    const wallet = await VendorWalletService.getOrCreateWallet(vendorId);

    res.status(200).json({
        success: true,
        data: wallet
    });
});

/**
 * Request full balance withdrawal
 */
export const requestWithdrawal = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId;
    const request = await VendorWalletService.requestWithdrawal(vendorId);

    res.status(201).json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        data: request
    });
});

/**
 * Get vendor withdrawal history
 */
export const getWithdrawals = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId;
    const { status } = req.query;
    const withdrawals = await VendorWalletService.getVendorWithdrawals(vendorId, status);

    res.status(200).json({
        success: true,
        data: withdrawals
    });
});

/**
 * Get vendor transaction history
 */
export const getTransactions = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId;
    const transactions = await VendorWalletService.getVendorTransactions(vendorId);

    res.status(200).json({
        success: true,
        data: transactions
    });
});
