import { getRecommendedProducts } from '../../services/recommendedProducts.service.js';
import { verifyToken } from '../../utils/jwt.util.js';

/**
 * Get recommended products for user
 * GET /api/products/recommended
 * Authentication is optional - if user is logged in, recommendations will be personalized
 */
export const getRecommended = async (req, res, next) => {
  try {
    let userId = null;
    
    // Try to get user ID from token if present (optional authentication)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        userId = decoded?.userId || decoded?.id || null;
      } catch (tokenError) {
        // Token invalid or expired, continue without user
        userId = null;
      }
    }

    const limit = parseInt(req.query.limit) || 6;

    const products = await getRecommendedProducts(userId, limit);

    res.status(200).json({
      success: true,
      message: 'Recommended products retrieved successfully',
      data: {
        products,
        total: products.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

