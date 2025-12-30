import { getVendorCustomers } from '../../services/vendorCustomers.service.js';

/**
 * Get vendor customers
 * GET /api/vendor/customers
 */
export const getCustomers = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { search = '', page = 1, limit = 10 } = req.query;

    const result = await getVendorCustomers(vendorId, {
      search,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      data: {
        customers: result.customers,
        stats: result.stats,
      },
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

