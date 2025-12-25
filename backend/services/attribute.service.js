import Attribute from '../models/Attribute.model.js';
import AttributeValue from '../models/AttributeValue.model.js';

/**
 * Get all attributes
 * @returns {Promise<Array>} Array of attributes
 */
export const getAllAttributes = async () => {
  try {
    const attributes = await Attribute.find().sort({ name: 1 });
    return attributes;
  } catch (error) {
    throw error;
  }
};

/**
 * Get attribute by ID
 * @param {String} id - Attribute ID
 * @returns {Promise<Object>} Attribute object
 */
export const getAttributeById = async (id) => {
  try {
    const attribute = await Attribute.findById(id);
    if (!attribute) {
      const err = new Error('Attribute not found');
      err.status = 404;
      throw err;
    }
    return attribute;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new attribute
 * @param {Object} data - Attribute data
 * @returns {Promise<Object>} Created attribute
 */
export const createAttribute = async (data) => {
  try {
    const { name, type = 'select', required = false, status = 'active' } = data;

    if (!name) {
      const err = new Error('Attribute name is required');
      err.status = 400;
      throw err;
    }

    // Check if attribute with same name exists
    const existingAttribute = await Attribute.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
    if (existingAttribute) {
      const err = new Error('Attribute with this name already exists');
      err.status = 409;
      throw err;
    }

    const attribute = await Attribute.create({
      name: name.trim(),
      type,
      required: required === true || required === 'true',
      status,
    });

    return attribute;
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('Attribute with this name already exists');
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Update attribute
 * @param {String} id - Attribute ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated attribute
 */
export const updateAttribute = async (id, data) => {
  try {
    const attribute = await Attribute.findById(id);
    if (!attribute) {
      const err = new Error('Attribute not found');
      err.status = 404;
      throw err;
    }

    // If name is being updated, check for duplicates
    if (data.name && data.name.trim().toLowerCase() !== attribute.name.toLowerCase()) {
      const existingAttribute = await Attribute.findOne({
        name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
        _id: { $ne: id },
      });
      if (existingAttribute) {
        const err = new Error('Attribute with this name already exists');
        err.status = 409;
        throw err;
      }
      attribute.name = data.name.trim();
    }

    if (data.type !== undefined) attribute.type = data.type;
    if (data.required !== undefined) {
      attribute.required = data.required === true || data.required === 'true';
    }
    if (data.status !== undefined) attribute.status = data.status;

    await attribute.save();
    return attribute;
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('Attribute with this name already exists');
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Delete attribute
 * @param {String} id - Attribute ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAttribute = async (id) => {
  try {
    const attribute = await Attribute.findById(id);
    if (!attribute) {
      const err = new Error('Attribute not found');
      err.status = 404;
      throw err;
    }

    // Check if attribute has values
    const valueCount = await AttributeValue.countDocuments({ attributeId: id });
    if (valueCount > 0) {
      const err = new Error('Cannot delete attribute with existing values. Please delete values first.');
      err.status = 400;
      throw err;
    }

    await Attribute.findByIdAndDelete(id);
    return { success: true };
  } catch (error) {
    throw error;
  }
};

