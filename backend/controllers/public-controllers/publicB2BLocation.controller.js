import { getB2BAvailableLocations } from '../../services/b2bLocation.service.js';
import redisService from '../../services/redis.service.js';

/**
 * Get available B2B vendor locations
 * GET /api/public/b2b-locations
 */
export const getB2BLocations = async (req, res, next) => {
  try {
    const cacheKey = 'b2b:available_locations';
    
    // Try to get from cache first
    try {
      const cachedData = await redisService.get(cacheKey);
      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: 'B2B locations retrieved successfully',
          data: cachedData,
        });
      }
    } catch (cacheError) {
      console.error('Cache read error (non-fatal):', cacheError);
      // Continue to fetch from database if cache fails
    }

    // Fetch from database
    const locations = await getB2BAvailableLocations();

    // Cache the result for 10 minutes (600 seconds)
    try {
      await redisService.set(cacheKey, locations, 600);
    } catch (cacheError) {
      console.error('Cache write error (non-fatal):', cacheError);
      // Continue even if cache fails
    }

    res.status(200).json({
      success: true,
      message: 'B2B locations retrieved successfully',
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};
