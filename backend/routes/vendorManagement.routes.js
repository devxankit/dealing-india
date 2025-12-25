import express from 'express';
import {
  getVendors,
  getVendor,
  updateStatus,
  updateCommission,
  getPending,
  getApproved,
  getAnalytics,
  getOrders,
} from '../controllers/admin-controllers/vendorManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Vendor management routes
router.get('/', asyncHandler(getVendors));
router.get('/pending', asyncHandler(getPending));
router.get('/approved', asyncHandler(getApproved));
router.get('/analytics', asyncHandler(getAnalytics));
router.get('/analytics/:id', asyncHandler(getAnalytics));
router.get('/:id', asyncHandler(getVendor));
router.get('/:id/orders', asyncHandler(getOrders));
router.put('/:id/status', asyncHandler(updateStatus));
router.put('/:id/commission', asyncHandler(updateCommission));

export default router;

