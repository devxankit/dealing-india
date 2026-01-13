import Settings from '../models/Settings.model.js';

/**
 * Get settings
 * @returns {Promise<Object>} Settings object
 */
export const getSettings = async () => {
  try {
    const settings = await Settings.getSettings();
    return settings;
  } catch (error) {
    throw error;
  }
};

/**
 * Update settings
 * @param {Object} updateData - Settings data to update { general, products }
 * @returns {Promise<Object>} Updated settings object
 */
export const updateSettings = async (updateData) => {
  try {
    // Get existing settings or create new one
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings();
    }

    // Update only provided sections
    if (updateData.general !== undefined) {
      settings.general = {
        ...settings.general,
        ...updateData.general,
      };
    }

    if (updateData.products !== undefined) {
      settings.products = {
        ...settings.products,
        ...updateData.products,
      };
    }


    await settings.save();
    return settings;
  } catch (error) {
    throw error;
  }
};

/**
 * Update specific category of settings
 * @param {String} category - Category name (general, products)
 * @param {Object} categoryData - Category data to update
 * @returns {Promise<Object>} Updated settings object
 */
export const updateCategorySettings = async (category, categoryData) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings();
    }

    // Update the specific category
    if (settings[category] !== undefined || category) {
      // Use a more robust merging for nested objects if needed, 
      // but for now, spread is better than direct assignment to preserve other fields if schema allows
      settings[category] = {
        ...(settings[category] || {}),
        ...categoryData,
      };

      // Explicitly mark as modified for Mongoose dynamic fields/Mixed types
      settings.markModified(category);
    }

    await settings.save();
    return settings;
  } catch (error) {
    throw error;
  }
};

