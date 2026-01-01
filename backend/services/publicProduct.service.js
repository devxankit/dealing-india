import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Brand from '../models/Brand.model.js';

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

    // Category filter - check categoryId, subcategoryId, and subSubCategoryId
    // This ensures products in any level of category hierarchy are found
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
      const categoryFilter = {
        $or: [
          { categoryId: categoryObjectId },
          { subcategoryId: categoryObjectId },
          { subSubCategoryId: categoryObjectId },
        ],
      };
      andConditions.push(categoryFilter);
      console.log('📦 Category filter applied:', {
        categoryId: categoryId,
        checkingFields: ['categoryId', 'subcategoryId', 'subSubCategoryId'],
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

