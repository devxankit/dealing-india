import {
  getSalesReport,
  getInventoryReport,
  getAdminDashboardSummary,
} from '../../services/reports.service.js';

/**
 * Get sales report
 * GET /api/admin/reports/sales
 */
export const getSales = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await getSalesReport({ startDate, endDate });

    res.status(200).json({
      success: true,
      message: 'Sales report retrieved successfully',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory report
 * GET /api/admin/reports/inventory
 */
export const getInventory = async (req, res, next) => {
  try {
    const report = await getInventoryReport();

    res.status(200).json({
      success: true,
      message: 'Inventory report retrieved successfully',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard summary
 * GET /api/admin/reports/dashboard-summary
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const { period } = req.query;
    const validPeriods = ['week', 'month', 'year'];
    const selectedPeriod = validPeriods.includes(period) ? period : 'month';

    const result = await getAdminDashboardSummary(selectedPeriod);

    res.status(200).json({
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

