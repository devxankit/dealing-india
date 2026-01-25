import express from 'express';
import {
  getProducts,
  getProduct,
  remove,
} from '../controllers/admin-controllers/productManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Product management routes
router.get('/', redisService.cacheMiddleware('admin:products:list', 300), asyncHandler(getProducts));
router.get('/:id', redisService.cacheMiddleware('admin:products:details', 300), asyncHandler(getProduct));
router.delete('/:id', asyncHandler(remove));

export default router;

