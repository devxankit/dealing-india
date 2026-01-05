import * as reviewService from '../../services/review.service.js';

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
