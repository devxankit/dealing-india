import express from 'express';
import { getCustomers, getCustomerById } from '../controllers/vendor-controllers/vendorCustomers.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { vendorApproved } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication and approval
router.use(authenticate);
router.use(vendorApproved);

// Get vendor customers
router.get('/', asyncHandler(getCustomers));

// Get vendor customer by ID
router.get('/:id', asyncHandler(getCustomerById));

export default router;

