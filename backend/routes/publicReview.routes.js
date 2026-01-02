import express from 'express';
import { createReview, getProductReviews } from '../controllers/public-controllers/publicReview.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public routes - no authentication required for viewing reviews
// Authentication optional for creating reviews (can be anonymous)
router.get('/product/:productId', asyncHandler(getProductReviews));
router.post('/', asyncHandler(createReview));

export default router;

