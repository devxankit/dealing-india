import express from 'express';
import {
  getPromotions,
  getPromotion,
  getActiveCoupons,
} from '../controllers/vendor-controllers/vendorPromotions.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Routes
router.get('/active-coupons', asyncHandler(getActiveCoupons));
router.get('/', asyncHandler(getPromotions));
router.get('/:id', asyncHandler(getPromotion));

export default router;

