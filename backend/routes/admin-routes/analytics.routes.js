import express from 'express';

import * as b2bAnalyticsController from '../../controllers/admin-controllers/b2bAnalytics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticate);
router.use(authorize('admin'));





/**
 * @route   GET /api/admin/analytics/b2b-vendors
 * @desc    Get B2B vendor analytics for admin
 * @access  Private (Admin)
 */
router.get('/b2b-vendors', b2bAnalyticsController.getB2BVendorAnalytics);

export default router;
