import {
  getAllAttributeSets,
  getAttributeSetById,
  createAttributeSet,
  updateAttributeSet,
  deleteAttributeSet,
} from '../../services/attributeSet.service.js';

/**
 * Get all attribute sets
 * GET /api/admin/attribute-sets
 */
export const getAll = async (req, res, next) => {
  try {
    const attributeSets = await getAllAttributeSets();
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
 * Get attribute set by ID
 * GET /api/admin/attribute-sets/:id
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attributeSet = await getAttributeSetById(id);
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
 * Create new attribute set
 * POST /api/admin/attribute-sets
 */
export const create = async (req, res, next) => {
  try {
    const attributeSet = await createAttributeSet(req.body);
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
 * Update attribute set
 * PUT /api/admin/attribute-sets/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attributeSet = await updateAttributeSet(id, req.body);
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
 * Delete attribute set
 * DELETE /api/admin/attribute-sets/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteAttributeSet(id);
    res.status(200).json({
      success: true,
      message: 'Attribute set deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

