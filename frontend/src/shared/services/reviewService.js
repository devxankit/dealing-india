import api from '../utils/api';

/**
 * Get reviews for a product
 * @param {String} productId - Product ID
 * @param {Object} options - { page, limit, status }
 * @returns {Promise<Object>} { reviews, total, page, totalPages }
 */
export const getProductReviews = async (productId, options = {}) => {
  try {
    const { page = 1, limit = 10, status = 'approved' } = options;
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    params.append('status', status);

    const response = await api.get(`/reviews/product/${productId}?${params.toString()}`);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    throw error;
  }
};

/**
 * Submit a review for a product
 * @param {Object} reviewData - { productId, customerName, rating, review, userId? }
 * @returns {Promise<Object>} Created review
 */
export const submitReview = async (reviewData) => {
  try {
    const { productId, customerName, rating, review, userId } = reviewData;

    if (!productId || !customerName || !rating) {
      throw new Error('Product ID, customer name, and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const response = await api.post('/reviews', {
      productId,
      customerName: customerName.trim(),
      rating: parseInt(rating),
      review: review || '',
      userId: userId || null,
    });

    return response.data || response;
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
};

