import { getVendorCustomers, getVendorCustomerById } from '../../services/vendorCustomers.service.js';

/**
 * Get vendor customers
 * GET /api/vendor/customers
 */
export const getCustomers = async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId || req.user?.id;
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID not found in token',
      });
    }

    const { search = '', page = 1, limit = 10 } = req.query;

    console.log(`[getCustomers] Fetching customers for vendor ${vendorId}`);

    const result = await getVendorCustomers(vendorId, {
      search,
      page,
      limit,
    });

    console.log(`[getCustomers] Found ${result.customers?.length || 0} customers`);

    res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      data: {
        customers: result.customers || [],
        stats: result.stats || {
          totalCustomers: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
        },
      },
      meta: result.pagination || {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0,
      },
    });
  } catch (error) {
    console.error('[getCustomers] Error:', error);
    next(error);
  }
};

/**
 * Get vendor customer detail by ID
 * GET /api/vendor/customers/:id
 */
export const getCustomerById = async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId || req.user?.id;
    const { id: customerId } = req.params;
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID not found in token',
      });
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required',
      });
    }

    console.log(`[getCustomerById] Fetching customer ${customerId} for vendor ${vendorId}`);

    const result = await getVendorCustomerById(vendorId, customerId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    console.log(`[getCustomerById] Found customer with ${result.orders?.length || 0} orders`);

    res.status(200).json({
      success: true,
      message: 'Customer retrieved successfully',
      data: {
        customer: result.customer,
        orders: result.orders || [],
      },
    });
  } catch (error) {
    console.error('[getCustomerById] Error:', error);
    next(error);
  }
};

