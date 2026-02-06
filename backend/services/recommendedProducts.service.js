import Product from '../models/Product.model.js';

/**
 * Get recommended products
 * Fallback to most recent/trending products if no user history
 */
export const getRecommendedProducts = async (userId, limit = 6) => {
    // Simple implementation: return most recent active products
    const products = await Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('categoryId', 'name')
        .populate('brandId', 'name')
        .populate('vendorId', 'businessName storeName');

    return products;
};
