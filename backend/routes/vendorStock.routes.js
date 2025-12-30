import express from 'express';
import {
  getStock,
  updateStock,
  getStats,
} from '../controllers/vendor-controllers/vendorStock.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Routes
router.get('/stats', asyncHandler(getStats));
router.get('/', asyncHandler(getStock));
router.patch('/:productId', asyncHandler(updateStock));

export default router;

