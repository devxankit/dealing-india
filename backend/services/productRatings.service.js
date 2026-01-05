import Review from '../models/Review.model.js';
import Product from '../models/Product.model.js';

/**
 * Get all reviews/ratings with filters
 * @param {Object} filters - { search, status, productId, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { reviews, total, page, totalPages }
 */
export const getAllReviews = async (filters = {}) => {
  try {
    const {
      search = '',
      status,
      productId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Product filter
    if (productId && productId !== 'all') {
      query.productId = productId;
    }

    // Search filter
    if (search && search.trim()) {
      query.$or = [
        { customerName: { $regex: search.trim(), $options: 'i' } },
        { review: { $regex: search.trim(), $options: 'i' } },
        { customerEmail: { $regex: search.trim(), $options: 'i' } },
      ];
      
      // Also search in populated product name
      // We'll handle this after populate by filtering in memory if needed
      // For now, we'll search in productId by doing a separate query if needed
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('productId', 'name')
        .populate('userId', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments(query),
    ]);

    // Transform reviews to match frontend expectations
    const transformedReviews = reviews.map((review) => {
      // Handle productId - it can be populated (object) or just an ObjectId
      const productIdValue = review.productId?._id 
        ? review.productId._id.toString() 
        : (review.productId?.toString() || review.productId);
      
      const productNameValue = review.productId?.name || 'Unknown Product';
      
      // Handle userId - it can be populated (object) or just an ObjectId
      const userIdValue = review.userId?._id 
        ? review.userId._id.toString() 
        : (review.userId?.toString() || review.userId);
      
      return {
        ...review,
        _id: review._id,
        id: review._id?.toString() || review.id,
        productName: productNameValue,
        productId: productIdValue,
        customerName: review.customerName || 'Unknown Customer',
        customerEmail: review.customerEmail || review.userId?.email || null,
        rating: review.rating || 0,
        review: review.review || review.comment || '',
        date: review.createdAt || review.date || new Date(),
        status: review.status || 'pending',
      };
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      reviews: transformedReviews,
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
 * Get reviews for a specific product
 * @param {Object} filters - { productId, status, page, limit }
 * @returns {Promise<Object>} { reviews, total, page, totalPages }
 */
export const getProductReviews = async (filters = {}) => {
  try {
    const {
      productId,
      status = 'approved',
      page = 1,
      limit = 10,
    } = filters;

    if (!productId) {
      throw new Error('Product ID is required');
    }

    const query = { productId };

    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments(query),
    ]);

    const transformedReviews = reviews.map((review) => ({
      ...review,
      id: review._id,
      customerName: review.customerName,
      rating: review.rating,
      review: review.review || '',
      date: review.createdAt,
      status: review.status,
    }));

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      reviews: transformedReviews,
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
 * Get review by ID
 * @param {String} reviewId - Review ID
 * @returns {Promise<Object>} Review object
 */
export const getReviewById = async (reviewId) => {
  try {
    const review = await Review.findById(reviewId)
      .populate('productId', 'name')
      .populate('userId', 'name email')
      .lean();

    if (!review) {
      throw new Error('Review not found');
    }

    return {
      ...review,
      id: review._id,
      productName: review.productId?.name || 'Unknown Product',
      productId: review.productId?._id || review.productId,
      customerName: review.customerName,
      rating: review.rating,
      review: review.review || '',
      date: review.createdAt,
      status: review.status,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid review ID');
    }
    throw error;
  }
};

/**
 * Create a new review
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} Created review
 */
export const createReview = async (reviewData) => {
  try {
    const { productId, customerName, rating, review, status, userId } = reviewData;

    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (!customerName || !customerName.trim()) {
      throw new Error('Customer name is required');
    }
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const newReview = await Review.create({
      productId,
      userId: userId || null,
      customerName: customerName.trim(),
      rating: parseInt(rating),
      review: review || '',
      status: status || 'pending',
    });

    // Update product rating and review count
    await updateProductRating(productId);

    return newReview.toObject();
  } catch (error) {
    throw error;
  }
};

/**
 * Update review
 * @param {String} reviewId - Review ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated review
 */
export const updateReview = async (reviewId, updateData) => {
  try {
    const { customerName, rating, review, status } = updateData;

    const updateObj = {};
    if (customerName !== undefined) updateObj.customerName = customerName.trim();
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      updateObj.rating = parseInt(rating);
    }
    if (review !== undefined) updateObj.review = review || '';
    if (status !== undefined) updateObj.status = status;

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      updateObj,
      { new: true, runValidators: true }
    )
      .populate('productId', 'name')
      .populate('userId', 'name email')
      .lean();

    if (!updatedReview) {
      throw new Error('Review not found');
    }

    // Update product rating if rating changed
    if (rating !== undefined) {
      await updateProductRating(updatedReview.productId);
    }

    return {
      ...updatedReview,
      id: updatedReview._id,
      productName: updatedReview.productId?.name || 'Unknown Product',
      productId: updatedReview.productId?._id || updatedReview.productId,
      date: updatedReview.createdAt,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid review ID');
    }
    throw error;
  }
};

/**
 * Delete review
 * @param {String} reviewId - Review ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteReview = async (reviewId) => {
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(reviewId);

    // Update product rating
    await updateProductRating(productId);

    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid review ID');
    }
    throw error;
  }
};

/**
 * Update product rating and review count
 * @param {String} productId - Product ID
 */
const updateProductRating = async (productId) => {
  try {
    const reviews = await Review.find({
      productId,
      status: 'approved',
    }).lean();

    if (reviews.length === 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: 0,
        reviewCount: 0,
      });
      return;
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviews.length,
    });
  } catch (error) {
    // Don't throw error, just log it
    console.error('Error updating product rating:', error);
  }
};

