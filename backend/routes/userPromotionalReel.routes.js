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

const router = express.Router();

// Required authentication for all promotional reel interactions
router.use(authenticate);

router.get('/', getReels);
router.get('/liked', getLiked);

router.post('/:id/follow', followReel);
router.delete('/:id/follow', unfollowReel);

router.post('/:id/like', toggleLike);
router.post('/:id/comments', addComment);
router.get('/:id/comments', getComments);

export default router;
