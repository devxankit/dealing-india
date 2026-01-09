import express from 'express';
import { getReelById } from '../controllers/public-controllers/publicReel.controller.js';

const router = express.Router();

/**
 * Public routes for reels
 * Prefix: /api/public/reels
 */

// Get single reel by ID
router.get('/:id', getReelById);

export default router;
