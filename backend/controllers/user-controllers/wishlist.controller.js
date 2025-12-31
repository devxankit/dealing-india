import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  isInWishlist,
} from '../../services/wishlist.service.js';

/**
 * Get user's wishlist
 */
export const getWishlistController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const wishlist = await getWishlist(userId);

    res.status(200).json({
      success: true,
      message: 'Wishlist fetched successfully',
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add product to wishlist
 */
export const addToWishlistController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const wishlist = await addToWishlist(userId, productId);

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      data: wishlist,
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message === 'Product already in wishlist') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Remove product from wishlist
 */
export const removeFromWishlistController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const wishlist = await removeFromWishlist(userId, productId);

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: wishlist,
    });
  } catch (error) {
    if (error.message === 'Wishlist not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Clear entire wishlist
 */
export const clearWishlistController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const wishlist = await clearWishlist(userId);

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully',
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if product is in wishlist
 */
export const checkWishlistController = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const inWishlist = await isInWishlist(userId, productId);

    res.status(200).json({
      success: true,
      data: {
        isInWishlist: inWishlist,
      },
    });
  } catch (error) {
    next(error);
  }
};

