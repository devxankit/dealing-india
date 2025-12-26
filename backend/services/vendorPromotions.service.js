import PromoCode from '../models/PromoCode.model.js';
import Product from '../models/Product.model.js';

/**
 * Get all available promotions (admin-created, active) for vendor
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { search, status, page, limit }
 * @returns {Promise<Object>} { promotions, total, page, totalPages }
 */
export const getVendorPromotions = async (vendorId, filters = {}) => {
  try {
    const {
      search = '',
      status,
      page = 1,
      limit = 10,
    } = filters;

    // Build query - only active promotions created by admin
    const query = {
      status: 'active',
    };

    const andConditions = [];

    // Search filter
    if (search) {
      andConditions.push({
        $or: [
          { code: { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Status filter (but vendors can only see active ones)
    if (status && status !== 'all' && status === 'active') {
      // Already filtered by active
    }

    // Date filter - only show promotions that are currently valid
    const now = new Date();
    andConditions.push({
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    // Usage limit check - exclude promotions that have reached their limit
    andConditions.push({
      $or: [
        { usageLimit: -1 }, // Unlimited
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }, // Not reached limit
      ],
    });

    // Combine all AND conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [promotions, total] = await Promise.all([
      PromoCode.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PromoCode.countDocuments(query),
    ]);

    // Filter promotions that might be applicable to vendor's products
    // (If promotion has productIds restriction, check if vendor has any matching products)
    const vendorProducts = await Product.find({
      vendorId,
      isActive: true,
    }).select('_id').lean();

    const vendorProductIds = vendorProducts.map(p => p._id.toString());

    // Note: PromoCode model doesn't have productIds field in the schema,
    // but frontend expects it. We'll return all active promotions.
    // If productIds filtering is needed, it should be added to PromoCode model.

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      promotions,
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
 * Get promotion by ID (admin-created, active only)
 * @param {String} promotionId - Promotion ID
 * @param {String} vendorId - Vendor ID (for validation, but not used in query)
 * @returns {Promise<Object>} Promotion object
 */
export const getVendorPromotionById = async (promotionId, vendorId) => {
  try {
    const now = new Date();

    const promotion = await PromoCode.findOne({
      _id: promotionId,
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { usageLimit: -1 },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
    })
      .populate('createdBy', 'name email')
      .lean();

    if (!promotion) {
      const err = new Error('Promotion not found or not available');
      err.status = 404;
      throw err;
    }

    return promotion;
  } catch (error) {
    throw error;
  }
};

