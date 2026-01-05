import express from 'express';
import {
    getPendingWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    getReports,
    getAllVendorWallets,
    getVendorWallet
} from '../controllers/admin-controllers/adminVendorWallet.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Get pending withdrawals and admin stats
router.get('/pending-withdrawals', asyncHandler(getPendingWithdrawals));

// Get withdrawal reports
router.get('/reports', asyncHandler(getReports));

// Get all vendor wallets
router.get('/', asyncHandler(getAllVendorWallets));

// Get specific vendor wallet
router.get('/:vendorId', asyncHandler(getVendorWallet));

// Approve withdrawal
router.post('/:requestId/approve', asyncHandler(approveWithdrawal));

// Reject withdrawal
router.post('/:requestId/reject', asyncHandler(rejectWithdrawal));

export default router;
