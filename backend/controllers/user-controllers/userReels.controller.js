import { getActiveReelsForUsers } from '../../services/userReels.service.js';

/**
 * Get all active reels for users
 * GET /api/user/reels
 */
export const getReels = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getActiveReelsForUsers({
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Reels retrieved successfully',
      data: {
        reels: result.reels,
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

