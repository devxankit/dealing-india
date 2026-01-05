import * as analyticsService from '../../services/analytics.service.js';

export const getAdminAnalyticsSummary = async (req, res) => {
  try {
    const { period } = req.query;
    const summary = await analyticsService.getAdminAnalyticsSummary(period);
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error in getAdminAnalyticsSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin analytics summary',
      error: error.message
    });
  }
};

export const getAdminChartData = async (req, res) => {
  try {
    const { period } = req.query;
    const chartData = await analyticsService.getAdminChartData(period);
    res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error in getAdminChartData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin chart data',
      error: error.message
    });
  }
};

export const getAdminFinanceSummary = async (req, res) => {
  try {
    const { period } = req.query;
    const financeSummary = await analyticsService.getAdminFinanceSummary(period);
    res.status(200).json({
      success: true,
      data: financeSummary
    });
  } catch (error) {
    console.error('Error in getAdminFinanceSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin finance summary',
      error: error.message
    });
  }
};

export const getOrderTrends = async (req, res) => {
  try {
    const { period } = req.query;
    const trends = await analyticsService.getOrderTrends(period);
    res.status(200).json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order trends', error: error.message });
  }
};

export const getPaymentBreakdown = async (req, res) => {
  try {
    const { period } = req.query;
    const breakdown = await analyticsService.getPaymentBreakdown(period);
    res.status(200).json({ success: true, data: breakdown });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment breakdown', error: error.message });
  }
};

export const getTaxReports = async (req, res) => {
  try {
    const { period } = req.query;
    const reports = await analyticsService.getTaxReports(period);
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tax reports', error: error.message });
  }
};

export const getRefundReports = async (req, res) => {
  try {
    const { period } = req.query;
    const reports = await analyticsService.getRefundReports(period);
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch refund reports', error: error.message });
  }
};
