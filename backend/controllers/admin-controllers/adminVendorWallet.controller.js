import VendorWalletService from '../../services/vendorWallet.service.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Get all vendor wallets with balances (Admin)
 */
export const getAllVendorWallets = asyncHandler(async (req, res) => {
    // Ideally this would be paginated in a production app
    const wallets = await VendorWalletService.getAllVendorWallets();
    res.status(200).json({
        success: true,
        data: wallets
    });
});

/**
 * Get specific vendor wallet (Admin)
 */
export const getVendorWallet = asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const wallet = await VendorWalletService.getVendorWallet(vendorId);
    res.status(200).json({
        success: true,
        data: wallet
    });
});

/**
 * Get pending withdrawal requests (Admin)
 */
export const getPendingWithdrawals = asyncHandler(async (req, res) => {
    const requests = await VendorWalletService.getPendingWithdrawals();
    const stats = await VendorWalletService.getAdminStats();

    res.status(200).json({
        success: true,
        data: {
            requests,
            stats
        }
    });
});

/**
 * Approve withdrawal request (Admin)
 */
export const approveWithdrawal = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { notes, transactionId } = req.body;
    const adminId = req.user.adminId;

    const request = await VendorWalletService.approveWithdrawal(requestId, adminId, notes, transactionId);

    res.status(200).json({
        success: true,
        message: 'Withdrawal request approved and processed',
        data: request
    });
});

/**
 * Reject withdrawal request (Admin)
 */
export const rejectWithdrawal = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.adminId;

    const request = await VendorWalletService.rejectWithdrawal(requestId, adminId, reason);

    res.status(200).json({
        success: true,
        message: 'Withdrawal request rejected',
        data: request
    });
});

/**
 * Get withdrawal reports (Admin)
 */
export const getReports = asyncHandler(async (req, res) => {
    const { status, startDate, endDate, vendorId } = req.query;
    const reports = await VendorWalletService.getWithdrawalReports({ status, startDate, endDate, vendorId });

    res.status(200).json({
        success: true,
        data: reports
    });
});
