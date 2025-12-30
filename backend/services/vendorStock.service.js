import Product from '../models/Product.model.js';

/**
 * Get all products with stock info for vendor with optional filters
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { search, stock, lowStockThreshold, page, limit }
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
export const getVendorStock = async (vendorId, filters = {}) => {
  try {
    const {
      search = '',
      stock,
      lowStockThreshold = 10,
      page = 1,
      limit = 10,
    } = filters;

    // Build query - always filter by vendorId
    const query = { vendorId, isActive: true };
    const andConditions = [];

    // Search filter
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Stock status filter
    if (stock && stock !== 'all') {
      if (stock === 'low_stock') {
        // Low stock: quantity > 0 and <= threshold
        query.stockQuantity = { $gt: 0, $lte: parseInt(lowStockThreshold) };
      } else if (stock === 'out_of_stock') {
        // Out of stock: quantity === 0
        query.stockQuantity = 0;
      } else if (stock === 'in_stock') {
        // In stock: quantity > threshold
        query.stockQuantity = { $gt: parseInt(lowStockThreshold) };
      } else {
        query.stock = stock;
      }
    }

    // Combine all AND conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('_id name image price stock stockQuantity categoryId brandId')
        .populate('categoryId', 'name')
        .populate('brandId', 'name')
        .sort({ createdAt: -1 })
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
 * Update stock quantity for a product (vendor-owned only)
 * @param {String} productId - Product ID
 * @param {Number} stockQuantity - New stock quantity
 * @param {Number} lowStockThreshold - Low stock threshold (default: 10)
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated product
 */
export const updateVendorStock = async (productId, stockQuantity, lowStockThreshold = 10, vendorId) => {
  try {
    // Verify product exists and belongs to vendor
    const product = await Product.findOne({
      _id: productId,
      vendorId,
      isActive: true,
    });

    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    // Validate stock quantity
    const newStockQuantity = parseInt(stockQuantity);
    if (isNaN(newStockQuantity) || newStockQuantity < 0) {
      const err = new Error('Stock quantity must be a non-negative number');
      err.status = 400;
      throw err;
    }

    // Calculate stock status
    const stockStatus = newStockQuantity === 0 
      ? 'out_of_stock' 
      : newStockQuantity <= lowStockThreshold 
        ? 'low_stock' 
        : 'in_stock';

    // Update product stock
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        stockQuantity: newStockQuantity,
        stock: stockStatus,
      },
      { new: true }
    )
      .select('_id name image price stock stockQuantity categoryId brandId')
      .populate('categoryId', 'name')
      .populate('brandId', 'name')
      .lean();

    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

/**
 * Get stock statistics for vendor
 * @param {String} vendorId - Vendor ID
 * @param {Number} lowStockThreshold - Low stock threshold (default: 10)
 * @returns {Promise<Object>} { totalProducts, inStock, lowStock, outOfStock, totalValue }
 */
export const getVendorStockStats = async (vendorId, lowStockThreshold = 10) => {
  try {
    // Get all vendor products (no pagination for stats)
    const products = await Product.find({ vendorId, isActive: true })
      .select('price stockQuantity')
      .lean();

    const totalProducts = products.length;
    
    // Calculate statistics
    const inStock = products.filter(
      (p) => p.stockQuantity > parseInt(lowStockThreshold)
    ).length;
    
    const lowStock = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= parseInt(lowStockThreshold)
    ).length;
    
    const outOfStock = products.filter(
      (p) => p.stockQuantity === 0
    ).length;
    
    const totalValue = products.reduce(
      (sum, p) => sum + (p.price || 0) * (p.stockQuantity || 0),
      0
    );

    return {
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
      totalValue,
    };
  } catch (error) {
    throw error;
  }
};

