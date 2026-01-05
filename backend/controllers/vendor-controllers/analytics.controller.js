import * as analyticsService from '../../services/analytics.service.js';

export const getVendorAnalyticsSummary = async (req, res) => {
  try {
    const { period } = req.query;
    const vendorId = req.user.vendorId; // Extract vendorId from JWT payload
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    const summary = await analyticsService.getVendorAnalyticsSummary(vendorId, period);
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error in getVendorAnalyticsSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor analytics summary',
      error: error.message
    });
  }
};

export const getVendorChartData = async (req, res) => {
  try {
    const { period } = req.query;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    const chartData = await analyticsService.getVendorChartData(vendorId, period);
    res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error in getVendorChartData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor chart data',
      error: error.message
    });
  }
};

export const getVendorDashboardData = async (req, res) => {
  try {
    const { period } = req.query;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    const dashboardData = await analyticsService.getVendorDashboardData(vendorId, period);
    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error in getVendorDashboardData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor dashboard data',
      error: error.message
    });
  }
};
