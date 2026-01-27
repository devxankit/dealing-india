import express from 'express';
import { getB2BVendorsList, getPendingB2BVendors, removeB2BVendor } from '../controllers/admin-controllers/vendorManagement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// B2B vendor management routes
router.get('/', asyncHandler(getB2BVendorsList));
router.get('/pending', asyncHandler(getPendingB2BVendors));
router.delete('/:id', asyncHandler(removeB2BVendor));

export default router;
