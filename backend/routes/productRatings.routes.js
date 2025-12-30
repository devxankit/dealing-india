import express from 'express';
import {
  getReviews,
  getReview,
  create,
  update,
  remove,
} from '../controllers/admin-controllers/productRatings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Product Ratings/Reviews routes
router.get('/', asyncHandler(getReviews));
router.get('/:id', asyncHandler(getReview));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));

export default router;

