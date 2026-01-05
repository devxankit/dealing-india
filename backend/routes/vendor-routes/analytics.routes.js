import express from 'express';
import * as analyticsController from '../../controllers/vendor-controllers/analytics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize, vendorApproved } from '../../middleware/role.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticate);
router.use(authorize('vendor'));
router.use(vendorApproved);

/**
 * @route   GET /api/vendor/analytics/summary
 * @desc    Get analytics summary for vendor
 * @access  Private (Vendor)
 */
router.get('/summary', analyticsController.getVendorAnalyticsSummary);

/**
 * @route   GET /api/vendor/analytics/charts
 * @desc    Get chart data for vendor
 * @access  Private (Vendor)
 */
router.get('/charts', analyticsController.getVendorChartData);

/**
 * @route   GET /api/vendor/analytics/dashboard
 * @desc    Get dashboard data for vendor
 * @access  Private (Vendor)
 */
router.get('/dashboard', analyticsController.getVendorDashboardData);

export default router;
