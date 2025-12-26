import Review from '../models/Review.model.js';
import Product from '../models/Product.model.js';

/**
 * Get all reviews for vendor's products with optional filters
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { search, rating, productId, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { reviews, total, page, totalPages }
 */
export const getVendorReviews = async (vendorId, filters = {}) => {
  try {
    const {
      search = '',
      rating,
      productId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // First, get all product IDs for this vendor
    const vendorProducts = await Product.find({
      vendorId,
      isActive: true,
    }).select('_id').lean();

    const vendorProductIds = vendorProducts.map(p => p._id);

    if (vendorProductIds.length === 0) {
      return {
        reviews: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
      };
    }

    // Build query
    const query = { productId: { $in: vendorProductIds } };
    const andConditions = [];

    // Search filter
    if (search) {
      andConditions.push({
        $or: [
          { customerName: { $regex: search, $options: 'i' } },
          { review: { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Rating filter
    if (rating && rating !== 'all') {
      query.rating = parseInt(rating);
    }

    // Product filter
    if (productId && productId !== 'all') {
      // Verify product belongs to vendor
      if (vendorProductIds.some(id => id.toString() === productId)) {
        query.productId = productId;
      } else {
        // Product doesn't belong to vendor, return empty
        return {
          reviews: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        };
      }
    }

    // Combine all AND conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('productId', 'name image')
        .populate('userId', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments(query),
    ]);

    // Enrich reviews with product name and customer email
    const enrichedReviews = reviews.map(review => ({
      ...review,
      productName: review.productId?.name || '',
      customerEmail: review.userId?.email || review.customerEmail || '',
      comment: review.review || '',
    }));

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      reviews: enrichedReviews,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get review by ID (for vendor's products only)
 * @param {String} reviewId - Review ID
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Review object
 */
export const getVendorReviewById = async (reviewId, vendorId) => {
  try {
    // First verify product belongs to vendor
    const review = await Review.findById(reviewId)
      .populate('productId', 'name image vendorId')
      .populate('userId', 'name email')
      .lean();

    if (!review) {
      const err = new Error('Review not found');
      err.status = 404;
      throw err;
    }

    // Verify product belongs to vendor
    if (review.productId?.vendorId?.toString() !== vendorId) {
      const err = new Error('Review not found');
      err.status = 404;
      throw err;
    }

    return {
      ...review,
      productName: review.productId?.name || '',
      customerEmail: review.userId?.email || review.customerEmail || '',
      comment: review.review || '',
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Add vendor response to review
 * @param {String} reviewId - Review ID
 * @param {String} response - Vendor response text
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated review
 */
export const respondToReview = async (reviewId, response, vendorId) => {
  try {
    // Verify review exists and product belongs to vendor
    const review = await Review.findById(reviewId)
      .populate('productId', 'vendorId');

    if (!review) {
      const err = new Error('Review not found');
      err.status = 404;
      throw err;
    }

    // Verify product belongs to vendor
    if (review.productId?.vendorId?.toString() !== vendorId) {
      const err = new Error('Review not found');
      err.status = 404;
      throw err;
    }

    // Update review with vendor response
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      {
        vendorResponse: response.trim(),
        responseDate: new Date(),
      },
      { new: true }
    )
      .populate('productId', 'name image')
      .populate('userId', 'name email')
      .lean();

    return {
      ...updatedReview,
      productName: updatedReview.productId?.name || '',
      customerEmail: updatedReview.userId?.email || updatedReview.customerEmail || '',
      comment: updatedReview.review || '',
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Moderate review (hide or approve)
 * @param {String} reviewId - Review ID
 * @param {String} action - 'hide' or 'approve'
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated review
 */
export const moderateReview = async (reviewId, action, vendorId) => {
  try {
    // Verify review exists and product belongs to vendor
    const review = await Review.findById(reviewId)
      .populate('productId', 'vendorId');

    if (!review) {
      const err = new Error('Review not found');
      err.status = 404;
      throw err;
    }

    // Verify product belongs to vendor
    if (review.productId?.vendorId?.toString() !== vendorId) {
      const err = new Error('Review not found');
      err.status = 404;
      throw err;
    }

    // Determine new status
    let newStatus;
    if (action === 'hide') {
      newStatus = 'hidden';
    } else if (action === 'approve') {
      newStatus = 'approved';
    } else {
      const err = new Error('Invalid action. Use "hide" or "approve"');
      err.status = 400;
      throw err;
    }

    // Update review status
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { status: newStatus },
      { new: true }
    )
      .populate('productId', 'name image')
      .populate('userId', 'name email')
      .lean();

    return {
      ...updatedReview,
      productName: updatedReview.productId?.name || '',
      customerEmail: updatedReview.userId?.email || updatedReview.customerEmail || '',
      comment: updatedReview.review || '',
    };
  } catch (error) {
    throw error;
  }
};

