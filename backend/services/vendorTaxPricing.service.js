import Product from '../models/Product.model.js';
import mongoose from 'mongoose';

/**
 * Get all products with pricing and tax info for vendor
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
export const getVendorProductsPricing = async (vendorId, filters = {}) => {
  try {
    const {
      page = 1,
      limit = 100,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query - always filter by vendorId
    const query = { vendorId, isActive: true };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('_id name price taxRate stockQuantity')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
    ]);

    // Transform products to match frontend expectations
    const transformedProducts = products.map((product) => ({
      ...product,
      id: product._id.toString(),
      _id: product._id.toString(),
      taxRate: product.taxRate || 0,
    }));

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      products: transformedProducts,
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
 * Update product price
 * @param {String} vendorId - Vendor ID
 * @param {String} productId - Product ID
 * @param {Number} price - New price
 * @returns {Promise<Object>} Updated product
 */
export const updateProductPrice = async (vendorId, productId, price) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const err = new Error('Invalid product ID format');
      err.status = 400;
      throw err;
    }

    if (price === undefined || price === null || price < 0) {
      const err = new Error('Price must be a non-negative number');
      err.status = 400;
      throw err;
    }

    const product = await Product.findOneAndUpdate(
      { _id: productId, vendorId },
      { price: parseFloat(price) },
      { new: true, runValidators: true }
    )
      .select('_id name price taxRate')
      .lean();

    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    return {
      ...product,
      id: product._id.toString(),
      _id: product._id.toString(),
    };
  } catch (error) {
    if (error.name === 'CastError') {
      const err = new Error('Invalid product ID');
      err.status = 400;
      throw err;
    }
    throw error;
  }
};

/**
 * Update product tax rate
 * @param {String} vendorId - Vendor ID
 * @param {String} productId - Product ID
 * @param {Number} taxRate - New tax rate (0-100)
 * @returns {Promise<Object>} Updated product
 */
export const updateProductTaxRate = async (vendorId, productId, taxRate) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const err = new Error('Invalid product ID format');
      err.status = 400;
      throw err;
    }

    if (taxRate === undefined || taxRate === null || taxRate < 0 || taxRate > 100) {
      const err = new Error('Tax rate must be between 0 and 100');
      err.status = 400;
      throw err;
    }

    const product = await Product.findOneAndUpdate(
      { _id: productId, vendorId },
      { taxRate: parseFloat(taxRate) },
      { new: true, runValidators: true }
    )
      .select('_id name price taxRate')
      .lean();

    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    return {
      ...product,
      id: product._id.toString(),
      _id: product._id.toString(),
    };
  } catch (error) {
    if (error.name === 'CastError') {
      const err = new Error('Invalid product ID');
      err.status = 400;
      throw err;
    }
    throw error;
  }
};

/**
 * Bulk update product prices
 * @param {String} vendorId - Vendor ID
 * @param {Array} updates - Array of { productId, price }
 * @returns {Promise<Object>} { updated, failed }
 */
export const bulkUpdateProductPrices = async (vendorId, updates) => {
  try {
    const updated = [];
    const failed = [];

    for (const update of updates) {
      try {
        if (!mongoose.Types.ObjectId.isValid(update.productId)) {
          failed.push({
            productId: update.productId,
            error: 'Invalid product ID format',
          });
          continue;
        }

        if (update.price === undefined || update.price === null || update.price < 0) {
          failed.push({
            productId: update.productId,
            error: 'Price must be a non-negative number',
          });
          continue;
        }

        const product = await Product.findOneAndUpdate(
          { _id: update.productId, vendorId },
          { price: parseFloat(update.price) },
          { new: true, runValidators: true }
        )
          .select('_id name price taxRate')
          .lean();

        if (!product) {
          failed.push({
            productId: update.productId,
            error: 'Product not found or does not belong to vendor',
          });
          continue;
        }

        updated.push({
          ...product,
          id: product._id.toString(),
          _id: product._id.toString(),
        });
      } catch (error) {
        failed.push({
          productId: update.productId,
          error: error.message || 'Update failed',
        });
      }
    }

    return { updated, failed };
  } catch (error) {
    throw error;
  }
};

