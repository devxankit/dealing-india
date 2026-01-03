import express from 'express';
import {
  getSales,
  getInventory,
  getDashboardSummary,
} from '../controllers/admin-controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Reports routes
router.get('/sales', asyncHandler(getSales));
router.get('/inventory', asyncHandler(getInventory));
router.get('/dashboard-summary', asyncHandler(getDashboardSummary));

export default router;

