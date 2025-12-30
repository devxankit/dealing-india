import TaxRule from '../models/TaxRule.model.js';
import PricingRule from '../models/PricingRule.model.js';

// ==================== TAX RULES ====================

/**
 * Get all tax rules
 * @returns {Promise<Array>} Array of tax rules
 */
export const getAllTaxRules = async () => {
  try {
    const taxRules = await TaxRule.find().sort({ createdAt: -1 }).lean();
    return taxRules;
  } catch (error) {
    throw error;
  }
};

/**
 * Get tax rule by ID
 * @param {String} taxRuleId - Tax rule ID
 * @returns {Promise<Object>} Tax rule object
 */
export const getTaxRuleById = async (taxRuleId) => {
  try {
    const taxRule = await TaxRule.findById(taxRuleId).lean();
    if (!taxRule) {
      throw new Error('Tax rule not found');
    }
    return taxRule;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid tax rule ID');
    }
    throw error;
  }
};

/**
 * Create a new tax rule
 * @param {Object} taxRuleData - { name, rate, type, applicableTo, status }
 * @returns {Promise<Object>} Created tax rule
 */
export const createTaxRule = async (taxRuleData) => {
  try {
    const { name, rate, type, applicableTo, status } = taxRuleData;

    if (!name || !name.trim()) {
      throw new Error('Tax rule name is required');
    }
    if (rate === undefined || rate === null || rate < 0) {
      throw new Error('Tax rate is required and must be >= 0');
    }

    const taxRule = await TaxRule.create({
      name: name.trim(),
      rate: parseFloat(rate),
      type: type || 'percentage',
      applicableTo: applicableTo || 'all',
      status: status || 'active',
    });

    return taxRule.toObject();
  } catch (error) {
    throw error;
  }
};

/**
 * Update tax rule
 * @param {String} taxRuleId - Tax rule ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated tax rule
 */
export const updateTaxRule = async (taxRuleId, updateData) => {
  try {
    const { name, rate, type, applicableTo, status } = updateData;

    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (rate !== undefined) updateObj.rate = parseFloat(rate);
    if (type !== undefined) updateObj.type = type;
    if (applicableTo !== undefined) updateObj.applicableTo = applicableTo;
    if (status !== undefined) updateObj.status = status;

    const taxRule = await TaxRule.findByIdAndUpdate(
      taxRuleId,
      updateObj,
      { new: true, runValidators: true }
    ).lean();

    if (!taxRule) {
      throw new Error('Tax rule not found');
    }

    return taxRule;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid tax rule ID');
    }
    throw error;
  }
};

/**
 * Delete tax rule
 * @param {String} taxRuleId - Tax rule ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteTaxRule = async (taxRuleId) => {
  try {
    const taxRule = await TaxRule.findByIdAndDelete(taxRuleId);
    if (!taxRule) {
      throw new Error('Tax rule not found');
    }
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid tax rule ID');
    }
    throw error;
  }
};

// ==================== PRICING RULES ====================

/**
 * Get all pricing rules
 * @returns {Promise<Array>} Array of pricing rules
 */
export const getAllPricingRules = async () => {
  try {
    const pricingRules = await PricingRule.find().sort({ createdAt: -1 }).lean();
    return pricingRules;
  } catch (error) {
    throw error;
  }
};

/**
 * Get pricing rule by ID
 * @param {String} pricingRuleId - Pricing rule ID
 * @returns {Promise<Object>} Pricing rule object
 */
export const getPricingRuleById = async (pricingRuleId) => {
  try {
    const pricingRule = await PricingRule.findById(pricingRuleId).lean();
    if (!pricingRule) {
      throw new Error('Pricing rule not found');
    }
    return pricingRule;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid pricing rule ID');
    }
    throw error;
  }
};

/**
 * Create a new pricing rule
 * @param {Object} pricingRuleData - { name, type, value, minQuantity, applicableTo, status }
 * @returns {Promise<Object>} Created pricing rule
 */
export const createPricingRule = async (pricingRuleData) => {
  try {
    const { name, type, value, minQuantity, applicableTo, status } = pricingRuleData;

    if (!name || !name.trim()) {
      throw new Error('Pricing rule name is required');
    }
    if (value === undefined || value === null || value < 0) {
      throw new Error('Pricing rule value is required and must be >= 0');
    }

    const pricingRule = await PricingRule.create({
      name: name.trim(),
      type: type || 'discount',
      value: parseFloat(value),
      minQuantity: minQuantity ? parseInt(minQuantity) : null,
      applicableTo: applicableTo || null,
      status: status || 'active',
    });

    return pricingRule.toObject();
  } catch (error) {
    throw error;
  }
};

/**
 * Update pricing rule
 * @param {String} pricingRuleId - Pricing rule ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated pricing rule
 */
export const updatePricingRule = async (pricingRuleId, updateData) => {
  try {
    const { name, type, value, minQuantity, applicableTo, status } = updateData;

    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (type !== undefined) updateObj.type = type;
    if (value !== undefined) updateObj.value = parseFloat(value);
    if (minQuantity !== undefined) updateObj.minQuantity = minQuantity ? parseInt(minQuantity) : null;
    if (applicableTo !== undefined) updateObj.applicableTo = applicableTo || null;
    if (status !== undefined) updateObj.status = status;

    const pricingRule = await PricingRule.findByIdAndUpdate(
      pricingRuleId,
      updateObj,
      { new: true, runValidators: true }
    ).lean();

    if (!pricingRule) {
      throw new Error('Pricing rule not found');
    }

    return pricingRule;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid pricing rule ID');
    }
    throw error;
  }
};

/**
 * Delete pricing rule
 * @param {String} pricingRuleId - Pricing rule ID
 * @returns {Promise<Boolean>} Success status
 */
export const deletePricingRule = async (pricingRuleId) => {
  try {
    const pricingRule = await PricingRule.findByIdAndDelete(pricingRuleId);
    if (!pricingRule) {
      throw new Error('Pricing rule not found');
    }
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid pricing rule ID');
    }
    throw error;
  }
};

