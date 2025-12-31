import express from 'express';
import {
  getWishlistController,
  addToWishlistController,
  removeFromWishlistController,
  clearWishlistController,
  checkWishlistController,
} from '../controllers/user-controllers/wishlist.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require user authentication
router.use(authenticate, authorize('user'));

// Get wishlist
router.get('/', asyncHandler(getWishlistController));

// Add product to wishlist
router.post('/', asyncHandler(addToWishlistController));

// Remove product from wishlist
router.delete('/:productId', asyncHandler(removeFromWishlistController));

// Clear entire wishlist
router.delete('/', asyncHandler(clearWishlistController));

// Check if product is in wishlist
router.get('/check/:productId', asyncHandler(checkWishlistController));

export default router;

