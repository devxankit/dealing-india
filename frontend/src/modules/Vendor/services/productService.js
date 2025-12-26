import api from '../../../shared/utils/api';

/**
 * Get all products for vendor
 * @param {Object} filters - { search, stock, categoryId, brandId, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { products, pagination }
 */
export const getVendorProducts = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.stock) params.append('stock', filters.stock);
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.brandId) params.append('brandId', filters.brandId);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await api.get(`/vendor/products?${params.toString()}`);
  return response.data || response;
};

/**
 * Get product by ID
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} Product object
 */
export const getVendorProductById = async (productId) => {
  const response = await api.get(`/vendor/products/${productId}`);
  return response.data?.product || response.product;
};

/**
 * Create new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export const createVendorProduct = async (productData) => {
  const response = await api.post('/vendor/products', productData);
  return response.data?.product || response.product;
};

/**
 * Update product
 * @param {String} productId - Product ID
 * @param {Object} productData - Update data
 * @returns {Promise<Object>} Updated product
 */
export const updateVendorProduct = async (productId, productData) => {
  const response = await api.put(`/vendor/products/${productId}`, productData);
  return response.data?.product || response.product;
};

/**
 * Delete product
 * @param {String} productId - Product ID
 * @returns {Promise<void>}
 */
export const deleteVendorProduct = async (productId) => {
  await api.delete(`/vendor/products/${productId}`);
};

/**
 * Update product status
 * @param {String} productId - Product ID
 * @param {Object} statusData - { isVisible?, stock? }
 * @returns {Promise<Object>} Updated product
 */
export const updateVendorProductStatus = async (productId, statusData) => {
  const response = await api.patch(`/vendor/products/${productId}/status`, statusData);
  return response.data.product;
};

/**
 * Bulk upload products
 * @param {Array} products - Array of product data
 * @returns {Promise<Object>} { success, failed, errors }
 */
export const bulkUploadVendorProducts = async (products) => {
  const response = await api.post('/vendor/products/bulk-upload', { products });
  return response.data || response;
};

