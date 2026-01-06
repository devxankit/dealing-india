import Product from '../models/Product.model.js';
import Wishlist from '../models/Wishlist.model.js';
import Cart from '../models/Cart.model.js';
import mongoose from 'mongoose';

/**
 * Get recommended products for a user
 * Algorithm:
 * 1. Get products similar to wishlist items (based on price range ±30%)
 * 2. Get products similar to cart items (based on price range ±30%)
 * 3. Fill remaining slots with trending products (isTrending: true)
 * 4. Fill remaining slots with popular products (sorted by rating)
 * 5. Fill remaining slots with any remaining products
 * 
 * @param {String} userId - User ID (optional, for personalized recommendations)
 * @param {Number} limit - Maximum number of products to return (default: 6)
 * @returns {Promise<Array>} Array of recommended products
 */
export const getRecommendedProducts = async (userId = null, limit = 6) => {
  try {
    let recommended = [];
    const usedIds = new Set();

    // Get wishlist products if user is logged in
    let wishlistProductIds = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const wishlist = await Wishlist.findOne({ userId })
          .populate('products.productId', '_id price')
          .lean();
        
        if (wishlist && wishlist.products) {
          wishlistProductIds = wishlist.products
            .filter(item => item.productId && item.productId._id)
            .map(item => item.productId._id.toString());
        }
      } catch (error) {
        console.error('Error fetching wishlist for recommendations:', error);
      }
    }

    // Get cart products if user is logged in
    let cartProductIds = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const cart = await Cart.findOne({ userId })
          .populate('items.productId', '_id price')
          .lean();
        
        if (cart && cart.items) {
          cartProductIds = cart.items
            .filter(item => item.productId && item.productId._id)
            .map(item => item.productId._id.toString());
        }
      } catch (error) {
        console.error('Error fetching cart for recommendations:', error);
      }
    }

    // Step 1: Get products similar to wishlist items
    if (wishlistProductIds.length > 0) {
      const wishlistProducts = await Product.find({
        _id: { $in: wishlistProductIds },
        isVisible: true,
      })
        .select('price')
        .lean();

      for (const wishlistProduct of wishlistProducts) {
        const priceRange = {
          min: wishlistProduct.price * 0.7, // 70% of price
          max: wishlistProduct.price * 1.3, // 130% of price
        };

        const similarProducts = await Product.find({
          _id: { $nin: [...usedIds, ...wishlistProductIds] },
          isVisible: true,
          price: { $gte: priceRange.min, $lte: priceRange.max },
        })
          .limit(2)
          .select('_id')
          .lean();

        for (const product of similarProducts) {
          if (recommended.length < limit && !usedIds.has(product._id.toString())) {
            recommended.push(product._id.toString());
            usedIds.add(product._id.toString());
          }
        }
      }
    }

    // Step 2: Get products similar to cart items
    if (cartProductIds.length > 0 && recommended.length < limit) {
      const cartProducts = await Product.find({
        _id: { $in: cartProductIds },
        isVisible: true,
      })
        .select('price')
        .lean();

      for (const cartProduct of cartProducts) {
        const priceRange = {
          min: cartProduct.price * 0.7,
          max: cartProduct.price * 1.3,
        };

        const similarProducts = await Product.find({
          _id: { $nin: [...usedIds, ...cartProductIds] },
          isVisible: true,
          price: { $gte: priceRange.min, $lte: priceRange.max },
        })
          .limit(2)
          .select('_id')
          .lean();

        for (const product of similarProducts) {
          if (recommended.length < limit && !usedIds.has(product._id.toString())) {
            recommended.push(product._id.toString());
            usedIds.add(product._id.toString());
          }
        }
      }
    }

    // Step 3: Fill remaining slots with trending products
    if (recommended.length < limit) {
      const trendingProducts = await Product.find({
        _id: { $nin: Array.from(usedIds) },
        isVisible: true,
        isTrending: true,
      })
        .sort({ rating: -1, createdAt: -1 })
        .limit(limit - recommended.length)
        .select('_id')
        .lean();

      for (const product of trendingProducts) {
        if (recommended.length < limit) {
          recommended.push(product._id.toString());
          usedIds.add(product._id.toString());
        }
      }
    }

    // Step 4: Fill remaining slots with popular products (sorted by rating, with reviews)
    if (recommended.length < limit) {
      const popularProducts = await Product.find({
        _id: { $nin: Array.from(usedIds) },
        isVisible: true,
        reviewCount: { $gte: 1 }, // At least 1 review
      })
        .sort({ rating: -1, reviewCount: -1 })
        .limit(limit - recommended.length)
        .select('_id')
        .lean();

      for (const product of popularProducts) {
        if (recommended.length < limit) {
          recommended.push(product._id.toString());
          usedIds.add(product._id.toString());
        }
      }
    }

    // Step 5: Fill remaining slots with any remaining products
    if (recommended.length < limit) {
      const remainingProducts = await Product.find({
        _id: { $nin: Array.from(usedIds) },
        isVisible: true,
      })
        .sort({ createdAt: -1 })
        .limit(limit - recommended.length)
        .select('_id')
        .lean();

      for (const product of remainingProducts) {
        if (recommended.length < limit) {
          recommended.push(product._id.toString());
          usedIds.add(product._id.toString());
        }
      }
    }

    // Fetch full product details
    const productIds = recommended.map(id => new mongoose.Types.ObjectId(id));
    const products = await Product.find({
      _id: { $in: productIds },
    })
      .populate('vendorId', 'businessName storeName storeLogo isEmailVerified status')
      .populate('categoryId', 'name slug')
      .populate('brandId', 'name')
      .lean();

    // Maintain the order of recommended products
    const orderedProducts = recommended.map(id => {
      return products.find(p => p._id.toString() === id);
    }).filter(Boolean);

    // Transform products to frontend format
    const transformedProducts = orderedProducts.map((product) => {
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

      const category = product.categoryId;
      const categoryData = category && typeof category === 'object' && (category._id || category.id)
        ? {
            id: category._id?.toString() || category.id?.toString(),
            name: category.name || '',
            slug: category.slug || '',
          }
        : null;

      const brand = product.brandId;
      const brandData = brand && typeof brand === 'object' && (brand._id || brand.id)
        ? {
            id: brand._id?.toString() || brand.id?.toString(),
            name: brand.name || '',
          }
        : null;

      return {
        id: product._id.toString(),
        name: product.name || '',
        sku: product.sku || '',
        unit: product.unit || 'Piece',
        price: product.price || 0,
        originalPrice: product.originalPrice || null,
        image: product.image || product.images?.[0] || null,
        images: product.images || [],
        categoryId: categoryData?.id || null,
        category: categoryData,
        subcategoryId: product.subcategoryId?.toString() || null,
        subSubCategoryId: product.subSubCategoryId?.toString() || null,
        brandId: brandData?.id || null,
        brand: brandData,
        vendorId: vendorData?.id || null,
        vendor: vendorData,
        vendorName: vendorData?.storeName || vendorData?.businessName || '',
        stock: product.stock || 'in_stock',
        stockQuantity: product.stockQuantity || 0,
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        flashSale: product.flashSale || false,
        isNew: product.isNew || false,
        isTrending: product.isTrending || false,
        description: product.description || '',
        tags: product.tags || [],
        variants: product.variants || {},
        seoTitle: product.seoTitle || '',
        seoDescription: product.seoDescription || '',
      };
    });

    return transformedProducts;
  } catch (error) {
    console.error('Error in getRecommendedProducts:', error);
    throw error;
  }
};



















