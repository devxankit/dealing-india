import api from '../../../shared/utils/api';

/**
 * Get all products with stock info for vendor
 * @param {Object} filters - { search, stock, lowStockThreshold, page, limit }
 * @returns {Promise<Object>} { products, pagination }
 */
export const getVendorStock = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.stock) params.append('stock', filters.stock);
  if (filters.lowStockThreshold) params.append('lowStockThreshold', filters.lowStockThreshold);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await api.get(`/vendor/stock?${params.toString()}`);
  return response.data;
};

/**
 * Update stock quantity for a product
 * @param {String} productId - Product ID
 * @param {Number} stockQuantity - New stock quantity
 * @param {Number} lowStockThreshold - Low stock threshold (optional)
 * @returns {Promise<Object>} Updated product
 */
export const updateVendorStock = async (productId, stockQuantity, lowStockThreshold) => {
  const response = await api.patch(`/vendor/stock/${productId}`, {
    stockQuantity,
    lowStockThreshold,
  });
  return response.data.product;
};

/**
 * Get stock statistics for vendor
 * @param {Number} lowStockThreshold - Low stock threshold (optional)
 * @returns {Promise<Object>} { stats }
 */
export const getVendorStockStats = async (lowStockThreshold) => {
  const params = new URLSearchParams();
  if (lowStockThreshold) params.append('lowStockThreshold', lowStockThreshold);

  const response = await api.get(`/vendor/stock/stats?${params.toString()}`);
  return response.data.stats;
};

