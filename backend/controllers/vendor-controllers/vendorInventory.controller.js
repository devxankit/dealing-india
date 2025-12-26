import { getVendorInventoryReport } from '../../services/vendorInventory.service.js';

/**
 * Get vendor inventory report
 * GET /api/vendor/inventory/reports
 */
export const getInventoryReport = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;

    const result = await getVendorInventoryReport(vendorId);

    res.status(200).json({
      success: true,
      message: 'Inventory report retrieved successfully',
      data: {
        inventory: result.inventory,
        stats: result.stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

