import {
  getAllAttributes,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from '../../services/attribute.service.js';
import logger from '../../utils/logger.js';

/**
 * Get all attributes for the logged-in vendor
 * GET /api/vendor/attributes
 */
export const getAll = async (req, res, next) => {
  try {
    // Use vendorId from JWT token (preferred) or fallback to id or query param
    const vendorId = req.user ? (req.user.vendorId || req.user.id) : req.query.vendorId;
    const attributes = await getAllAttributes(vendorId);
    res.status(200).json({
      success: true,
      message: 'Attributes retrieved successfully',
      data: { attributes },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attribute by ID for the logged-in vendor
 * GET /api/vendor/attributes/:id
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Use vendorId from JWT token (preferred) or fallback to id
    const vendorId = req.user ? (req.user.vendorId || req.user.id) : null;
    const attribute = await getAttributeById(id, vendorId);
    res.status(200).json({
      success: true,
      message: 'Attribute retrieved successfully',
      data: { attribute },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new attribute for the logged-in vendor
 * POST /api/vendor/attributes
 */
export const create = async (req, res, next) => {
  try {
    // Use vendorId from JWT token (preferred) or fallback to id
    // JWT token stores vendorId, not id
    const vendorId = req.user.vendorId || req.user.id;
    
    if (!vendorId) {
      const err = new Error('Vendor ID not found in token');
      err.status = 401;
      return next(err);
    }
    
    // Ensure vendorId is a string for consistency
    const vendorIdString = vendorId.toString();
    
    const attribute = await createAttribute(req.body, vendorIdString);
    
    logger.info(`Vendor ${vendorId} created attribute ${attribute._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Attribute created successfully',
      data: { attribute },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update attribute for the logged-in vendor
 * PUT /api/vendor/attributes/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Use vendorId from JWT token (preferred) or fallback to id
    const vendorId = req.user.vendorId || req.user.id;
    const attribute = await updateAttribute(id, req.body, vendorId);
    
    logger.info(`Vendor ${vendorId} updated attribute ${id}`);
    
    res.status(200).json({
      success: true,
      message: 'Attribute updated successfully',
      data: { attribute },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete attribute for the logged-in vendor
 * DELETE /api/vendor/attributes/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Use vendorId from JWT token (preferred) or fallback to id
    const vendorId = req.user.vendorId || req.user.id;
    await deleteAttribute(id, vendorId);
    
    logger.info(`Vendor ${vendorId} deleted attribute ${id}`);
    
    res.status(200).json({
      success: true,
      message: 'Attribute deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
