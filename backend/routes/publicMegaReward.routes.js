import express from 'express';
import {
    trackClick,
    recordClick,
    getLinkInfo
} from '../controllers/public-controllers/megaRewardPublic.controller.js';

const router = express.Router();

// Public routes - no authentication required

// Step 1: GET route - Serves HTML landing page with OG tags and JS Redirect
router.get('/r/:linkCode', trackClick);

// Step 2: POST route - Actually logs the click (called via JS from landing page)
router.post('/track-log/:linkCode', recordClick);

// Get link info for preview (optional)
router.get('/info/:linkCode', getLinkInfo);

export default router;
