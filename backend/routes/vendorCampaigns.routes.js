import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import {
  getCampaigns,
  getCampaign,
} from '../controllers/vendor-controllers/vendorCampaigns.controller.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Vendor campaigns routes
router.get('/', asyncHandler(getCampaigns));
router.get('/:id', asyncHandler(getCampaign));

export default router;


















