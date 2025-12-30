import {
  getSalesReport,
  getInventoryReport,
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

