import {
  getAllAttributeSets,
  getAttributeSetById,
  createAttributeSet,
  updateAttributeSet,
  deleteAttributeSet,
} from '../../services/attributeSet.service.js';
import logger from '../../utils/logger.js';

/**
 * Get all attribute sets for the logged-in vendor
 * GET /api/vendor/attribute-sets
 */
export const getAll = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const attributeSets = await getAllAttributeSets(vendorId);
    res.status(200).json({
      success: true,
      message: 'Attribute sets retrieved successfully',
      data: { attributeSets },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attribute set by ID for the logged-in vendor
 * GET /api/vendor/attribute-sets/:id
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    const attributeSet = await getAttributeSetById(id, vendorId);
    res.status(200).json({
      success: true,
      message: 'Attribute set retrieved successfully',
      data: { attributeSet },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new attribute set for the logged-in vendor
 * POST /api/vendor/attribute-sets
 */
export const create = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const attributeSet = await createAttributeSet(req.body, vendorId);
    
    logger.info(`Vendor ${vendorId} created attribute set ${attributeSet._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Attribute set created successfully',
      data: { attributeSet },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update attribute set for the logged-in vendor
 * PUT /api/vendor/attribute-sets/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    const attributeSet = await updateAttributeSet(id, req.body, vendorId);
    
    logger.info(`Vendor ${vendorId} updated attribute set ${id}`);
    
    res.status(200).json({
      success: true,
      message: 'Attribute set updated successfully',
      data: { attributeSet },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete attribute set for the logged-in vendor
 * DELETE /api/vendor/attribute-sets/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    await deleteAttributeSet(id, vendorId);
    
    logger.info(`Vendor ${vendorId} deleted attribute set ${id}`);
    
    res.status(200).json({
      success: true,
      message: 'Attribute set deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
