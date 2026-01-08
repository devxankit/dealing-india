import express from 'express';
import {
  getWallet,
  getTransactions,
  addMoneyController,
  initiateAddMoneyController,
  verifyAddMoneyController,
} from '../controllers/user-controllers/wallet.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get wallet balance and stats
router.get('/', asyncHandler(getWallet));

// Get wallet transactions
router.get('/transactions', asyncHandler(getTransactions));

// Add money to wallet (legacy - direct add)
router.post('/add-money', asyncHandler(addMoneyController));

// Initiate wallet recharge via Razorpay
router.post('/initiate-add-money', asyncHandler(initiateAddMoneyController));

// Verify wallet recharge payment
router.post('/verify-add-money', asyncHandler(verifyAddMoneyController));

export default router;
