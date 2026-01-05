import {
  getVendorPromotions,
  getVendorPromotionById,
} from '../../services/vendorPromotions.service.js';
import { getActivePromoCodesForVendors } from '../../services/promoCode.service.js';

/**
 * Get all available promotions (admin-created, active)
 * GET /api/vendor/promotions
 */
export const getPromotions = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const {
      search = '',
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getVendorPromotions(vendorId, {
      search,
      status,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Promotions retrieved successfully',
      data: {
        promotions: result.promotions,
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
 * Get promotion by ID
 * GET /api/vendor/promotions/:id
 */
export const getPromotion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    const promotion = await getVendorPromotionById(id, vendorId);

    res.status(200).json({
      success: true,
      message: 'Promotion retrieved successfully',
      data: { promotion },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active coupons for product eligibility selection
 * GET /api/vendor/promotions/active-coupons
 */
export const getActiveCoupons = async (req, res, next) => {
  try {
    const coupons = await getActivePromoCodesForVendors();
    res.status(200).json({
      success: true,
      message: 'Active coupons retrieved successfully',
      data: { coupons },
    });
  } catch (error) {
    next(error);
  }
};

