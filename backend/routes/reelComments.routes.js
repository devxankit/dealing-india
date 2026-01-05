import express from 'express';
import { getComments, addComment, deleteComment } from '../controllers/user-controllers/reelComments.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get comments for a reel (public - no auth required)
router.get('/:reelId/comments', getComments);

// Add comment (requires authentication)
router.post('/:reelId/comments', authenticate, addComment);

// Delete comment (requires authentication)
router.delete('/comments/:commentId', authenticate, deleteComment);

export default router;

