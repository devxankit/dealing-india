import AttributeValue from '../models/AttributeValue.model.js';
import Attribute from '../models/Attribute.model.js';
import mongoose from 'mongoose';

/**
 * Get all attribute values with optional filters
 * @param {Object} filters - Filter options (attributeId, search, vendorId)
 * @returns {Promise<Array>} Array of attribute values
 */
export const getAllAttributeValues = async (filters = {}) => {
  try {
    const { attributeId, search, vendorId } = filters;
    const query = {};

    if (vendorId) {
      query.vendorId = vendorId;
    }

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
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Attribute value object
 */
export const getAttributeValueById = async (id, vendorId) => {
  try {
    const query = { _id: id };
    if (vendorId) query.vendorId = vendorId;

    const value = await AttributeValue.findOne(query).populate('attributeId', 'name type');
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
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Created attribute value
 */
export const createAttributeValue = async (data, vendorId) => {
  try {
    const { attributeId, value, displayOrder = 1, status = 'active' } = data;

    // Validate attributeId
    if (!attributeId || typeof attributeId !== 'string' || attributeId.trim() === '') {
      const err = new Error('Valid attribute ID is required');
      err.status = 400;
      throw err;
    }

    // Validate value
    if (!value || typeof value !== 'string' || value.trim() === '') {
      const err = new Error('Valid value is required');
      err.status = 400;
      throw err;
    }

    if (!vendorId) {
      const err = new Error('Vendor ID is required');
      err.status = 400;
      throw err;
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(attributeId)) {
      const err = new Error('Invalid attribute ID format');
      err.status = 400;
      throw err;
    }

    // Convert both IDs to ObjectId if they're strings
    const attributeObjectId = mongoose.Types.ObjectId.isValid(attributeId) 
      ? new mongoose.Types.ObjectId(attributeId) 
      : attributeId;
    
    const vendorObjectId = mongoose.Types.ObjectId.isValid(vendorId) 
      ? new mongoose.Types.ObjectId(vendorId) 
      : vendorId;

    // Verify attribute exists and belongs to this vendor
    // Try multiple query formats to handle different data types
    let attribute = await Attribute.findOne({ 
      _id: attributeObjectId, 
      vendorId: vendorObjectId 
    });

    // If not found, try with string comparison (in case vendorId is stored as string)
    if (!attribute) {
      attribute = await Attribute.findOne({ 
        _id: attributeObjectId, 
        vendorId: vendorId.toString() 
      });
    }

    // If still not found, attribute doesn't exist or doesn't belong to this vendor
    if (!attribute) {
      const err = new Error('Attribute not found or does not belong to you');
      err.status = 404;
      throw err;
    }

    // Check if value already exists for this attribute for THIS vendor
    const existingValue = await AttributeValue.findOne({
      attributeId,
      vendorId: vendorObjectId,
      value: { $regex: new RegExp(`^${value.trim()}$`, 'i') },
    });
    if (existingValue) {
      const err = new Error('This value already exists for this attribute');
      err.status = 409;
      throw err;
    }

    const attributeValue = await AttributeValue.create({
      attributeId,
      vendorId: vendorObjectId,
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
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Updated attribute value
 */
export const updateAttributeValue = async (id, data, vendorId) => {
  try {
    const attributeValue = await AttributeValue.findOne({ _id: id, vendorId });
    if (!attributeValue) {
      const err = new Error('Attribute value not found');
      err.status = 404;
      throw err;
    }

    // If value is being updated, check for duplicates for THIS vendor
    if (data.value && data.value.trim().toLowerCase() !== attributeValue.value.toLowerCase()) {
      const existingValue = await AttributeValue.findOne({
        attributeId: data.attributeId || attributeValue.attributeId,
        vendorId,
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
      // Verify new attribute exists and belongs to this vendor
      const attribute = await Attribute.findOne({ _id: data.attributeId, vendorId });
      if (!attribute) {
        const err = new Error('Attribute not found or does not belong to you');
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
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAttributeValue = async (id, vendorId) => {
  try {
    const attributeValue = await AttributeValue.findOneAndDelete({ _id: id, vendorId });
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

