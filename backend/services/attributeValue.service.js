import AttributeValue from '../models/AttributeValue.model.js';
import Attribute from '../models/Attribute.model.js';

/**
 * Get all attribute values with optional filters
 * @param {Object} filters - Filter options (attributeId, search)
 * @returns {Promise<Array>} Array of attribute values
 */
export const getAllAttributeValues = async (filters = {}) => {
  try {
    const { attributeId, search } = filters;
    const query = {};

    if (attributeId && attributeId !== 'all') {
      query.attributeId = attributeId;
    }

    if (search) {
      query.value = { $regex: search, $options: 'i' };
    }

    const values = await AttributeValue.find(query)
      .populate('attributeId', 'name type')
      .sort({ displayOrder: 1, createdAt: 1 });

    return values;
  } catch (error) {
    throw error;
  }
};

/**
 * Get attribute value by ID
 * @param {String} id - Attribute value ID
 * @returns {Promise<Object>} Attribute value object
 */
export const getAttributeValueById = async (id) => {
  try {
    const value = await AttributeValue.findById(id).populate('attributeId', 'name type');
    if (!value) {
      const err = new Error('Attribute value not found');
      err.status = 404;
      throw err;
    }
    return value;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new attribute value
 * @param {Object} data - Attribute value data
 * @returns {Promise<Object>} Created attribute value
 */
export const createAttributeValue = async (data) => {
  try {
    const { attributeId, value, displayOrder = 1, status = 'active' } = data;

    if (!attributeId || !value) {
      const err = new Error('Attribute ID and value are required');
      err.status = 400;
      throw err;
    }

    // Verify attribute exists
    const attribute = await Attribute.findById(attributeId);
    if (!attribute) {
      const err = new Error('Attribute not found');
      err.status = 404;
      throw err;
    }

    // Check if value already exists for this attribute
    const existingValue = await AttributeValue.findOne({
      attributeId,
      value: { $regex: new RegExp(`^${value.trim()}$`, 'i') },
    });
    if (existingValue) {
      const err = new Error('This value already exists for this attribute');
      err.status = 409;
      throw err;
    }

    const attributeValue = await AttributeValue.create({
      attributeId,
      value: value.trim(),
      displayOrder: parseInt(displayOrder) || 1,
      status,
    });

    return await AttributeValue.findById(attributeValue._id).populate('attributeId', 'name type');
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('This value already exists for this attribute');
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Update attribute value
 * @param {String} id - Attribute value ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated attribute value
 */
export const updateAttributeValue = async (id, data) => {
  try {
    const attributeValue = await AttributeValue.findById(id);
    if (!attributeValue) {
      const err = new Error('Attribute value not found');
      err.status = 404;
      throw err;
    }

    // If value is being updated, check for duplicates
    if (data.value && data.value.trim().toLowerCase() !== attributeValue.value.toLowerCase()) {
      const existingValue = await AttributeValue.findOne({
        attributeId: data.attributeId || attributeValue.attributeId,
        value: { $regex: new RegExp(`^${data.value.trim()}$`, 'i') },
        _id: { $ne: id },
      });
      if (existingValue) {
        const err = new Error('This value already exists for this attribute');
        err.status = 409;
        throw err;
      }
      attributeValue.value = data.value.trim();
    }

    if (data.attributeId !== undefined) {
      // Verify new attribute exists
      const attribute = await Attribute.findById(data.attributeId);
      if (!attribute) {
        const err = new Error('Attribute not found');
        err.status = 404;
        throw err;
      }
      attributeValue.attributeId = data.attributeId;
    }

    if (data.displayOrder !== undefined) {
      attributeValue.displayOrder = parseInt(data.displayOrder) || 1;
    }
    if (data.status !== undefined) {
      attributeValue.status = data.status;
    }

    await attributeValue.save();
    return await AttributeValue.findById(attributeValue._id).populate('attributeId', 'name type');
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('This value already exists for this attribute');
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Delete attribute value
 * @param {String} id - Attribute value ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAttributeValue = async (id) => {
  try {
    const attributeValue = await AttributeValue.findByIdAndDelete(id);
    if (!attributeValue) {
      const err = new Error('Attribute value not found');
      err.status = 404;
      throw err;
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

