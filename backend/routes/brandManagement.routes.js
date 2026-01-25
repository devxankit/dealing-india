import express from 'express';
import {
  getBrands,
  getBrand,
  create,
  update,
  remove,
  bulkDelete,
  toggleStatus,
} from '../controllers/admin-controllers/brandManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Brand management routes
router.get('/', redisService.cacheMiddleware('admin:brands:list', 300), asyncHandler(getBrands));
router.get('/:id', redisService.cacheMiddleware('admin:brands:details', 300), asyncHandler(getBrand));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/bulk', asyncHandler(bulkDelete));
router.put('/:id/toggle-status', asyncHandler(toggleStatus));
router.delete('/:id', asyncHandler(remove));

export default router;

