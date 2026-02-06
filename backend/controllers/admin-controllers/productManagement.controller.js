import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

/**
 * Admin Product Management Controller - DISABLED (B2C REMOVAL)
 * Use b2bProductManagement.controller.js for B2B product management.
 */

export const getProducts = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Standard product management disabled', data: { products: [] } });
};

export const getProduct = async (req, res, next) => {
  res.status(410).json({ success: false, message: 'Standard product feature has been deprecated (B2C Removal)' });
};

export const create = async (req, res, next) => {
  res.status(410).json({ success: false, message: 'Standard product feature has been deprecated (B2C Removal)' });
};

export const update = async (req, res, next) => {
  res.status(410).json({ success: false, message: 'Standard product feature has been deprecated (B2C Removal)' });
};

export const remove = async (req, res, next) => {
  res.status(410).json({ success: false, message: 'Standard product feature has been deprecated (B2C Removal)' });
};


