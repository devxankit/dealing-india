import { getSettings, updateCategorySettings } from '../../services/settings.service.js';

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
    const validCategories = ['general', 'products', 'tax', 'banners', 'payment', 'shipping'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Valid categories are: general, products, tax, banners, payment, shipping',
      });
    }

    const settings = await updateCategorySettings(category, categoryData);

    res.status(200).json({
      success: true,
      message: `${category} settings updated successfully`,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

