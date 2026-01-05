import express from 'express';
import {
    getWallet,
    requestWithdrawal,
    getWithdrawals,
    getTransactions
} from '../controllers/vendor-controllers/vendorWallet.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Get wallet balance and stats
router.get('/', asyncHandler(getWallet));

// Request withdrawal (full balance only)
router.post('/withdraw', asyncHandler(requestWithdrawal));

// Get withdrawal requests
router.get('/withdrawals', asyncHandler(getWithdrawals));

// Get transaction history
router.get('/transactions', asyncHandler(getTransactions));

export default router;
