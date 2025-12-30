import PromoCode from '../models/PromoCode.model.js';

/**
 * Get all promo codes with optional filters
 * @param {Object} filters - Filter options (search, status)
 * @returns {Promise<Array>} Array of promo codes
 */
export const getAllPromoCodes = async (filters = {}) => {
  try {
    const { search, status } = filters;
    const query = {};

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
    return { success: true };
  } catch (error) {
    throw error;
  }
};

