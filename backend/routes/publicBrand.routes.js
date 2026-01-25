import express from 'express';
import { getPublicBrands } from '../controllers/public-controllers/publicBrand.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// Public route - no authentication required
router.get('/', redisService.cacheMiddleware('public:brands', 3600), asyncHandler(getPublicBrands));

export default router;

