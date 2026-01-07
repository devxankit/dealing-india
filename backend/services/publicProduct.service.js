import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Brand from '../models/Brand.model.js';
import Vendor from '../models/Vendor.model.js';
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
    } = filters;

    // Get active and approved vendors
    const activeVendors = await Vendor.find({ isActive: true, status: 'approved' }).select('_id');
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
        .populate('vendorId', 'businessName storeName storeLogo isEmailVerified status')
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

    return {
      products: sanitizedProducts,
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

    return product;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid product ID');
    }
    throw error;
  }
};

