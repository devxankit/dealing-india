import api from '../../../shared/utils/api';

/**
 * Get all reviews for vendor's products
 * @param {Object} filters - { search, rating, productId, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { reviews, pagination }
 */
export const getVendorReviews = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.rating) params.append('rating', filters.rating);
  if (filters.productId) params.append('productId', filters.productId);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await api.get(`/vendor/reviews?${params.toString()}`);
  // API interceptor returns response.data, so response is already { success, data: { reviews }, pagination }
  // Return response directly (it already has data and pagination)
  return response;
};

/**
 * Get review by ID
 * @param {String} reviewId - Review ID
 * @returns {Promise<Object>} Review object
 */
export const getVendorReviewById = async (reviewId) => {
  const response = await api.get(`/vendor/reviews/${reviewId}`);
  return response.data.review;
};

/**
 * Respond to review
 * @param {String} reviewId - Review ID
 * @param {String} response - Response text
 * @returns {Promise<Object>} Updated review
 */
export const respondToReview = async (reviewId, response) => {
  const responseData = await api.post(`/vendor/reviews/${reviewId}/respond`, { response });
  return responseData.data.review;
};

/**
 * Moderate review (hide or approve)
 * @param {String} reviewId - Review ID
 * @param {String} action - 'hide' or 'approve'
 * @returns {Promise<Object>} Updated review
 */
export const moderateReview = async (reviewId, action) => {
  const response = await api.patch(`/vendor/reviews/${reviewId}/moderate`, { action });
  return response.data.review;
};

