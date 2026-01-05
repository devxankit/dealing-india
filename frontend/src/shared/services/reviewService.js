import api from '../utils/api';

export const createReview = async (reviewData) => {
  try {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const checkReviewEligibility = async (productId) => {
  try {
    const response = await api.get(`/reviews/check/${productId}`);
    return response.data;
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getProductReviews = async (productId, page = 1) => {
  try {
    const response = await api.get(`/reviews/product/${productId}?page=${page}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
