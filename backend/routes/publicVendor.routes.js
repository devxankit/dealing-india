import express from 'express';
import { getPublicVendors, getPublicVendor } from '../controllers/public-controllers/publicVendor.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

import redisService from '../services/redis.service.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/', redisService.cacheMiddleware('home:featured_vendors', 600), asyncHandler(getPublicVendors));
router.get('/:id', redisService.cacheMiddleware('vendor:details', 300), asyncHandler(getPublicVendor));

export default router;

