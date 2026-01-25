import express from 'express';
import { getReelById } from '../controllers/public-controllers/publicReel.controller.js';
import redisService from '../services/redis.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

/**
 * Public routes for reels
 * Prefix: /api/public/reels
 */

// Get single reel by ID
router.get('/:id', redisService.cacheMiddleware('reel:details', 600), asyncHandler(getReelById));

export default router;
