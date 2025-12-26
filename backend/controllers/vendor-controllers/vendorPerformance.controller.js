import { getVendorPerformanceMetrics } from '../../services/vendorPerformance.service.js';

/**
 * Get vendor performance metrics
 * GET /api/vendor/performance/metrics
 */
export const getPerformanceMetrics = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;

    const result = await getVendorPerformanceMetrics(vendorId);

    res.status(200).json({
      success: true,
      message: 'Performance metrics retrieved successfully',
      data: {
        metrics: result.metrics,
        earnings: result.earnings,
      },
    });
  } catch (error) {
    next(error);
  }
};

