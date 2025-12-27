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
      andConditions.push({
        $or: [
          { categoryId: categoryId },
          { subcategoryId: categoryId },
        ],
      });
    }

    // Subcategory filter (if provided separately)
    if (subcategoryId && subcategoryId !== 'all') {
      andConditions.push({
        subcategoryId: subcategoryId,
      });
    }

    // Brand filter
    if (brandId && brandId !== 'all') {
      query.brandId = brandId;
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
        .populate('vendorId', 'businessName storeName')
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
      .populate('vendorId', 'businessName storeName')
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

