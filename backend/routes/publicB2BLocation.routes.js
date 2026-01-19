import express from 'express';
import { getB2BLocations } from '../controllers/public-controllers/publicB2BLocation.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public B2B location routes (no authentication required)
router.get('/b2b-locations', asyncHandler(getB2BLocations));

export default router;
