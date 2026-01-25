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
import redisService from '../services/redis.service.js';

const router = express.Router();

// All routes require vendor authentication
router.use(protectVendor);
router.use(authorize('vendor'));

// Routes
router.get('/', redisService.cacheMiddleware('vendor:products:list', 300), asyncHandler(getProducts));
router.get('/:id', redisService.cacheMiddleware('vendor:products:details', 300), asyncHandler(getProduct));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));
router.patch('/:id/status', asyncHandler(updateStatus));

export default router;

