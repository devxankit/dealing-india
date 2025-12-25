import Policy from '../models/Policy.model.js';

/**
 * Get all policies
 * @returns {Promise<Array>} Array of policies
 */
export const getAllPolicies = async () => {
  try {
    const policies = await Policy.find().populate('updatedBy', 'name email').sort({ key: 1 });
    return policies;
  } catch (error) {
    throw error;
  }
};

/**
 * Get policy by key
 * @param {String} key - Policy key (privacy, refund, terms)
 * @returns {Promise<Object|null>} Policy object or null if not found
 */
export const getPolicyByKey = async (key) => {
  try {
    const policy = await Policy.findOne({ key }).populate('updatedBy', 'name email');
    return policy; // Return null if not found instead of throwing error
  } catch (error) {
    throw error;
  }
};

/**
 * Create or update policy
 * @param {String} key - Policy key
 * @param {String} content - Policy content
 * @param {String} adminId - Admin ID who is updating
 * @returns {Promise<Object>} Policy object
 */
export const upsertPolicy = async (key, content, adminId) => {
  try {
    if (!key || !content) {
      const err = new Error('Policy key and content are required');
      err.status = 400;
      throw err;
    }

    const validKeys = ['privacy', 'refund', 'terms'];
    if (!validKeys.includes(key)) {
      const err = new Error('Invalid policy key');
      err.status = 400;
      throw err;
    }

    const policy = await Policy.findOneAndUpdate(
      { key },
      {
        key,
        content: content.trim(),
        updatedBy: adminId,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    ).populate('updatedBy', 'name email');

    return policy;
  } catch (error) {
    throw error;
  }
};

