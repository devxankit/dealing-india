import express from 'express';
import { getPerformanceMetrics } from '../controllers/vendor-controllers/vendorPerformance.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { vendorApproved } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication and approval
router.use(authenticate);
router.use(vendorApproved);

// Get performance metrics
router.get('/metrics', asyncHandler(getPerformanceMetrics));

export default router;

