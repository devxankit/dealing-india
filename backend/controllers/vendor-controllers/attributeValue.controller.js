import {
  getAllAttributeValues,
  getAttributeValueById,
  createAttributeValue,
  updateAttributeValue,
  deleteAttributeValue,
} from '../../services/attributeValue.service.js';
import logger from '../../utils/logger.js';

/**
 * Get all attribute values for the logged-in vendor
 * GET /api/vendor/attribute-values
 */
export const getAll = async (req, res, next) => {
  try {
    const { attributeId, search } = req.query;
    const vendorId = req.user ? req.user.id : req.query.vendorId;
    const values = await getAllAttributeValues({ attributeId, search, vendorId });
    res.status(200).json({
      success: true,
      message: 'Attribute values retrieved successfully',
      data: { values },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attribute value by ID for the logged-in vendor
 * GET /api/vendor/attribute-values/:id
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user ? req.user.id : null;
    const value = await getAttributeValueById(id, vendorId);
    res.status(200).json({
      success: true,
      message: 'Attribute value retrieved successfully',
      data: { value },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new attribute value for the logged-in vendor
 * POST /api/vendor/attribute-values
 */
export const create = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      const err = new Error('Authentication required');
      err.status = 401;
      return next(err);
    }

    const vendorId = req.user.id;
    
    // Log the incoming request for debugging
    logger.info(`Vendor ${vendorId} creating attribute value`, { 
      payload: req.body 
    });
    
    const value = await createAttributeValue(req.body, vendorId);
    
    logger.info(`Vendor ${vendorId} created attribute value ${value._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Attribute value created successfully',
      data: { value },
    });
  } catch (error) {
    logger.error('Error creating attribute value', { 
      error: error.message, 
      stack: error.stack,
      vendorId: req.user?.id,
      payload: req.body 
    });
    next(error);
  }
};

/**
 * Update attribute value for the logged-in vendor
 * PUT /api/vendor/attribute-values/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    const value = await updateAttributeValue(id, req.body, vendorId);
    
    logger.info(`Vendor ${vendorId} updated attribute value ${id}`);
    
    res.status(200).json({
      success: true,
      message: 'Attribute value updated successfully',
      data: { value },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete attribute value for the logged-in vendor
 * DELETE /api/vendor/attribute-values/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    await deleteAttributeValue(id, vendorId);
    
    logger.info(`Vendor ${vendorId} deleted attribute value ${id}`);
    
    res.status(200).json({
      success: true,
      message: 'Attribute value deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
