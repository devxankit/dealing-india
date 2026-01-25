import express from 'express';
import {
  createOrder,
  verifyPayment,
  getOrder,
  getOrders,
  cancelOrder,
} from '../controllers/user-controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Create order and initialize payment
router.post('/create', asyncHandler(createOrder));

// Verify payment
router.post('/verify-payment', asyncHandler(verifyPayment));

// Get all orders for authenticated user
router.get('/', redisService.cacheMiddleware('user:orders:list', 300), asyncHandler(getOrders));

// Get order by ID
router.get('/:orderId', redisService.cacheMiddleware('user:orders:details', 300), asyncHandler(getOrder));

// Cancel order
router.post('/:orderId/cancel', asyncHandler(cancelOrder));

export default router;

