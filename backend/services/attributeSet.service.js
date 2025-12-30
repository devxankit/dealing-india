import AttributeSet from '../models/AttributeSet.model.js';
import Attribute from '../models/Attribute.model.js';

/**
 * Get all attribute sets with populated attribute names
 * @returns {Promise<Array>} Array of attribute sets
 */
export const getAllAttributeSets = async () => {
  try {
    const attributeSets = await AttributeSet.find().sort({ name: 1 }).lean();
    
    // Populate attribute names
    const populatedSets = await Promise.all(
      attributeSets.map(async (set) => {
        if (set.attributes && Array.isArray(set.attributes) && set.attributes.length > 0) {
          // Fetch attribute names for each ID
          const attributeNames = await Promise.all(
            set.attributes.map(async (attrId) => {
              try {
                const attr = await Attribute.findById(attrId).select('name').lean();
                return attr ? attr.name : attrId; // Return name if found, else return ID
              } catch (error) {
                return attrId; // Return ID if error
              }
            })
          );
          return {
            ...set,
            attributes: attributeNames, // Replace IDs with names
            attributeIds: set.attributes, // Keep original IDs for reference
          };
        }
        return {
          ...set,
          attributes: [],
          attributeIds: [],
        };
      })
    );
    
    return populatedSets;
  } catch (error) {
    throw error;
  }
};

/**
 * Get attribute set by ID with populated attribute names
 * @param {String} id - Attribute set ID
 * @returns {Promise<Object>} Attribute set object
 */
export const getAttributeSetById = async (id) => {
  try {
    const attributeSet = await AttributeSet.findById(id).lean();
    if (!attributeSet) {
      const err = new Error('Attribute set not found');
      err.status = 404;
      throw err;
    }
    
    // Populate attribute names
    if (attributeSet.attributes && Array.isArray(attributeSet.attributes) && attributeSet.attributes.length > 0) {
      const attributeNames = await Promise.all(
        attributeSet.attributes.map(async (attrId) => {
          try {
            const attr = await Attribute.findById(attrId).select('name').lean();
            return attr ? attr.name : attrId;
          } catch (error) {
            return attrId;
          }
        })
      );
      return {
        ...attributeSet,
        attributes: attributeNames,
        attributeIds: attributeSet.attributes,
      };
    }
    
    return {
      ...attributeSet,
      attributes: [],
      attributeIds: [],
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Helper function to convert attribute names/IDs to attribute IDs
 * @param {Array} attributes - Array of attribute names or IDs
 * @returns {Promise<Array>} Array of attribute IDs
 */
const convertAttributesToIds = async (attributes) => {
  if (!Array.isArray(attributes) || attributes.length === 0) {
    return [];
  }

  const attributeIds = await Promise.all(
    attributes.map(async (attr) => {
      const trimmedAttr = typeof attr === 'string' ? attr.trim() : attr;
      
      // Check if it's already a valid MongoDB ObjectId (24 hex characters)
      if (typeof trimmedAttr === 'string' && /^[0-9a-fA-F]{24}$/.test(trimmedAttr)) {
        // It's an ID, verify it exists
        const exists = await Attribute.findById(trimmedAttr);
        return exists ? trimmedAttr : null;
      }
      
      // It's a name, find the attribute by name
      const attrDoc = await Attribute.findOne({
        name: { $regex: new RegExp(`^${trimmedAttr}$`, 'i') }
      });
      return attrDoc ? attrDoc._id.toString() : null;
    })
  );

  return attributeIds.filter(id => id !== null);
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

    // Convert attribute names/IDs to IDs
    const attributeIds = await convertAttributesToIds(attributes);
    
    if (attributeIds.length === 0) {
      const err = new Error('No valid attributes found. Please provide valid attribute names or IDs.');
      err.status = 400;
      throw err;
    }

    const attributeSet = await AttributeSet.create({
      name: name.trim(),
      attributes: attributeIds,
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
      
      // Convert attribute names/IDs to IDs
      const attributeIds = await convertAttributesToIds(data.attributes);
      
      if (attributeIds.length === 0) {
        const err = new Error('No valid attributes found. Please provide valid attribute names or IDs.');
        err.status = 400;
        throw err;
      }
      
      attributeSet.attributes = attributeIds;
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

