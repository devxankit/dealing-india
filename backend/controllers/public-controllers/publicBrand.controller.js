import { getAllBrands } from '../../services/brandManagement.service.js';

/**
 * Get all active brands (public endpoint)
 * GET /api/brands
 */
export const getPublicBrands = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100, // Get all active brands
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    // Only return active brands for public endpoint
    const result = await getAllBrands({
      search: '',
      isActive: true, // Only active brands
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Brands retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

