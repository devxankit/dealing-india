import express from 'express';
import {
  getProducts,
  getProduct,
  create,
  update,
  remove,
  updateStatus,
  bulkUpload,
} from '../controllers/vendor-controllers/vendorProducts.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Routes
router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));
router.patch('/:id/status', asyncHandler(updateStatus));
router.post('/bulk-upload', asyncHandler(bulkUpload));

export default router;

