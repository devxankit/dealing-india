import express from 'express';
import {
  getSales,
  getInventory,
  getDashboardSummary,
  getOrderAnalytics,
  getVendorRegistrationAnalytics,
} from '../controllers/admin-controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

import redisService from '../services/redis.service.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Reports routes
router.get('/sales', asyncHandler(getSales));
router.get('/inventory', asyncHandler(getInventory));
router.get('/dashboard-summary', redisService.cacheMiddleware('admin:dashboard', 300), asyncHandler(getDashboardSummary));
router.get('/order-analytics', asyncHandler(getOrderAnalytics));
router.get('/vendor-registration-analytics', asyncHandler(getVendorRegistrationAnalytics));

export default router;

