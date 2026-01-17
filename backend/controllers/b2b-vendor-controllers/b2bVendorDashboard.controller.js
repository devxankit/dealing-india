import * as b2bVendorDashboardService from '../../services/b2bVendorDashboard.service.js';

/**
 * Get B2B Vendor Dashboard Data
 * GET /api/b2b-vendor/dashboard
 */
export const getB2BVendorDashboardData = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { period = 'month' } = req.query;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    const dashboardData = await b2bVendorDashboardService.getB2BVendorDashboardData(vendorId, period);

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error in getB2BVendorDashboardData:', error);
    next(error);
  }
};
