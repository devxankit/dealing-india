import express from 'express';
import * as analyticsController from '../../controllers/admin-controllers/analytics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/admin/analytics/summary
 * @desc    Get analytics summary for admin
 * @access  Private (Admin)
 */
router.get('/summary', analyticsController.getAdminAnalyticsSummary);

/**
 * @route   GET /api/admin/analytics/charts
 * @desc    Get chart data for admin
 * @access  Private (Admin)
 */
router.get('/charts', analyticsController.getAdminChartData);

/**
 * @route   GET /api/admin/analytics/finance
 * @desc    Get finance summary for admin
 * @access  Private (Admin)
 */
router.get('/finance', analyticsController.getAdminFinanceSummary);
router.get('/trends', analyticsController.getOrderTrends);
router.get('/payment-breakdown', analyticsController.getPaymentBreakdown);
router.get('/tax-reports', analyticsController.getTaxReports);
router.get('/refund-reports', analyticsController.getRefundReports);

export default router;
