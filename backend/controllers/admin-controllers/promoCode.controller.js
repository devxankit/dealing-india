import {
  getAllPromoCodes,
  getPromoCodeById,
  createPromoCode,
  updatePromoCode,
  updatePromoCodeStatus,
  deletePromoCode,
} from '../../services/promoCode.service.js';

/**
 * Get all promo codes
 * GET /api/admin/promocodes
 */
export const getAll = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filters = { search, status };
    const promoCodes = await getAllPromoCodes(filters);
    res.status(200).json({
      success: true,
      message: 'Promo codes retrieved successfully',
      data: { promoCodes },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get promo code by ID
 * GET /api/admin/promocodes/:id
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const promoCode = await getPromoCodeById(id);
    res.status(200).json({
      success: true,
      message: 'Promo code retrieved successfully',
      data: { promoCode },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new promo code
 * POST /api/admin/promocodes
 */
export const create = async (req, res, next) => {
  try {
    const adminId = req.user.adminId;
    const promoCode = await createPromoCode(req.body, adminId);
    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      data: { promoCode },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update promo code
 * PUT /api/admin/promocodes/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const promoCode = await updatePromoCode(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Promo code updated successfully',
      data: { promoCode },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle promo code status
 * PATCH /api/admin/promocodes/:id/status
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const promoCode = await updatePromoCodeStatus(id, status);
    res.status(200).json({
      success: true,
      message: 'Promo code status updated successfully',
      data: { promoCode },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete promo code
 * DELETE /api/admin/promocodes/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deletePromoCode(id);
    res.status(200).json({
      success: true,
      message: 'Promo code deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

