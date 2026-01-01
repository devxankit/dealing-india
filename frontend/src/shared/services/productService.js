import api from '../utils/api';

/**
 * Get all public products with filters
 * @param {Object} filters - { search, categoryId, subcategoryId, brandId, minPrice, maxPrice, minRating, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
export const getProducts = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.subcategoryId) params.append('subcategoryId', filters.subcategoryId);
    if (filters.brandId) params.append('brandId', filters.brandId);
    if (filters.vendorId) params.append('vendorId', filters.vendorId);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.minRating) params.append('minRating', filters.minRating);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    // API interceptor returns response.data, so response is already the data object
    // Backend returns: { success, message, data: { products, total, page, totalPages } }
    const response = await api.get(`/products?${params.toString()}`);
    // Extract data from response structure
    return response.data || { products: [], total: 0, page: 1, totalPages: 0 };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

/**
 * Get products by category ID
 * @param {String|Number} categoryId - Category ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
export const getProductsByCategory = async (categoryId, filters = {}) => {
  return getProducts({
    ...filters,
    categoryId: categoryId?.toString(),
  });
};

/**
 * Get products by subcategory ID
 * @param {String|Number} subcategoryId - Subcategory ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
export const getProductsBySubcategory = async (subcategoryId, filters = {}) => {
  return getProducts({
    ...filters,
    subcategoryId: subcategoryId?.toString(),
  });
};

/**
 * Get product by ID
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} Product object
 */
export const getProductById = async (productId) => {
  try {
    // API interceptor returns response.data, so response is already the data object
    // Backend returns: { success, message, data: { product } }
    const response = await api.get(`/products/${productId}`);
    return response.data?.product || response.product;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

