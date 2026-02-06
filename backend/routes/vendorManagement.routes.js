import express from 'express';
import {
  getVendors,
  getVendor,
  updateStatus,
  updateCommission,
  toggleActive,
  getPending,
  getApproved,

  getB2BVendorsList,
} from '../controllers/admin-controllers/vendorManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Vendor management routes
router.get('/', redisService.cacheMiddleware('admin:vendors:list', 300), asyncHandler(getVendors));
router.get('/pending', redisService.cacheMiddleware('admin:vendors:pending', 300), asyncHandler(getPending));
router.get('/approved', redisService.cacheMiddleware('admin:vendors:approved', 300), asyncHandler(getApproved));

router.get('/:id', redisService.cacheMiddleware('admin:vendors:details', 300), asyncHandler(getVendor));

router.put('/:id/status', asyncHandler(updateStatus));
router.put('/:id/commission', asyncHandler(updateCommission));
router.patch('/:id/toggle-active', asyncHandler(toggleActive));

export default router;

