import {
  getVendorStock,
  updateVendorStock,
  getVendorStockStats,
} from '../../services/vendorStock.service.js';

/**
 * Get all products with stock info for vendor
 * GET /api/vendor/stock
 */
export const getStock = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const {
      search = '',
      stock,
      lowStockThreshold = 10,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getVendorStock(vendorId, {
      search,
      stock,
      lowStockThreshold: parseInt(lowStockThreshold),
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Stock information retrieved successfully',
      data: {
        products: result.products,
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update stock quantity for a product
 * PATCH /api/vendor/stock/:productId
 */
export const updateStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const vendorId = req.user.vendorId;
    const { stockQuantity, lowStockThreshold = 10 } = req.body;

    if (stockQuantity === undefined) {
      const err = new Error('Stock quantity is required');
      err.status = 400;
      throw err;
    }

    const product = await updateVendorStock(
      productId,
      stockQuantity,
      parseInt(lowStockThreshold),
      vendorId
    );

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock statistics for vendor
 * GET /api/vendor/stock/stats
 */
export const getStats = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { lowStockThreshold = 10 } = req.query;

    const stats = await getVendorStockStats(vendorId, parseInt(lowStockThreshold));

    res.status(200).json({
      success: true,
      message: 'Stock statistics retrieved successfully',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

