
import express from 'express';
import { validatePromoCode, getAvailableCoupons } from '../controllers/public-controllers/publicPromoCode.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public Routes (Optional Auth for user ID tracking if available, but technically public endpoint)
// Note: In Checkout.jsx, user might be guest.
router.post('/validate', validatePromoCode);
router.get('/available', getAvailableCoupons);

export default router;
