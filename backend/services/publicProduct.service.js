import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Brand from '../models/Brand.model.js';
import { getCategoryDepth } from './categoryManagement.service.js';

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
      vendorId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query - only visible products
    const query = {
      isVisible: true, // Only show visible products
    };
    const andConditions = [];
    
    console.log('🔍 Fetching products with filters:', {
      categoryId,
      subcategoryId,
      search,
      vendorId,
    });

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
      query.vendorId = new mongoose.Types.ObjectId(vendorId);
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
      console.log('📦 Category filter applied:', {
        categoryId: categoryId,
        depth: categoryDepth,
        checkingFields: checkingFields,
        filterQuery: JSON.stringify(categoryFilter),
      });
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

    // Combine all AND conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }
    
    console.log('🔎 Final MongoDB query:', JSON.stringify(query, null, 2));

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
        .populate('vendorId', 'businessName storeName storeLogo isEmailVerified status')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
    ]);

    console.log(`✅ Found ${products.length} products (total: ${total}) for category: ${categoryId || 'all'}`);
    
    // Debug: Check all products with subSubCategoryId to understand data structure
    if (categoryId && categoryId !== 'all') {
      try {
        const debugProducts = await Product.find({ isVisible: true })
          .select('name categoryId subcategoryId subSubCategoryId')
          .populate('categoryId', 'name')
          .populate('subcategoryId', 'name')
          .populate('subSubCategoryId', 'name')
          .limit(10)
          .lean();
        console.log('🔍 Debug - Sample products in database:', debugProducts.map(p => ({
          name: p.name,
          categoryId: p.categoryId?._id?.toString() || p.categoryId?.toString() || null,
          subcategoryId: p.subcategoryId?._id?.toString() || p.subcategoryId?.toString() || null,
          subSubCategoryId: p.subSubCategoryId?._id?.toString() || p.subSubCategoryId?.toString() || null,
        })));
      } catch (error) {
        console.warn('⚠️ Debug query failed:', error.message);
      }
    }
    
    if (products.length > 0) {
      console.log('📦 Sample product categories:', products.slice(0, 3).map(p => ({
        name: p.name,
        categoryId: p.categoryId?._id || p.categoryId,
        subcategoryId: p.subcategoryId?._id || p.subcategoryId,
        subSubCategoryId: p.subSubCategoryId?._id || p.subSubCategoryId,
      })));
    }

    console.log(`✅ Found ${products.length} products (total: ${total}) for category: ${categoryId || 'all'}`);

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
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
    const product = await Product.findOne({
      _id: productId,
      isVisible: true, // Only return if visible
    })
      .populate('categoryId', 'name image icon')
      .populate('subcategoryId', 'name image icon')
      .populate('brandId', 'name')
      .populate('vendorId', 'businessName storeName storeLogo isEmailVerified status')
      .lean();

    if (!product) {
      throw new Error('Product not found or not available');
    }

    return product;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid product ID');
    }
    throw error;
  }
};

