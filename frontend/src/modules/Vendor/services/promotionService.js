import api from '../../../shared/utils/api';

/**
 * Get all available promotions (admin-created, active)
 * @param {Object} filters - { search, status, page, limit }
 * @returns {Promise<Object>} { promotions, pagination }
 */
export const getVendorPromotions = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await api.get(`/vendor/promotions?${params.toString()}`);
  // API interceptor returns response.data, so response is already { success, data: { promotions }, pagination }
  // Return response directly (it already has data and pagination)
  return response;
};

/**
 * Get promotion by ID
 * @param {String} promotionId - Promotion ID
 * @returns {Promise<Object>} Promotion object
 */
export const getVendorPromotionById = async (promotionId) => {
  const response = await api.get(`/vendor/promotions/${promotionId}`);
  return response.data.promotion;
};

