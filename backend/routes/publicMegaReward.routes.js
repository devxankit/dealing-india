import express from 'express';
import {
    trackClick,
    getLinkInfo
} from '../controllers/public-controllers/megaRewardPublic.controller.js';

const router = express.Router();

// Public routes - no authentication required

// Track click and redirect (main share link handler)
router.get('/r/:linkCode', trackClick);

// Get link info for preview (optional)
router.get('/info/:linkCode', getLinkInfo);

export default router;
