import express from 'express';
import { getPublicVendors, getPublicVendor } from '../controllers/public-controllers/publicVendor.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/', asyncHandler(getPublicVendors));
router.get('/:id', asyncHandler(getPublicVendor));

export default router;

