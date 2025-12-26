import express from 'express';
import { getInventoryReport } from '../controllers/vendor-controllers/vendorInventory.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { vendorApproved } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication and approval
router.use(authenticate);
router.use(vendorApproved);

// Get inventory report
router.get('/reports', asyncHandler(getInventoryReport));

export default router;

