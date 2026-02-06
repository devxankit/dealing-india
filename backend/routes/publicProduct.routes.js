import express from 'express';
import { getProducts, getProduct, getB2BSuggestions } from '../controllers/public-controllers/publicProduct.controller.js';

import { asyncHandler } from '../middleware/errorHandler.middleware.js';

import redisService from '../services/redis.service.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/', redisService.cacheMiddleware('products:list', 300), asyncHandler(getProducts));

router.get('/b2b-suggestions', asyncHandler(getB2BSuggestions));
router.get('/:id', redisService.cacheMiddleware('product:details', 180), asyncHandler(getProduct));

export default router;

