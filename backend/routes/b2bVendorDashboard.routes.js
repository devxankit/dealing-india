import express from 'express';
import { getB2BVendorDashboardData } from '../controllers/b2bVendorDashboard.controller.js';
import { protectVendor } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(protectVendor);
router.use(authorize('vendor'));

/**
 * @route   GET /api/b2b-vendor/dashboard
 * @desc    Get dashboard data for B2B vendor
 * @access  Private (B2B Vendor)
 */
router.get('/', asyncHandler(getB2BVendorDashboardData));

export default router;
