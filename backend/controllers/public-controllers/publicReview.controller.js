import { createReview as createReviewService, getProductReviews as getProductReviewsService } from '../../services/productRatings.service.js';

/**
 * Get reviews for a product
 * GET /api/reviews/product/:productId
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, status = 'approved' } = req.query;

    const result = await getProductReviewsService({
      productId,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      message: 'Reviews retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new review (public - can be anonymous)
 * POST /api/reviews
 */
export const createReview = async (req, res, next) => {
  try {
    const { productId, customerName, rating, review, userId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Create review with pending status (admin will approve)
    const newReview = await createReviewService({
      productId,
      customerName: customerName.trim(),
      rating: parseInt(rating),
      review: review || '',
      status: 'pending', // Reviews need admin approval
      userId: userId || null, // Optional - can be anonymous
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be visible after approval.',
      data: newReview,
    });
  } catch (error) {
    next(error);
  }
};

