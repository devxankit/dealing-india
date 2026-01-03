import express from 'express';
import {
  getOrders,
  getOrder,
  updateStatus,
  cancelOrder,
  processRefund,
  getStats,
} from '../controllers/admin-controllers/orderManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Routes
router.get('/stats', asyncHandler(getStats));
router.get('/', asyncHandler(getOrders));
router.get('/:orderId', asyncHandler(getOrder));
router.put('/:orderId/status', asyncHandler(updateStatus));
router.put('/:orderId/cancel', asyncHandler(cancelOrder));
router.put('/:orderId/refund', asyncHandler(processRefund));

export default router;

