import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';

/**
 * Get user's cart with populated products
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Cart with products
 */
export const getCart = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    let cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.productId',
        model: 'Product',
        populate: [
          { path: 'vendorId', select: 'businessName storeName storeLogo isEmailVerified status' },
          { path: 'categoryId', select: 'name slug' },
          { path: 'brandId', select: 'name' },
        ],
      })
      .lean();

    // If cart doesn't exist, create empty one
    if (!cart) {
      try {
        cart = await Cart.create({ userId, items: [] });
        return {
          id: cart._id.toString(),
          userId: cart.userId.toString(),
          items: [],
        };
      } catch (createError) {
        console.error('Error creating cart:', createError);
        throw new Error('Failed to create cart');
      }
    }

    // Transform items to frontend format
    const items = (cart.items || [])
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
          vendorName: vendorData?.storeName || vendorData?.businessName || 'Unknown Vendor',
          quantity: item.quantity || 1,
          isActive: product.isActive !== false,
          taxRate: product.taxRate || 0,
          taxIncluded: product.taxIncluded || false,
          addedAt: item.addedAt || item.createdAt || new Date(),
        };
      })
      .filter(Boolean); // Remove null items

    return {
      id: cart._id.toString(),
      userId: cart.userId.toString(),
      items,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Add product to cart
 * @param {String} userId - User ID
 * @param {String} productId - Product ID
 * @param {Number} quantity - Quantity to add
 * @returns {Promise<Object>} Updated cart
 */
export const addToCart = async (userId, productId, quantity = 1) => {
  try {
    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.isActive) {
      throw new Error('Product is not available');
    }

    if (product.stock === 'out_of_stock') {
      throw new Error('Product is out of stock');
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [{ productId, quantity }],
      });
    } else {
      // Check if product already exists in cart
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId.toString()
      );

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        
        // Check stock limit
        if (newQuantity > product.stockQuantity) {
          throw new Error(`Only ${product.stockQuantity} items available in stock`);
        }

        existingItem.quantity = newQuantity;
      } else {
        // Add new item
        if (quantity > product.stockQuantity) {
          throw new Error(`Only ${product.stockQuantity} items available in stock`);
        }
        cart.items.push({ productId, quantity });
      }

      await cart.save();
    }

    // Return updated cart
    return await getCart(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Update product quantity in cart
 * @param {String} userId - User ID
 * @param {String} productId - Product ID
 * @param {Number} quantity - New quantity
 * @returns {Promise<Object>} Updated cart
 */
export const updateCartItem = async (userId, productId, quantity) => {
  try {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      return await removeFromCart(userId, productId);
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error('Cart not found');
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check stock limit
    if (quantity > product.stockQuantity) {
      throw new Error(`Only ${product.stockQuantity} items available in stock`);
    }

    // Update quantity
    const item = cart.items.find(
      (item) => item.productId.toString() === productId.toString()
    );

    if (!item) {
      throw new Error('Item not found in cart');
    }

    item.quantity = quantity;
    await cart.save();

    // Return updated cart
    return await getCart(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Remove product from cart
 * @param {String} userId - User ID
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} Updated cart
 */
export const removeFromCart = async (userId, productId) => {
  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Remove product from cart
    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId.toString()
    );

    await cart.save();

    // Return updated cart
    return await getCart(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Clear entire cart
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Empty cart
 */
export const clearCart = async (userId) => {
  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      // Return empty cart structure
      return {
        id: null,
        userId: userId.toString(),
        items: [],
      };
    }

    cart.items = [];
    await cart.save();

    return {
      id: cart._id.toString(),
      userId: cart.userId.toString(),
      items: [],
    };
  } catch (error) {
    throw error;
  }
};

