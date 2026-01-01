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

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all addresses
router.get('/', asyncHandler(getAddresses));

// Create new address
router.post('/', asyncHandler(createAddressController));

// Get address by ID
router.get('/:id', asyncHandler(getAddress));

// Update address
router.put('/:id', asyncHandler(updateAddressController));

// Delete address
router.delete('/:id', asyncHandler(deleteAddressController));

// Set default address
router.put('/:id/default', asyncHandler(setDefaultAddressController));

export default router;

