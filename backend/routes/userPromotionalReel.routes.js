import express from 'express';
import {
    getReels,
    followReel,
    unfollowReel,
    getLiked,
    toggleLike,
    addComment,
    getComments
} from '../controllers/admin-controllers/promotionalReel.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// Required authentication for all promotional reel interactions
router.use(authenticate);

router.get('/', redisService.cacheMiddleware('promotional-reels:list', 300), getReels);
router.get('/liked', redisService.cacheMiddleware('promotional-reels:liked', 300), getLiked);

router.post('/:id/follow', followReel);
router.delete('/:id/follow', unfollowReel);

router.post('/:id/like', toggleLike);
router.post('/:id/comments', addComment);
router.get('/:id/comments', redisService.cacheMiddleware('promotional-reels:comments', 120), getComments);

export default router;
