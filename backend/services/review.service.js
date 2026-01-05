import Review from '../models/Review.model.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import mongoose from 'mongoose';

/**
 * Create a new review
 * @param {Object} data - { userId, productId, orderId, rating, comment, images }
 */
export const createReview = async (data) => {
    const { userId, productId, orderId, rating, comment, review, images } = data; // use review field

    // 1. Verify Verification

    const order = await Order.findOne({
        _id: orderId,
        customerId: userId,
        status: 'delivered',
    });


    if (!order) {

        throw new Error('You can only review products from delivered orders.');
    }

    // 2. Verify Product is in Order
    const productInOrder = order.items.some(
        (item) => item.productId.toString() === productId.toString()
    );


    if (!productInOrder) {
        throw new Error('This product is not part of the order.');
    }

    // 3. Create Review
    const finalReviewText = review || comment || '';


    const reviewDoc = await Review.create({
        userId,
        productId,
        orderId,
        rating,
        review: finalReviewText,
        comment: finalReviewText, // Backward compatibility if model has both
        images,
        status: 'approved', // Auto-approve for now
        customerName: order.shippingAddress?.name || 'Customer'
    });


    // 4. Update Product Aggregates
    await updateProductRating(productId);


    return reviewDoc;
};

/**
 * Get reviews for a product
 */
export const getProductReviews = async (productId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ productId }) // Removing strict approval filter for visibility testing
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name avatar');

    const total = await Review.countDocuments({ productId });

    return {
        reviews,
        total,
        page,
        pages: Math.ceil(total / limit),
    };
};

/**
 * Check if a user can review a product
 */
export const checkReviewEligibility = async (userId, productId) => {
    // Find a delivered order containing this product for this user
    // that hasn't been reviewed yet.

    // First, find all eligible orders
    const orders = await Order.find({
        customerId: userId,
        status: 'delivered',
        'items.productId': productId,
    }).select('_id');

    if (orders.length === 0) {
        return { canReview: false, message: 'No delivered order found for this product.' };
    }

    // Check if any of these orders verify for a review
    for (const order of orders) {
        const existingReview = await Review.exists({
            userId,
            productId,
            orderId: order._id
        });

        if (!existingReview) {
            return { canReview: true, orderId: order._id };
        }
    }

    return { canReview: false, message: 'You have already reviewed this product for all your orders.' };
};

/**
 * Inner Helper: Update Product Average Rating
 */
const updateProductRating = async (productId) => {
    const stats = await Review.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(productId) } },
        {
            $group: {
                _id: '$productId',
                avgRating: { $avg: '$rating' },
                count: { $sum: 1 },
            },
        },
    ]);

    if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            rating: parseFloat(stats[0].avgRating.toFixed(1)),
            reviewCount: stats[0].count,
        });
    } else {
        await Product.findByIdAndUpdate(productId, {
            rating: 0,
            reviewCount: 0,
        });
    }
};
