import express from 'express';
import {
  getOrders,
  getOrder,
  updateStatus,
  getStats,
  getEarningsStats,
} from '../controllers/vendor-controllers/vendorOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize, vendorApproved } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication and approval
router.use(authenticate);
router.use(authorize('vendor'));
router.use(vendorApproved);

// Routes
router.get('/stats', asyncHandler(getStats));
router.get('/earnings', asyncHandler(getEarningsStats));
router.get('/', asyncHandler(getOrders));
router.get('/:orderId', asyncHandler(getOrder));
router.put('/:orderId/status', asyncHandler(updateStatus));

export default router;

