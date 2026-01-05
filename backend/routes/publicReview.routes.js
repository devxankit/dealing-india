import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as reviewController from '../controllers/public-controllers/review.controller.js';

const router = express.Router();

// Public routes (Get reviews)
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes (Create review, Check eligibility)
router.post('/', authenticate, reviewController.createReview);
router.get('/check/:productId', authenticate, reviewController.checkEligibility);

export default router;
