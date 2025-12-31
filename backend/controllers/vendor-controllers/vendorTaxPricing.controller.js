import {
  getVendorProductsPricing,
  updateProductPrice,
  updateProductTaxRate,
  bulkUpdateProductPrices,
  getActiveTaxRules,
  bulkApplyTaxRate,
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

/**
 * Get active tax rules for vendor
 * GET /api/vendor/tax-pricing/tax-rules
 */
export const getTaxRules = async (req, res, next) => {
  try {
    const taxRules = await getActiveTaxRules();
    res.status(200).json({
      success: true,
      message: 'Tax rules fetched successfully',
      data: { taxRules },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk apply tax rate to products
 * POST /api/vendor/tax-pricing/products/bulk-apply-tax
 */
export const bulkApplyTax = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    const { taxRate, productIds } = req.body;
    
    if (taxRate === undefined || taxRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Tax rate is required',
      });
    }

    const result = await bulkApplyTaxRate(vendorId, taxRate, productIds || []);
    res.status(200).json({
      success: true,
      message: `Tax rate applied to ${result.count} products`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

