import express from 'express';
import {
    createSecureDeal,
    getSellerSecureDeals,
    getBuyerSecureDeals,
    updateSecureDealStatus,
} from '../controllers/secureDeal.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All secure deal routes require authentication
router.use(authenticate);

// Buyer routes
router.post('/', asyncHandler(createSecureDeal));
router.get('/buyer', asyncHandler(getBuyerSecureDeals));

// Seller routes
router.get('/seller', asyncHandler(getSellerSecureDeals));
router.patch('/:id/status', asyncHandler(updateSecureDealStatus));

export default router;
