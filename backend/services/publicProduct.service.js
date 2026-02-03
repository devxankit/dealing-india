import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import B2BCategory from '../models/B2BCategory.model.js';
import Brand from '../models/Brand.model.js';
import Vendor from '../models/Vendor.model.js';
import redisService from './redis.service.js';
import { getCategoryDepth } from './categoryManagement.service.js';
import { getAllFAQs } from './productFAQs.service.js';
import { sanitizeImageUrl, sanitizeImageUrls } from '../utils/imageValidation.util.js';

/**
 * Get all public products with optional filters (only visible products)
 * @param {Object} filters - { search, categoryId, subcategoryId, brandId, minPrice, maxPrice, minRating, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
export const getPublicProducts = async (filters = {}) => {
  try {
    const {
      search = '',
      categoryId,
      subcategoryId,
      brandId,
      minPrice,
      maxPrice,
      minRating,
      minReviewCount,
      vendorId,
      isNew,
      isTrending,
      flashSale,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      vendorType,
      state,
      city,
    } = filters;

    // Try to get from cache first
    const cacheKey = `products:list:${JSON.stringify(filters)}`;
    try {
      const cachedData = await redisService.get(cacheKey);
      if (cachedData) return cachedData;
    } catch (cacheError) {
      console.error('Redis GET error (getPublicProducts):', cacheError);
    }

    // Get active and approved vendors with optional vendorType filter
    // CRITICAL: If vendorType is not 'b2b', exclude B2B vendors
    // This ensures B2B vendors' products only show in B2B app, not in regular user app
    const vendorQuery = { isActive: true, status: 'approved' };
    if (vendorType) {
      // Use provided vendorType filter (e.g., 'b2b' or 'b2c')
      vendorQuery.vendorType = vendorType;
    } else {
      // When vendorType is not provided, exclude B2B vendors
      // This ensures regular user app doesn't show B2B vendors' products
      vendorQuery.vendorType = { $ne: 'b2b' };
    }

    // Add location filters (state and city)
    if (state && state.trim()) {
      vendorQuery['address.state'] = state.trim();
    }
    if (city && city.trim()) {
      vendorQuery['address.city'] = city.trim();
    }
    const activeVendors = await Vendor.find(vendorQuery).select('_id');
    const activeVendorIds = activeVendors.map(v => v._id);

    // Build query - only visible products from active vendors
    const query = {
      isVisible: true, // Only show visible products
      vendorId: { $in: activeVendorIds }
    };
    const andConditions = [];

    // Vendor filter
    if (vendorId) {
      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        return {
          products: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        };
      }
      const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
      if (!activeVendorIds.some(id => id.toString() === vendorObjectId.toString())) {
        return {
          products: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        };
      }
      query.vendorId = vendorObjectId;
    }

    // Search filter
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Category filter - intelligently check based on category depth
    // This ensures products are found correctly at each hierarchy level
    if (categoryId && categoryId !== 'all') {
      // Validate if categoryId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        // If not a valid ObjectId, return empty results instead of error
        return {
          products: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        };
      }

      const categoryObjectId = new mongoose.Types.ObjectId(categoryId);

      // Determine the depth/level of the category
      let categoryDepth = 1;
      try {
        categoryDepth = await getCategoryDepth(categoryId);
      } catch (error) {
        console.warn('⚠️ Could not determine category depth, defaulting to level 1:', error.message);
        categoryDepth = 1;
      }

      let categoryFilter;
      let checkingFields = [];

      // Build filter based on category depth:
      // Depth 1 (main category): Check categoryId OR subcategoryId OR subSubCategoryId (show all in category tree)
      // Depth 2 (subcategory): Check subcategoryId OR subSubCategoryId (show products in this subcategory and its sub-subcategories)
      // Depth 3+ (sub-subcategory): Check ONLY subSubCategoryId OR subcategoryId (exact match only, no parent categories)
      // Note: For sub-subcategories, we check both fields because products might be stored incorrectly,
      // but we DON'T check parent categories - only exact sub-subcategory match
      if (categoryDepth === 1) {
        // Main category - show all products in this category and its children
        categoryFilter = {
          $or: [
            { categoryId: categoryObjectId },
            { subcategoryId: categoryObjectId },
            { subSubCategoryId: categoryObjectId },
          ],
        };
        checkingFields = ['categoryId', 'subcategoryId', 'subSubCategoryId'];
      } else if (categoryDepth === 2) {
        // Subcategory - show products in this subcategory and its sub-subcategories
        categoryFilter = {
          $or: [
            { subcategoryId: categoryObjectId },
            { subSubCategoryId: categoryObjectId },
          ],
        };
        checkingFields = ['subcategoryId', 'subSubCategoryId'];
      } else {
        // Sub-subcategory (depth 3+) - check subSubCategoryId field
        // When a product is added with subcategory and sub-subcategory:
        // - categoryId: main category
        // - subcategoryId: subcategory
        // - subSubCategoryId: sub-subcategory
        // 
        // IMPORTANT: We check ONLY subSubCategoryId to ensure products show ONLY in the exact selected sub-subcategory
        // NOT in other sub-subcategories. This prevents products from showing in all sub-subcategories.
        // 
        // If products have subSubCategoryId = null, they won't show (which is correct behavior)
        // Products must have subSubCategoryId set to the exact sub-subcategory ID to show
        categoryFilter = {
          subSubCategoryId: categoryObjectId,
        };
        checkingFields = ['subSubCategoryId'];
      }

      andConditions.push(categoryFilter);
    }

    // Subcategory filter (if provided separately)
    // This filters products that have this subcategoryId OR subSubCategoryId
    if (subcategoryId && subcategoryId !== 'all') {
      // Validate if subcategoryId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
        // If not a valid ObjectId, return empty results instead of error
        return {
          products: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        };
      }
      const subcategoryObjectId = new mongoose.Types.ObjectId(subcategoryId);
      andConditions.push({
        $or: [
          { subcategoryId: subcategoryObjectId },
          { subSubCategoryId: subcategoryObjectId }, // Also check deepest subcategory
        ],
      });
    }

    // Brand filter
    if (brandId && brandId !== 'all') {
      // Validate if brandId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(brandId)) {
        // If not a valid ObjectId, return empty results instead of error
        return {
          products: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        };
      }
      query.brandId = new mongoose.Types.ObjectId(brandId);
    }

    // Price range filter
    if (minPrice) {
      query.price = { ...query.price, $gte: parseFloat(minPrice) };
    }
    if (maxPrice) {
      query.price = { ...query.price, $lte: parseFloat(maxPrice) };
    }

    // Rating filter
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Review count filter - only show products with at least this many reviews
    if (minReviewCount !== undefined && minReviewCount !== null) {
      query.reviewCount = { $gte: parseInt(minReviewCount) };
    }

    // isNew filter - for New Arrivals section
    if (isNew !== undefined && isNew !== null) {
      query.isNew = isNew === true || isNew === 'true';
    }

    // isTrending filter - for Trending Now section
    if (isTrending !== undefined && isTrending !== null) {
      query.isTrending = isTrending === true || isTrending === 'true';
    }

    // flashSale filter - for Flash Sale products
    if (flashSale !== undefined && flashSale !== null) {
      query.flashSale = flashSale === true || flashSale === 'true';
    }

    // Combine all AND conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categoryId', 'name image icon')
        .populate('subcategoryId', 'name image icon')
        .populate('subSubCategoryId', 'name image icon') // Also populate deepest subcategory
        .populate('brandId', 'name')
        .populate('vendorId', 'businessName storeName storeLogo isEmailVerified status address phone')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    // Sanitize product images - remove broken/invalid image URLs
    const sanitizedProducts = products.map(product => ({
      ...product,
      image: sanitizeImageUrl(product.image),
      images: sanitizeImageUrls(product.images || []),
    }));

    const result = {
      products: sanitizedProducts,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };

    // Cache the result for 10 minutes
    try {
      await redisService.set(cacheKey, result, 600);
    } catch (cacheError) {
      console.error('Redis SET error (getPublicProducts):', cacheError);
    }

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get public product by ID (only if visible)
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} Product object
 */
export const getPublicProductById = async (productId) => {
  try {
    const cacheKey = `product:details:${productId}`;
    try {
      const cachedProduct = await redisService.get(cacheKey);
      if (cachedProduct) return cachedProduct;
    } catch (cacheError) {
      console.error('Redis GET error (getPublicProductById):', cacheError);
    }

    const product = await Product.findOne({
      _id: productId,
      isVisible: true, // Only return if visible
    })
      .populate('categoryId', 'name image icon')
      .populate('subcategoryId', 'name image icon')
      .populate('brandId', 'name')
      .populate('vendorId', 'businessName storeName storeLogo isEmailVerified status address createdAt phone')
      .populate('attributes.attributeId', 'name type')
      .populate('attributes.values', 'value')
      .lean();

    if (!product) {
      throw new Error('Product not found or not available');
    }

    // Check if vendor is active and approved
    const vendor = await Vendor.findById(product.vendorId).select('isActive status');
    if (!vendor || !vendor.isActive || vendor.status !== 'approved') {
      throw new Error('Product is no longer available');
    }

    // Fetch FAQs for this product
    try {
      const faqResult = await getAllFAQs({
        productId: product._id.toString(),
        status: 'active',
        limit: 50,
      });
      product.faqs = faqResult.faqs || [];
    } catch (faqError) {
      console.error('Error fetching FAQs for product:', faqError);
      product.faqs = []; // Default to empty if FAQ fetch fails
    }

    // Sanitize product images - remove broken/invalid image URLs
    product.image = sanitizeImageUrl(product.image);
    product.images = sanitizeImageUrls(product.images || []);

    console.log('Public Product Fetch:', product._id, 'Brand:', product.brandId); // Debug logging

    // Cache the result for 1 hour
    try {
      await redisService.set(cacheKey, product, 3600);
    } catch (cacheError) {
      console.error('Redis SET error (getPublicProductById):', cacheError);
    }

    return product;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid product ID');
    }
    throw error;
  }
};

/**
 * Get B2B search suggestions (Categories, Subcategories, Products)
 * @param {String} keyword - Search keyword
 * @returns {Promise<Array>} List of suggestions
 */
export const getB2BSearchSuggestions = async (keyword) => {
  try {
    if (!keyword || keyword.trim().length < 1) return [];

    const query = keyword.trim();
    const regex = new RegExp(query, 'i');

    const suggestions = [];

    // 1. Get Matching B2B Categories & Subcategories
    const b2bCategories = await B2BCategory.find({
      isActive: true,
      $or: [
        { name: regex },
        { subcategories: regex }
      ]
    }).limit(10).lean();

    b2bCategories.forEach(cat => {
      // If category name matches
      if (cat.name.match(regex)) {
        suggestions.push({
          type: 'category',
          text: cat.name,
          category: cat.name,
          subcategory: null,
          display: cat.name,
          context: 'in B2B Categories'
        });
      }

      // If any subcategory matches
      if (cat.subcategories && Array.isArray(cat.subcategories)) {
        cat.subcategories.forEach(sub => {
          if (sub.match(regex)) {
            suggestions.push({
              type: 'subcategory',
              text: sub,
              category: cat.name,
              subcategory: sub,
              display: sub,
              context: `in ${cat.name}`
            });
          }
        });
      }
    });

    // 2. Get Matching B2B Products
    const b2bVendors = await Vendor.find({ vendorType: 'b2b', isActive: true, status: 'approved' }).select('_id');
    const b2bVendorIds = b2bVendors.map(v => v._id);

    const b2bProducts = await Product.find({
      vendorId: { $in: b2bVendorIds },
      isVisible: true,
      name: regex
    })
      .limit(10)
      .select('name image')
      .lean();

    b2bProducts.forEach(prod => {
      suggestions.push({
        type: 'product',
        text: prod.name,
        productId: prod._id,
        image: prod.image,
        display: prod.name,
        context: 'Product'
      });
    });

    // Sort by type priority (Category > Subcategory > Product) and remove duplicates
    const uniqueSuggestions = [];
    const seen = new Set();

    // Priority order and deduplication
    const sorted = suggestions.sort((a, b) => {
      const priority = { 'category': 1, 'subcategory': 2, 'product': 3 };
      return priority[a.type] - priority[b.type];
    });

    for (const s of sorted) {
      const key = `${s.type}:${s.text}:${s.category || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSuggestions.push(s);
      }
      if (uniqueSuggestions.length >= 10) break;
    }

    return uniqueSuggestions;
  } catch (error) {
    console.error('Error getting B2B suggestions:', error);
    return [];
  }
};

