import express from 'express';
import { getReels } from '../controllers/user-controllers/userReels.controller.js';
import { toggleLike, getLiked } from '../controllers/user-controllers/reelLikes.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public route - no authentication required for viewing reels
router.get('/', getReels);

// Like routes - require authentication
router.post('/:reelId/like', authenticate, asyncHandler(toggleLike));
router.get('/liked', authenticate, asyncHandler(getLiked));

export default router;

