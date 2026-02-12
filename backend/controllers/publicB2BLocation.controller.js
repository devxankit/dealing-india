import { getB2BAvailableLocations } from '../services/b2bLocation.service.js';

/**
 * Get available B2B vendor locations
 * GET /api/public/b2b-locations
 */
export const getB2BLocations = async (req, res, next) => {
  try {
    const { businessTypeFilter, businessTypes } = req.query;
    
    const options = {};
    if (businessTypeFilter && businessTypes) {
      options.businessTypeFilter = businessTypeFilter;
      options.businessTypes = Array.isArray(businessTypes) ? businessTypes : businessTypes.split(',');
    }
    
    const locations = await getB2BAvailableLocations(options);

    res.status(200).json({
      success: true,
      message: 'B2B locations retrieved successfully',
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};
