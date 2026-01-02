import Attribute from '../models/Attribute.model.js';
import AttributeValue from '../models/AttributeValue.model.js';

/**
 * Get all attributes
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Array>} Array of attributes
 */
export const getAllAttributes = async (vendorId) => {
  try {
    const query = vendorId ? { vendorId } : {};
    const attributes = await Attribute.find(query).sort({ name: 1 });
    return attributes;
  } catch (error) {
    throw error;
  }
};

/**
 * Get attribute by ID
 * @param {String} id - Attribute ID
 * @param {String} vendorId - Vendor ID (optional for verification)
 * @returns {Promise<Object>} Attribute object
 */
export const getAttributeById = async (id, vendorId) => {
  try {
    const query = { _id: id };
    if (vendorId) query.vendorId = vendorId;
    
    const attribute = await Attribute.findOne(query);
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
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Created attribute
 */
export const createAttribute = async (data, vendorId) => {
  try {
    const { name, type = 'select', required = false, categoryIds = [], status = 'active' } = data;

    if (!name) {
      const err = new Error('Attribute name is required');
      err.status = 400;
      throw err;
    }

    if (!vendorId) {
      const err = new Error('Vendor ID is required');
      err.status = 400;
      throw err;
    }

    // Ensure vendorId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      const err = new Error('Invalid vendor ID format');
      err.status = 400;
      throw err;
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    // Check if attribute with same name exists for THIS vendor
    const existingAttribute = await Attribute.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      vendorId: vendorObjectId
    });
    if (existingAttribute) {
      const err = new Error('Attribute with this name already exists');
      err.status = 409;
      throw err;
    }

    const attribute = await Attribute.create({
      name: name.trim(),
      vendorId: vendorObjectId,
      type,
      required: required === true || required === 'true',
      categoryIds,
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
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated attribute
 */
export const updateAttribute = async (id, data, vendorId) => {
  try {
    const attribute = await Attribute.findOne({ _id: id, vendorId });
    if (!attribute) {
      const err = new Error('Attribute not found');
      err.status = 404;
      throw err;
    }

    // If name is being updated, check for duplicates for THIS vendor
    if (data.name && data.name.trim().toLowerCase() !== attribute.name.toLowerCase()) {
      const existingAttribute = await Attribute.findOne({
        name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
        vendorId,
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
    if (data.categoryIds !== undefined) {
      attribute.categoryIds = data.categoryIds;
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
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAttribute = async (id, vendorId) => {
  try {
    const attribute = await Attribute.findOne({ _id: id, vendorId });
    if (!attribute) {
      const err = new Error('Attribute not found');
      err.status = 404;
      throw err;
    }

    // Check if attribute has values
    const valueCount = await AttributeValue.countDocuments({ attributeId: id, vendorId });
    if (valueCount > 0) {
      const err = new Error('Cannot delete attribute with existing values. Please delete values first.');
      err.status = 400;
      throw err;
    }

    await Attribute.findOneAndDelete({ _id: id, vendorId });
    return { success: true };
  } catch (error) {
    throw error;
  }
};

