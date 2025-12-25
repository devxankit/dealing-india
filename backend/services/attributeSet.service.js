import AttributeSet from '../models/AttributeSet.model.js';

/**
 * Get all attribute sets
 * @returns {Promise<Array>} Array of attribute sets
 */
export const getAllAttributeSets = async () => {
  try {
    const attributeSets = await AttributeSet.find().sort({ name: 1 });
    return attributeSets;
  } catch (error) {
    throw error;
  }
};

/**
 * Get attribute set by ID
 * @param {String} id - Attribute set ID
 * @returns {Promise<Object>} Attribute set object
 */
export const getAttributeSetById = async (id) => {
  try {
    const attributeSet = await AttributeSet.findById(id);
    if (!attributeSet) {
      const err = new Error('Attribute set not found');
      err.status = 404;
      throw err;
    }
    return attributeSet;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new attribute set
 * @param {Object} data - Attribute set data
 * @returns {Promise<Object>} Created attribute set
 */
export const createAttributeSet = async (data) => {
  try {
    const { name, attributes = [], status = 'active' } = data;

    if (!name) {
      const err = new Error('Attribute set name is required');
      err.status = 400;
      throw err;
    }

    if (!Array.isArray(attributes) || attributes.length === 0) {
      const err = new Error('Attribute set must have at least one attribute');
      err.status = 400;
      throw err;
    }

    // Check if attribute set with same name exists
    const existingSet = await AttributeSet.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
    if (existingSet) {
      const err = new Error('Attribute set with this name already exists');
      err.status = 409;
      throw err;
    }

    const attributeSet = await AttributeSet.create({
      name: name.trim(),
      attributes: attributes.map((attr) => attr.trim()).filter((attr) => attr),
      status,
    });

    return attributeSet;
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('Attribute set with this name already exists');
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Update attribute set
 * @param {String} id - Attribute set ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated attribute set
 */
export const updateAttributeSet = async (id, data) => {
  try {
    const attributeSet = await AttributeSet.findById(id);
    if (!attributeSet) {
      const err = new Error('Attribute set not found');
      err.status = 404;
      throw err;
    }

    // If name is being updated, check for duplicates
    if (data.name && data.name.trim().toLowerCase() !== attributeSet.name.toLowerCase()) {
      const existingSet = await AttributeSet.findOne({
        name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
        _id: { $ne: id },
      });
      if (existingSet) {
        const err = new Error('Attribute set with this name already exists');
        err.status = 409;
        throw err;
      }
      attributeSet.name = data.name.trim();
    }

    if (data.attributes !== undefined) {
      if (!Array.isArray(data.attributes) || data.attributes.length === 0) {
        const err = new Error('Attribute set must have at least one attribute');
        err.status = 400;
        throw err;
      }
      attributeSet.attributes = data.attributes
        .map((attr) => (typeof attr === 'string' ? attr.trim() : attr))
        .filter((attr) => attr);
    }

    if (data.status !== undefined) {
      attributeSet.status = data.status;
    }

    await attributeSet.save();
    return attributeSet;
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('Attribute set with this name already exists');
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Delete attribute set
 * @param {String} id - Attribute set ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAttributeSet = async (id) => {
  try {
    const attributeSet = await AttributeSet.findByIdAndDelete(id);
    if (!attributeSet) {
      const err = new Error('Attribute set not found');
      err.status = 404;
      throw err;
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

