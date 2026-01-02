import express from 'express';
import { getProducts, getProduct } from '../controllers/public-controllers/publicProduct.controller.js';
import { getRecommended } from '../controllers/public-controllers/recommendedProducts.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/', asyncHandler(getProducts));
// Recommended products - authentication optional (better recommendations if logged in)
// Route should be before /:id to avoid matching "recommended" as an ID
router.get('/recommended', asyncHandler(getRecommended));
router.get('/:id', asyncHandler(getProduct));

export default router;

