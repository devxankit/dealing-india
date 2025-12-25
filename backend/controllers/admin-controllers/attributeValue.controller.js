import {
  getAllAttributeValues,
  getAttributeValueById,
  createAttributeValue,
  updateAttributeValue,
  deleteAttributeValue,
} from '../../services/attributeValue.service.js';

/**
 * Get all attribute values
 * GET /api/admin/attribute-values
 */
export const getAll = async (req, res, next) => {
  try {
    const { attributeId, search } = req.query;
    const filters = { attributeId, search };
    const attributeValues = await getAllAttributeValues(filters);
    res.status(200).json({
      success: true,
      message: 'Attribute values retrieved successfully',
      data: { attributeValues },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attribute value by ID
 * GET /api/admin/attribute-values/:id
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attributeValue = await getAttributeValueById(id);
    res.status(200).json({
      success: true,
      message: 'Attribute value retrieved successfully',
      data: { attributeValue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new attribute value
 * POST /api/admin/attribute-values
 */
export const create = async (req, res, next) => {
  try {
    const attributeValue = await createAttributeValue(req.body);
    res.status(201).json({
      success: true,
      message: 'Attribute value created successfully',
      data: { attributeValue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update attribute value
 * PUT /api/admin/attribute-values/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attributeValue = await updateAttributeValue(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Attribute value updated successfully',
      data: { attributeValue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete attribute value
 * DELETE /api/admin/attribute-values/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteAttributeValue(id);
    res.status(200).json({
      success: true,
      message: 'Attribute value deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

