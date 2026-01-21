import Wishlist from '../models/Wishlist.model.js';
import Product from '../models/Product.model.js';

/**
 * Get user's wishlist with populated products
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Wishlist with products
 */
export const getWishlist = async (userId) => {
  try {
    // Search using both user and userId to handle schema migration
    let wishlist = await Wishlist.findOne({
      $or: [
        { user: userId },
        { userId: userId }
      ]
    })
      .populate({
        path: 'products.productId',
        model: 'Product',
        populate: [
          { path: 'vendorId', select: 'businessName storeName storeLogo isEmailVerified status' },
          { path: 'categoryId', select: 'name slug' },
          { path: 'brandId', select: 'name' },
        ],
      })
      .exec(); // Use exec() for better stack traces

    // Migration logic: If we found a wishlist but fields are inconsistent, fix them
    if (wishlist) {
      let needsSave = false;

      // Ensure 'user' is set (if only userId was present)
      if (!wishlist.user && wishlist.userId) {
        wishlist.user = wishlist.userId;
        needsSave = true;
      }

      // Ensure 'userId' is set (to avoid unique index collision on null)
      if (!wishlist.userId && wishlist.user) {
        wishlist.userId = wishlist.user;
        needsSave = true;
      }

      if (needsSave) {
        try {
          await wishlist.save();
        } catch (saveError) {
          console.error("Error migrating wishlist schema:", saveError.message);
          // Continue even if save fails (might be duplicate key on 'user', meaning duplicate wishlists exist)
          // If so, we might need to rely on the one that succeeded or handle merge later.
        }
      }
    }

    // If wishlist doesn't exist, create empty one
    if (!wishlist) {
      try {
        // Set BOTH user and userId to satisfy schemas and indexes
        wishlist = await Wishlist.create({
          user: userId,
          userId: userId, // Explicitly set to avoid null collision
          products: []
        });
      } catch (createError) {
        // Handle race condition or duplicate key error
        if (createError.code === 11000) {
          // Try finding it again
          wishlist = await Wishlist.findOne({
            $or: [{ user: userId }, { userId: userId }]
          });
        }

        if (!wishlist) throw createError;
      }

      return {
        id: wishlist._id.toString(),
        userId: wishlist.user?.toString() || wishlist.userId?.toString(),
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
      userId: wishlist.user?.toString() || wishlist.userId?.toString(),
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
    let wishlist = await Wishlist.findOne({
      $or: [{ user: userId }, { userId: userId }]
    });

    if (!wishlist) {
      try {
        // Explicitly set BOTH user and userId to avoid unique index null collisions
        // Ensure userId is valid, not null/undefined/empty string
        const safeUserId = userId ? userId.toString() : null;
        if (!safeUserId) throw new Error("Invalid User ID");

        wishlist = await Wishlist.create({
          user: safeUserId,
          userId: safeUserId,
          products: [{ productId, addedAt: new Date() }],
        });
      } catch (createError) {
        // Handle Duplicate Key Error (E11000)
        if (createError.code === 11000) {
          const keyPattern = createError.keyPattern || {};
          // If error is specifically about 'userId' being duplicate (likely null)
          if (keyPattern.userId) {
            console.warn("⚠️ Detect problematic userId unique index. Attempting to fix...");
            try {
              // Attempt to drop the problematic index
              await Wishlist.collection.dropIndex('userId_1');
              console.log("✅ Successfully dropped problematic userId_1 index. Retrying creation...");

              // Retry creation
              const safeUserId = userId.toString();
              wishlist = await Wishlist.create({
                user: safeUserId,
                userId: safeUserId,
                products: [{ productId, addedAt: new Date() }],
              });
            } catch (dropError) {
              console.error("❌ Failed to drop index or retry:", dropError.message);
              // Fallback: If we can't drop index, maybe we can find the existing doc if it appeared?
              wishlist = await Wishlist.findOne({ user: userId });
              if (!wishlist) throw createError; // Rethrow original if still stuck
            }
          } else {
            // Duplicate on 'user' or something else? Maybe race condition.
            wishlist = await Wishlist.findOne({
              $or: [{ user: userId }, { userId: userId }]
            });
            if (!wishlist) throw createError;
          }
        } else {
          throw createError;
        }
      }
    } else {
      // Check if product already exists in wishlist
      const existingProduct = wishlist.products.find(
        (p) => p.productId && p.productId.toString() === productId.toString()
      );

      if (existingProduct) {
        throw new Error('Product already in wishlist');
      }

      // MIGRATION: Ensure schema consistency before saving
      if (!wishlist.user && wishlist.userId) wishlist.user = wishlist.userId;
      if (!wishlist.userId && wishlist.user) wishlist.userId = wishlist.user;

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
    const wishlist = await Wishlist.findOne({
      $or: [{ user: userId }, { userId: userId }]
    });

    if (!wishlist) {
      throw new Error('Wishlist not found');
    }

    // MIGRATION: Ensure schema consistency before saving
    if (!wishlist.user && wishlist.userId) wishlist.user = wishlist.userId;
    if (!wishlist.userId && wishlist.user) wishlist.userId = wishlist.user;

    // Remove product from wishlist
    wishlist.products = wishlist.products.filter(
      (p) => p.productId && p.productId.toString() !== productId.toString()
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
    const wishlist = await Wishlist.findOne({
      $or: [{ user: userId }, { userId: userId }]
    });

    if (!wishlist) {
      // Return empty wishlist structure
      return {
        id: null,
        userId: userId.toString(),
        products: [],
      };
    }

    // MIGRATION: Ensure schema consistency before saving
    if (!wishlist.user && wishlist.userId) wishlist.user = wishlist.userId;
    if (!wishlist.userId && wishlist.user) wishlist.userId = wishlist.user;

    wishlist.products = [];
    await wishlist.save();

    return {
      id: wishlist._id.toString(),
      userId: wishlist.user?.toString() || wishlist.userId?.toString(),
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
    const wishlist = await Wishlist.findOne({
      $or: [{ user: userId }, { userId: userId }]
    });
    if (!wishlist) {
      return false;
    }

    return wishlist.products.some(
      (p) => p.productId && p.productId.toString() === productId.toString()
    );
  } catch (error) {
    throw error;
  }
};

