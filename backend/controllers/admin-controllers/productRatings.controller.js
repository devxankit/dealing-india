import {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
} from '../../services/productRatings.service.js';

/**
 * Get all reviews/ratings
 * GET /api/admin/product-ratings
 */
export const getReviews = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search || '',
      status: req.query.status || 'all',
      productId: req.query.productId || 'all',
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
    };

    const result = await getAllReviews(filters);
    res.status(200).json({
      success: true,
      message: 'Reviews fetched successfully',
      data: result.reviews,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get review by ID
 * GET /api/admin/product-ratings/:id
 */
export const getReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await getReviewById(id);
    res.status(200).json({
      success: true,
      message: 'Review fetched successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create review
 * POST /api/admin/product-ratings
 */
export const create = async (req, res, next) => {
  try {
    const review = await createReview(req.body);
    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update review
 * PUT /api/admin/product-ratings/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await updateReview(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete review
 * DELETE /api/admin/product-ratings/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteReview(id);
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

