import {
  getAllTaxRules,
  getTaxRuleById,
  createTaxRule,
  updateTaxRule,
  deleteTaxRule,
  getAllPricingRules,
  getPricingRuleById,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
} from '../../services/taxPricing.service.js';

// ==================== TAX RULES ====================

/**
 * Get all tax rules
 * GET /api/admin/tax-rules
 */
export const getTaxRules = async (req, res, next) => {
  try {
    const taxRules = await getAllTaxRules();
    res.status(200).json({
      success: true,
      message: 'Tax rules fetched successfully',
      data: taxRules,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tax rule by ID
 * GET /api/admin/tax-rules/:id
 */
export const getTaxRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const taxRule = await getTaxRuleById(id);
    res.status(200).json({
      success: true,
      message: 'Tax rule fetched successfully',
      data: taxRule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create tax rule
 * POST /api/admin/tax-rules
 */
export const create = async (req, res, next) => {
  try {
    const taxRule = await createTaxRule(req.body);
    res.status(201).json({
      success: true,
      message: 'Tax rule created successfully',
      data: taxRule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tax rule
 * PUT /api/admin/tax-rules/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const taxRule = await updateTaxRule(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Tax rule updated successfully',
      data: taxRule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete tax rule
 * DELETE /api/admin/tax-rules/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteTaxRule(id);
    res.status(200).json({
      success: true,
      message: 'Tax rule deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== PRICING RULES ====================

/**
 * Get all pricing rules
 * GET /api/admin/pricing-rules
 */
export const getPricingRules = async (req, res, next) => {
  try {
    const pricingRules = await getAllPricingRules();
    res.status(200).json({
      success: true,
      message: 'Pricing rules fetched successfully',
      data: pricingRules,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pricing rule by ID
 * GET /api/admin/pricing-rules/:id
 */
export const getPricingRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pricingRule = await getPricingRuleById(id);
    res.status(200).json({
      success: true,
      message: 'Pricing rule fetched successfully',
      data: pricingRule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create pricing rule
 * POST /api/admin/pricing-rules
 */
export const createPricing = async (req, res, next) => {
  try {
    const pricingRule = await createPricingRule(req.body);
    res.status(201).json({
      success: true,
      message: 'Pricing rule created successfully',
      data: pricingRule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update pricing rule
 * PUT /api/admin/pricing-rules/:id
 */
export const updatePricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pricingRule = await updatePricingRule(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Pricing rule updated successfully',
      data: pricingRule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete pricing rule
 * DELETE /api/admin/pricing-rules/:id
 */
export const removePricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deletePricingRule(id);
    res.status(200).json({
      success: true,
      message: 'Pricing rule deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

