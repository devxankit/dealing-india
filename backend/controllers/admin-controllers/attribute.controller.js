import {
  getAllAttributes,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from '../../services/attribute.service.js';

/**
 * Get all attributes
 * GET /api/admin/attributes
 */
export const getAll = async (req, res, next) => {
  try {
    const attributes = await getAllAttributes();
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
 * Get attribute by ID
 * GET /api/admin/attributes/:id
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attribute = await getAttributeById(id);
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
 * Create new attribute
 * POST /api/admin/attributes
 */
export const create = async (req, res, next) => {
  try {
    const attribute = await createAttribute(req.body);
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
 * Update attribute
 * PUT /api/admin/attributes/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attribute = await updateAttribute(id, req.body);
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
 * Delete attribute
 * DELETE /api/admin/attributes/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteAttribute(id);
    res.status(200).json({
      success: true,
      message: 'Attribute deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

