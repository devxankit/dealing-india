import {
  getVendorProductsPricing,
  updateProductPrice,
  updateProductTaxRate,
  bulkUpdateProductPrices,
} from '../../services/vendorTaxPricing.service.js';

/**
 * Get all products with pricing info
 * GET /api/vendor/tax-pricing/products
 */
export const getProducts = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 100,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
    };

    const result = await getVendorProductsPricing(vendorId, filters);
    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: {
        products: result.products,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product price
 * PATCH /api/vendor/tax-pricing/products/:id/price
 */
export const updatePrice = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    const { price } = req.body;
    const product = await updateProductPrice(vendorId, req.params.id, price);
    res.status(200).json({
      success: true,
      message: 'Product price updated successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product tax rate
 * PATCH /api/vendor/tax-pricing/products/:id/tax-rate
 */
export const updateTaxRate = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    const { taxRate } = req.body;
    const product = await updateProductTaxRate(vendorId, req.params.id, taxRate);
    res.status(200).json({
      success: true,
      message: 'Product tax rate updated successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update product prices
 * POST /api/vendor/tax-pricing/products/bulk-update
 */
export const bulkUpdatePrices = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required',
      });
    }

    const result = await bulkUpdateProductPrices(vendorId, updates);
    res.status(200).json({
      success: true,
      message: `Updated ${result.updated.length} products`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

