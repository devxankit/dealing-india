import express from 'express';
import {
    getWalletAnalytics,
    getAllWalletTransactions,
} from '../controllers/admin-controllers/wallet.admin.controller.js';
import { authenticate, adminOnly } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(adminOnly);

// Get wallet recharge analytics
router.get('/analytics', asyncHandler(getWalletAnalytics));

// Get all wallet transactions
router.get('/transactions', asyncHandler(getAllWalletTransactions));

export default router;
