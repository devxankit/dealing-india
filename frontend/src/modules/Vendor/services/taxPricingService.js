import api from '../../../shared/utils/api';

/**
 * Get all products with pricing info
 * @param {Object} filters - { page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { products, pagination }
 */
export const getVendorProductsPricing = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await api.get(`/vendor/tax-pricing/products?${params.toString()}`);
  // API interceptor returns response.data, so response is already { success, data: { products, pagination } }
  // Return the data object directly
  return response.data || response;
};

/**
 * Update product price
 * @param {String} productId - Product ID
 * @param {Number} price - New price
 * @returns {Promise<Object>} Updated product
 */
export const updateProductPrice = async (productId, price) => {
  const response = await api.patch(`/vendor/tax-pricing/products/${productId}/price`, { price });
  return response.data.product;
};

/**
 * Update product tax rate
 * @param {String} productId - Product ID
 * @param {Number} taxRate - New tax rate (0-100)
 * @returns {Promise<Object>} Updated product
 */
export const updateProductTaxRate = async (productId, taxRate) => {
  const response = await api.patch(`/vendor/tax-pricing/products/${productId}/tax-rate`, { taxRate });
  return response.data.product;
};

/**
 * Bulk update product prices
 * @param {Array} updates - Array of { productId, price }
 * @returns {Promise<Object>} { updated, failed }
 */
export const bulkUpdateProductPrices = async (updates) => {
  const response = await api.post('/vendor/tax-pricing/products/bulk-update', { updates });
  return response.data;
};

/**
 * Get active tax rules (admin created tax rules)
 * @returns {Promise<Array>} Array of active tax rules
 */
export const getActiveTaxRules = async () => {
  const response = await api.get('/vendor/tax-pricing/tax-rules');
  return response.data?.taxRules || [];
};

/**
 * Bulk apply tax rate to products
 * @param {Number} taxRate - Tax rate to apply (0-100)
 * @param {Array} productIds - Array of product IDs (empty = all products)
 * @returns {Promise<Object>} { updated, failed, count }
 */
export const bulkApplyTaxRate = async (taxRate, productIds = []) => {
  const response = await api.post('/vendor/tax-pricing/products/bulk-apply-tax', {
    taxRate,
    productIds,
  });
  return response.data;
};

