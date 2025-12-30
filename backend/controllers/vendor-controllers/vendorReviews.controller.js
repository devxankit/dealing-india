import {
  getVendorReviews,
  getVendorReviewById,
  respondToReview,
  moderateReview,
} from '../../services/vendorReviews.service.js';

/**
 * Get all reviews for vendor's products
 * GET /api/vendor/reviews
 */
export const getReviews = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const {
      search = '',
      rating,
      productId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getVendorReviews(vendorId, {
      search,
      rating,
      productId,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Reviews retrieved successfully',
      data: {
        reviews: result.reviews,
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get review by ID
 * GET /api/vendor/reviews/:id
 */
export const getReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    const review = await getVendorReviewById(id, vendorId);

    res.status(200).json({
      success: true,
      message: 'Review retrieved successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Respond to review
 * POST /api/vendor/reviews/:id/respond
 */
export const respond = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;
    const { response } = req.body;

    if (!response || !response.trim()) {
      const err = new Error('Response text is required');
      err.status = 400;
      throw err;
    }

    const review = await respondToReview(id, response, vendorId);

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Moderate review (hide or approve)
 * PATCH /api/vendor/reviews/:id/moderate
 */
export const moderate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;
    const { action } = req.body;

    if (!action || !['hide', 'approve'].includes(action)) {
      const err = new Error('Action must be "hide" or "approve"');
      err.status = 400;
      throw err;
    }

    const review = await moderateReview(id, action, vendorId);

    res.status(200).json({
      success: true,
      message: `Review ${action === 'hide' ? 'hidden' : 'approved'} successfully`,
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

