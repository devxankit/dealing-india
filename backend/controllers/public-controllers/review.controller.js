import * as reviewService from '../../services/review.service.js';
import redisService from '../../services/redis.service.js';

/**
 * Helper to clear review-related cache
 */
const clearReviewCache = async (productId = null) => {
    try {
        if (productId) {
            await redisService.clearPattern(`public:reviews:*${productId}*`);
        } else {
            await redisService.clearPattern('public:reviews:*');
        }
    } catch (error) {
        console.error('Error clearing review cache:', error);
    }
};

export const createReview = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { productId, orderId, rating, comment, review, images } = req.body;

        const result = await reviewService.createReview({
            userId,
            productId,
            orderId,
            rating,
            comment,
            review,
            images,
        });

        // Clear cache
        await clearReviewCache(productId);

        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const getProductReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await reviewService.getProductReviews(productId, page, limit);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const checkEligibility = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { productId } = req.params;

        const result = await reviewService.checkReviewEligibility(userId, productId);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
