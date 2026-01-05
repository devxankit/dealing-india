import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../../services/cart.service.js';

/**
 * Get user's cart
 */
export const getCartController = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const userId = req.user.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is missing',
      });
    }

    const cart = await getCart(userId);

    res.status(200).json({
      success: true,
      message: 'Cart fetched successfully',
      data: cart,
    });
  } catch (error) {
    console.error('Error in getCartController:', {
      message: error.message,
      userId: req.user?.userId,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    next(error);
  }
};

/**
 * Add product to cart
 */
export const addToCartController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const cart = await addToCart(userId, productId, quantity);

    res.status(200).json({
      success: true,
      message: 'Product added to cart',
      data: cart,
    });
  } catch (error) {
    if (error.message === 'Product not found' || error.message === 'Product is not available') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes('stock')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItemController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required',
      });
    }

    const cart = await updateCartItem(userId, productId, quantity);

    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: cart,
    });
  } catch (error) {
    if (error.message === 'Cart not found' || error.message === 'Product not found' || error.message === 'Item not found in cart') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes('stock')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Remove product from cart
 */
export const removeFromCartController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const cart = await removeFromCart(userId, productId);

    res.status(200).json({
      success: true,
      message: 'Product removed from cart',
      data: cart,
    });
  } catch (error) {
    if (error.message === 'Cart not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Clear entire cart
 */
export const clearCartController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const cart = await clearCart(userId);

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

