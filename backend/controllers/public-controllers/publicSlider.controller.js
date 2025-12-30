import { getActiveSliders } from '../../services/sliders.service.js';

/**
 * Get all active sliders (public endpoint)
 * GET /api/sliders
 */
export const getPublicSliders = async (req, res, next) => {
  try {
    // Only return active sliders for public endpoint
    const sliders = await getActiveSliders();

    res.status(200).json({
      success: true,
      message: 'Sliders retrieved successfully',
      data: { sliders },
    });
  } catch (error) {
    next(error);
  }
};

