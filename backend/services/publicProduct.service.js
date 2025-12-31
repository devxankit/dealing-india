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

    // Category filter - check both categoryId and subcategoryId
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
      andConditions.push({
        $or: [
          { categoryId: new mongoose.Types.ObjectId(categoryId) },
          { subcategoryId: new mongoose.Types.ObjectId(categoryId) },
        ],
      });
    }

    // Subcategory filter (if provided separately)
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
      andConditions.push({
        subcategoryId: new mongoose.Types.ObjectId(subcategoryId),
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
        .populate('brandId', 'name')
        .populate('vendorId', 'businessName storeName storeLogo isEmailVerified status')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
    ]);

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

