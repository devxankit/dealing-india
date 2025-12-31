import Wishlist from '../models/Wishlist.model.js';
import Product from '../models/Product.model.js';

/**
 * Get user's wishlist with populated products
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Wishlist with products
 */
export const getWishlist = async (userId) => {
  try {
    let wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: 'products.productId',
        model: 'Product',
        populate: [
          { path: 'vendorId', select: 'businessName storeName storeLogo isEmailVerified status' },
          { path: 'categoryId', select: 'name slug' },
          { path: 'brandId', select: 'name' },
        ],
      })
      .lean();

    // If wishlist doesn't exist, create empty one
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, products: [] });
      return {
        id: wishlist._id.toString(),
        userId: wishlist.userId.toString(),
        products: [],
      };
    }

    // Transform products to frontend format
    const products = (wishlist.products || [])
      .filter((item) => item.productId) // Filter out deleted products
      .map((item) => {
        const product = item.productId;
        if (!product || !product._id) return null;

        const vendor = product.vendorId;
        const vendorData = vendor && typeof vendor === 'object' && (vendor._id || vendor.id)
          ? {
              id: vendor._id?.toString() || vendor.id?.toString(),
              businessName: vendor.businessName || vendor.storeName || '',
              storeName: vendor.storeName || vendor.businessName || '',
              storeLogo: vendor.storeLogo || null,
              isEmailVerified: vendor.isEmailVerified || false,
              status: vendor.status || 'active',
            }
          : null;

        return {
          id: product._id.toString(),
          name: product.name,
          description: product.description || '',
          price: product.price || 0,
          originalPrice: product.originalPrice || null,
          image: product.image || null,
          images: product.images || [],
          stock: product.stock || 'in_stock',
          stockQuantity: product.stockQuantity || 0,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          categoryId: product.categoryId?._id?.toString() || product.categoryId?.toString() || null,
          categoryName: product.categoryId?.name || null,
          brandId: product.brandId?._id?.toString() || product.brandId?.toString() || null,
          brandName: product.brandId?.name || null,
          vendorId: vendorData?.id || (typeof vendor === 'object' ? vendor?._id?.toString() : vendor?.toString() || vendor),
          vendor: vendorData,
          isActive: product.isActive !== false,
          addedAt: item.addedAt || item.createdAt || new Date(),
        };
      })
      .filter(Boolean); // Remove null items

    return {
      id: wishlist._id.toString(),
      userId: wishlist.userId.toString(),
      products,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Add product to wishlist
 * @param {String} userId - User ID
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} Updated wishlist
 */
export const addToWishlist = async (userId, productId) => {
  try {
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ userId });
    
    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId,
        products: [{ productId, addedAt: new Date() }],
      });
    } else {
      // Check if product already exists in wishlist
      const existingProduct = wishlist.products.find(
        (p) => p.productId.toString() === productId.toString()
      );

      if (existingProduct) {
        throw new Error('Product already in wishlist');
      }

      // Add product to wishlist
      wishlist.products.push({ productId, addedAt: new Date() });
      await wishlist.save();
    }

    // Return updated wishlist
    return await getWishlist(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Remove product from wishlist
 * @param {String} userId - User ID
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} Updated wishlist
 */
export const removeFromWishlist = async (userId, productId) => {
  try {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      throw new Error('Wishlist not found');
    }

    // Remove product from wishlist
    wishlist.products = wishlist.products.filter(
      (p) => p.productId.toString() !== productId.toString()
    );

    await wishlist.save();

    // Return updated wishlist
    return await getWishlist(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Clear entire wishlist
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Empty wishlist
 */
export const clearWishlist = async (userId) => {
  try {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // Return empty wishlist structure
      return {
        id: null,
        userId: userId.toString(),
        products: [],
      };
    }

    wishlist.products = [];
    await wishlist.save();

    return {
      id: wishlist._id.toString(),
      userId: wishlist.userId.toString(),
      products: [],
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Check if product is in wishlist
 * @param {String} userId - User ID
 * @param {String} productId - Product ID
 * @returns {Promise<Boolean>} True if product is in wishlist
 */
export const isInWishlist = async (userId, productId) => {
  try {
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return false;
    }

    return wishlist.products.some(
      (p) => p.productId.toString() === productId.toString()
    );
  } catch (error) {
    throw error;
  }
};

