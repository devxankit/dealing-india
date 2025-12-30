import express from 'express';
import { getProducts, getProduct } from '../controllers/public-controllers/publicProduct.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProduct));

export default router;

