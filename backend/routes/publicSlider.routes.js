import express from 'express';
import { getPublicSliders } from '../controllers/public-controllers/publicSlider.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public route - no authentication required
router.get('/', asyncHandler(getPublicSliders));

export default router;

