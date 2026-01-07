import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import redisService from './redis.service.js';

const CART_PREFIX = 'cart:';
const CART_TTL = 86400 * 7; // 7 days

/**
 * Get user's cart
 * @param {String} userId 
 */
export const getCart = async (userId) => {
  try {
    if (!userId) throw new Error('User ID is required');

    let cartData = await redisService.get(`${CART_PREFIX}${userId}`);

    // Fallback to MongoDB if not in Redis
    if (!cartData) {
      const dbCart = await Cart.findOne({ userId }).lean();
      if (dbCart) {
        cartData = dbCart.items || [];
        // Sync to Redis for future requests
        await redisService.set(`${CART_PREFIX}${userId}`, cartData, CART_TTL);
      } else {
        cartData = [];
      }
    }

    // Populate products from MongoDB
    if (cartData.length === 0) {
      return { userId, items: [] };
    }

    const populatedItems = await Promise.all(
      cartData.map(async (item) => {
        const product = await Product.findById(item.productId)
          .populate([
            { path: 'vendorId', select: 'businessName storeName storeLogo isEmailVerified status' },
            { path: 'categoryId', select: 'name slug' },
            { path: 'brandId', select: 'name' },
          ])
          .lean();

        if (!product || !product.isActive) return null;

        return {
          id: product._id.toString(),
          name: product.name,
          price: product.price || 0,
          originalPrice: product.originalPrice || null,
          image: product.image || null,
          stock: product.stock || 'in_stock',
          stockQuantity: product.stockQuantity || 0,
          vendor: product.vendorId,
          quantity: item.quantity || 1,
          taxRate: product.taxRate || 0,
          taxIncluded: product.taxIncluded || false,
          addedAt: item.addedAt || new Date()
        };
      })
    );

    const items = populatedItems.filter(Boolean);

    return {
      userId,
      items,
    };
  } catch (error) {
    console.error('getCart Error:', error);
    throw error;
  }
};

/**
 * Add product to cart
 */
export const addToCart = async (userId, productId, quantity = 1) => {
  try {
    const product = await Product.findById(productId);
    if (!product || !product.isActive || product.stock === 'out_of_stock') {
      throw new Error('Product not available');
    }

    let cartData = await redisService.get(`${CART_PREFIX}${userId}`);

    // If not in Redis, try getting from DB first to preserve existing cart
    if (!cartData) {
      const dbCart = await Cart.findOne({ userId }).lean();
      cartData = dbCart ? dbCart.items : [];
    }

    const existingIndex = cartData.findIndex(item => item.productId.toString() === productId.toString());

    if (existingIndex !== -1) {
      const newQty = cartData[existingIndex].quantity + quantity;
      if (newQty > product.stockQuantity) throw new Error('Stock limit exceeded');
      cartData[existingIndex].quantity = newQty;
    } else {
      if (quantity > product.stockQuantity) throw new Error('Stock limit exceeded');
      cartData.push({ productId, quantity, addedAt: new Date() });
    }

    // Update Redis (Primary)
    const success = await redisService.set(`${CART_PREFIX}${userId}`, cartData, CART_TTL);

    // If Redis fails, or if we want to keep DB as secondary source of truth
    // User requested "No MongoDB writes for cart" - so we skip DB write if Redis succeeded
    if (!success) {
      await Cart.findOneAndUpdate(
        { userId },
        { items: cartData },
        { upsert: true, new: true }
      );
    }

    return await getCart(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Update cart item
 */
export const updateCartItem = async (userId, productId, quantity) => {
  try {
    if (quantity <= 0) return await removeFromCart(userId, productId);

    const product = await Product.findById(productId);
    if (quantity > product.stockQuantity) throw new Error('Stock limit exceeded');

    let cartData = await redisService.get(`${CART_PREFIX}${userId}`);
    if (!cartData) {
      const dbCart = await Cart.findOne({ userId }).lean();
      cartData = dbCart ? dbCart.items : [];
    }

    const existingIndex = cartData.findIndex(item => item.productId.toString() === productId.toString());
    if (existingIndex === -1) throw new Error('Item not in cart');

    cartData[existingIndex].quantity = quantity;

    const success = await redisService.set(`${CART_PREFIX}${userId}`, cartData, CART_TTL);
    if (!success) {
      await Cart.findOneAndUpdate({ userId }, { items: cartData });
    }

    return await getCart(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Remove from cart
 */
export const removeFromCart = async (userId, productId) => {
  try {
    let cartData = await redisService.get(`${CART_PREFIX}${userId}`);
    if (!cartData) {
      const dbCart = await Cart.findOne({ userId }).lean();
      cartData = dbCart ? dbCart.items : [];
    }

    cartData = cartData.filter(item => item.productId.toString() !== productId.toString());

    const success = await redisService.set(`${CART_PREFIX}${userId}`, cartData, CART_TTL);
    if (!success) {
      await Cart.findOneAndUpdate({ userId }, { items: cartData });
    }

    return await getCart(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Clear cart
 */
export const clearCart = async (userId) => {
  try {
    await redisService.del(`${CART_PREFIX}${userId}`);
    // Optional: Only clear DB if it existed there
    await Cart.findOneAndDelete({ userId });

    return { userId, items: [] };
  } catch (error) {
    throw error;
  }
};

