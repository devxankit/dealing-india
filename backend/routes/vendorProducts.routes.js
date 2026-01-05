import express from 'express';
import {
  getProducts,
  getProduct,
  create,
  update,
  remove,
  updateStatus,
} from '../controllers/vendor-controllers/vendorProducts.controller.js';
import { protectVendor } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(protectVendor);
router.use(authorize('vendor'));

// Routes
router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));
router.patch('/:id/status', asyncHandler(updateStatus));

export default router;

