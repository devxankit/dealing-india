import express from 'express';
import {
  getAddresses,
  getAddress,
  createAddressController,
  updateAddressController,
  deleteAddressController,
  setDefaultAddressController,
} from '../controllers/user-controllers/address.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all addresses
router.get('/', redisService.cacheMiddleware('user:addresses:list', 600), asyncHandler(getAddresses));

// Create new address
router.post('/', asyncHandler(createAddressController));

// Get address by ID
router.get('/:id', redisService.cacheMiddleware('user:addresses:details', 600), asyncHandler(getAddress));

// Update address
router.put('/:id', asyncHandler(updateAddressController));

// Delete address
router.delete('/:id', asyncHandler(deleteAddressController));

// Set default address
router.put('/:id/default', asyncHandler(setDefaultAddressController));

export default router;

