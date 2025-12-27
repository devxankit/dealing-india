import express from 'express';
import { getPublicBrands } from '../controllers/public-controllers/publicBrand.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public route - no authentication required
router.get('/', asyncHandler(getPublicBrands));

export default router;

