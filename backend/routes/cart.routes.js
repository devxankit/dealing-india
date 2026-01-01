import express from 'express';
import {
  getCartController,
  addToCartController,
  updateCartItemController,
  removeFromCartController,
  clearCartController,
} from '../controllers/user-controllers/cart.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require user authentication
router.use(authenticate, authorize('user'));

// Get cart
router.get('/', asyncHandler(getCartController));

// Add product to cart
router.post('/', asyncHandler(addToCartController));

// Update cart item quantity
router.put('/:productId', asyncHandler(updateCartItemController));

// Remove product from cart
router.delete('/:productId', asyncHandler(removeFromCartController));

// Clear entire cart
router.delete('/', asyncHandler(clearCartController));

export default router;

