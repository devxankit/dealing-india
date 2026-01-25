import express from 'express';
import { getReels } from '../controllers/user-controllers/userReels.controller.js';
import { toggleLike, getLiked } from '../controllers/user-controllers/reelLikes.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// Public route - no authentication required for viewing reels
router.get('/', redisService.cacheMiddleware('reels:feed', 300), asyncHandler(getReels));

// Like routes - require authentication
router.post('/:reelId/like', authenticate, asyncHandler(toggleLike));
router.get('/liked', authenticate, redisService.cacheMiddleware('user:reels:liked', 300), asyncHandler(getLiked));

export default router;

