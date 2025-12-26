import express from 'express';
import {
  getReviews,
  getReview,
  respond,
  moderate,
} from '../controllers/vendor-controllers/vendorReviews.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Routes
router.get('/', asyncHandler(getReviews));
router.get('/:id', asyncHandler(getReview));
router.post('/:id/respond', asyncHandler(respond));
router.patch('/:id/moderate', asyncHandler(moderate));

export default router;

