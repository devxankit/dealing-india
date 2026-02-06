import { getSettings, updateCategorySettings } from '../services/settings.service.js';
import redisService from '../services/redis.service.js';

/**
 * Helper to clear settings-related cache
 */
const clearSettingsCache = async () => {
  try {
    await redisService.clearPattern('public:settings:*');
  } catch (error) {
    console.error('Error clearing settings cache:', error);
  }
};

/**
 * Get settings
 * GET /api/admin/settings
 */
export const getSettingsController = async (req, res, next) => {
  try {
    const settings = await getSettings();

    res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update settings category
 * PUT /api/admin/settings/:category
 */
export const updateSettingsController = async (req, res, next) => {
  try {
    const { category } = req.params;
    const categoryData = req.body;

    // Validate category
    const validCategories = ['general', 'products', 'tax', 'payment', 'shipping', 'features', 'homepage', 'reviews', 'notifications', 'seo', 'email'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Valid categories are: general, products, tax, payment, shipping, features, homepage, reviews',
      });
    }

    const settings = await updateCategorySettings(category, categoryData);

    // Clear cache
    await clearSettingsCache();

    res.status(200).json({
      success: true,
      message: `${category} settings updated successfully`,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

