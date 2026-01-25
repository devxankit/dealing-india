import PromoCode from '../models/PromoCode.model.js';
import Product from '../models/Product.model.js';
import redisService from './redis.service.js';

/**
 * Get all promo codes with optional filters
 * @param {Object} filters - Filter options (search, status)
 * @returns {Promise<Array>} Array of promo codes
 */
export const getAllPromoCodes = async (filters = {}) => {
  try {
    const { search, status } = filters;
    const query = {};

    // Try to get from cache first if status is active
    const isPublicSearch = status === 'active' && !search;
    const cacheKey = `promocodes:active`;
    if (isPublicSearch) {
      try {
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) return cachedData;
      } catch (cacheError) {
        console.error('Redis GET error (getAllPromoCodes):', cacheError);
      }
    }

    // Search filter
    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    const promoCodes = await PromoCode.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Update expired status for codes that are past end date
    const now = new Date();
    for (const code of promoCodes) {
      if (code.status === 'active' && now > code.endDate) {
        code.status = 'expired';
        await code.save();
      }
    }

    if (isPublicSearch) {
      try {
        await redisService.set(cacheKey, promoCodes, 3600); // Cache for 1 hour
      } catch (cacheError) {
        console.error('Redis SET error (getAllPromoCodes):', cacheError);
      }
    }

    return promoCodes;
  } catch (error) {
    throw error;
  }
};

/**
 * Get promo code by ID
 * @param {String} id - Promo code ID
 * @returns {Promise<Object>} Promo code object
 */
export const getPromoCodeById = async (id) => {
  try {
    const promoCode = await PromoCode.findById(id).populate('createdBy', 'name email');
    if (!promoCode) {
      const err = new Error('Promo code not found');
      err.status = 404;
      throw err;
    }
    return promoCode;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new promo code
 * @param {Object} data - Promo code data
 * @param {String} adminId - Admin ID who is creating
 * @returns {Promise<Object>} Created promo code
 */
export const createPromoCode = async (data, adminId) => {
  try {
    const {
      code,
      type,
      value,
      minPurchase = 0,
      maxDiscount,
      usageLimit = -1,
      startDate,
      endDate,
      status = 'active',
    } = data;

    // Validate required fields
    if (!code || !type || value === undefined || !startDate || !endDate) {
      const err = new Error('Missing required fields');
      err.status = 400;
      throw err;
    }

    // Check if code already exists
    const existingCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      const err = new Error('Promo code already exists');
      err.status = 409;
      throw err;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      const err = new Error('End date must be after start date');
      err.status = 400;
      throw err;
    }

    // Validate value based on type
    if (type === 'percentage' && (value < 0 || value > 100)) {
      const err = new Error('Percentage must be between 0 and 100');
      err.status = 400;
      throw err;
    }

    if (type === 'fixed' && value < 0) {
      const err = new Error('Fixed discount must be positive');
      err.status = 400;
      throw err;
    }

    const promoCode = await PromoCode.create({
      code: code.toUpperCase().trim(),
      type,
      value: parseFloat(value),
      minPurchase: parseFloat(minPurchase) || 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      usageLimit: usageLimit === -1 || usageLimit === '' ? -1 : parseInt(usageLimit),
      usedCount: 0,
      startDate: start,
      endDate: end,
      status,
      createdBy: adminId,
    });

    return await PromoCode.findById(promoCode._id).populate('createdBy', 'name email');
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('Promo code already exists');
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Update promo code
 * @param {String} id - Promo code ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated promo code
 */
export const updatePromoCode = async (id, data) => {
  try {
    const promoCode = await PromoCode.findById(id);
    if (!promoCode) {
      const err = new Error('Promo code not found');
      err.status = 404;
      throw err;
    }

    // If code is being updated, check for duplicates
    if (data.code && data.code.toUpperCase() !== promoCode.code) {
      const existingCode = await PromoCode.findOne({ code: data.code.toUpperCase() });
      if (existingCode) {
        const err = new Error('Promo code already exists');
        err.status = 409;
        throw err;
      }
      data.code = data.code.toUpperCase().trim();
    }

    // Validate dates if being updated
    const startDate = data.startDate ? new Date(data.startDate) : promoCode.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : promoCode.endDate;
    if (endDate <= startDate) {
      const err = new Error('End date must be after start date');
      err.status = 400;
      throw err;
    }

    // Validate value if being updated
    if (data.value !== undefined) {
      const type = data.type || promoCode.type;
      if (type === 'percentage' && (data.value < 0 || data.value > 100)) {
        const err = new Error('Percentage must be between 0 and 100');
        err.status = 400;
        throw err;
      }
      if (type === 'fixed' && data.value < 0) {
        const err = new Error('Fixed discount must be positive');
        err.status = 400;
        throw err;
      }
    }

    // Update fields
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && key !== 'usedCount') {
        if (key === 'code') {
          promoCode[key] = data[key].toUpperCase().trim();
        } else if (key === 'usageLimit' && (data[key] === -1 || data[key] === '')) {
          promoCode[key] = -1;
        } else if (['value', 'minPurchase', 'maxDiscount'].includes(key)) {
          promoCode[key] = parseFloat(data[key]);
        } else if (key === 'usageLimit') {
          promoCode[key] = parseInt(data[key]);
        } else if (['startDate', 'endDate'].includes(key)) {
          promoCode[key] = new Date(data[key]);
        } else {
          promoCode[key] = data[key];
        }
      }
    });

    await promoCode.save();

    // Cache Invalidation
    try {
      await redisService.del('promocodes:active');
      await redisService.clearPattern(`promocode:val:${promoCode.code}:*`);
    } catch (cacheError) {
      console.error('Cache invalidation error (updatePromoCode):', cacheError);
    }

    return await PromoCode.findById(promoCode._id).populate('createdBy', 'name email');
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('Promo code already exists');
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Toggle promo code status
 * @param {String} id - Promo code ID
 * @param {String} status - New status (active/inactive)
 * @returns {Promise<Object>} Updated promo code
 */
export const updatePromoCodeStatus = async (id, status) => {
  try {
    const promoCode = await PromoCode.findById(id);
    if (!promoCode) {
      const err = new Error('Promo code not found');
      err.status = 404;
      throw err;
    }

    if (!['active', 'inactive'].includes(status)) {
      const err = new Error('Invalid status. Must be active or inactive');
      err.status = 400;
      throw err;
    }

    // Don't allow activating expired codes
    if (status === 'active' && new Date() > promoCode.endDate) {
      const err = new Error('Cannot activate expired promo code');
      err.status = 400;
      throw err;
    }

    promoCode.status = status;
    await promoCode.save();

    // Cache Invalidation
    try {
      await redisService.del('promocodes:active');
      await redisService.clearPattern(`promocode:val:${promoCode.code}:*`);
    } catch (cacheError) {
      console.error('Cache invalidation error (updatePromoCodeStatus):', cacheError);
    }

    return await PromoCode.findById(promoCode._id).populate('createdBy', 'name email');
  } catch (error) {
    throw error;
  }
};

/**
 * Delete promo code
 * @param {String} id - Promo code ID
 * @returns {Promise<Object>} Deletion result
 */
export const deletePromoCode = async (id) => {
  try {
    const promoCode = await PromoCode.findByIdAndDelete(id);
    if (!promoCode) {
      const err = new Error('Promo code not found');
      err.status = 404;
      throw err;
    }

    // Cache Invalidation
    try {
      await redisService.del('promocodes:active');
      await redisService.clearPattern(`promocode:val:${promoCode.code}:*`);
    } catch (cacheError) {
      console.error('Cache invalidation error (deletePromoCode):', cacheError);
    }

    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * Validate promo code logic
 * @param {String} code - Promo code to validate
 * @param {Number} cartTotal - Total amount of the cart
 * @param {Array} cartItems - Array of cart items
 * @param {String} userId - User ID (optional, for usage tracking)
 * @returns {Promise<Object>} Validation result
 */
export const validatePromoCodeLogic = async (code, cartTotal, cartItems, userId) => {
  try {
    const cacheKey = `promocode:val:${code.toUpperCase()}:${cartTotal}:${JSON.stringify(cartItems.map(i => ({ id: i.productId || i.id, q: i.quantity })))}${userId ? ':' + userId : ''}`;
    try {
      const cachedResult = await redisService.get(cacheKey);
      if (cachedResult) return cachedResult;
    } catch (cacheError) {
      console.error('Redis GET error (validatePromoCodeLogic):', cacheError);
    }

    const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (!promoCode) {
      const err = new Error('Invalid promo code');
      err.status = 404;
      throw err;
    }

    // Check if active
    if (!promoCode.isValid) {
      let message = 'Promo code is not valid';
      if (promoCode.status === 'expired') message = 'Promo code has expired';
      if (promoCode.status === 'inactive') message = 'Promo code is inactive';
      const err = new Error(message);
      err.status = 400;
      throw err;
    }

    // Check minimum purchase
    if (cartTotal < promoCode.minPurchase) {
      const err = new Error(`Minimum purchase of ₹${promoCode.minPurchase} required`);
      err.status = 400;
      throw err;
    }

    // Check usage limit
    if (promoCode.usageLimit !== -1 && promoCode.usedCount >= promoCode.usageLimit) {
      const err = new Error('Promo code usage limit exceeded');
      err.status = 400;
      throw err;
    }

    let eligibleAmount = 0;

    // Check product eligibility logic
    for (const item of cartItems) {
      const product = await Product.findById(item.productId || item.id);
      if (product) {
        // Check if product is eligible generally AND specifically for this coupon
        // If Product has `isCouponEligible` true, AND (applicableCoupons is empty OR includes this coupon ID)
        // Note: If applicableCoupons is empty but isCouponEligible is true, does it mean ALL coupons?
        // Let's assume: isCouponEligible=true AND (applicableCoupons includes PromoID OR applicableCoupons is empty means ALL/Standard ones?)
        // Let's follow strict instruction: "dropdown list... from which he can select one or more coupons"
        // So `applicableCoupons` should contain the ID.

        // We check: isCouponEligible is TRUE AND applicableCoupons contains this ID.
        const isEligible = product.isCouponEligible && product.applicableCoupons && product.applicableCoupons.some(id => id.toString() === promoCode._id.toString());

        if (isEligible) {
          eligibleAmount += (item.price * item.quantity);
        }
      }
    }

    if (eligibleAmount === 0) {
      const err = new Error('This promo code is not applicable to any items in your cart');
      err.status = 400;
      throw err;
    }

    // Calculate discount
    let discountAmount = 0;
    if (promoCode.type === 'percentage') {
      discountAmount = (eligibleAmount * promoCode.value) / 100;
      if (promoCode.maxDiscount) {
        discountAmount = Math.min(discountAmount, promoCode.maxDiscount);
      }
    } else {
      discountAmount = promoCode.value;
      // Ensure fixed discount doesn't exceed eligible amount
      discountAmount = Math.min(discountAmount, eligibleAmount);
    }

    const result = {
      success: true,
      code: promoCode.code,
      type: promoCode.type,
      value: promoCode.value,
      discountAmount: discountAmount,
      promoCodeId: promoCode._id
    };

    // Cache the result for 2 minutes (short TTL for validation)
    try {
      await redisService.set(cacheKey, result, 120);
    } catch (cacheError) {
      console.error('Redis SET error (validatePromoCodeLogic):', cacheError);
    }

    return result;

  } catch (error) {
    throw error;
  }
};

/**
 * Get active promo codes for vendor selection
 * @returns {Promise<Array>} Array of active promo codes
 */
export const getActivePromoCodesForVendors = async () => {
  try {
    const now = new Date();
    return await PromoCode.find({
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).select('code type value name');
  } catch (error) {
    throw error;
  }
};

