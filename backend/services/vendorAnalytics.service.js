import Vendor from '../models/Vendor.model.js';

// Order model - handle gracefully if it doesn't exist
let Order = null;
try {
  const orderModule = await import('../models/Order.model.js');
  if (orderModule && orderModule.default) {
    Order = orderModule.default;
  }
} catch (error) {
  // Order model doesn't exist yet, analytics will return empty data
  // This is fine - orders will be empty until Order model is created
}

/**
 * Get vendor analytics/statistics
 * @param {String} vendorId - Vendor ID (optional, if not provided returns overall stats)
 * @returns {Promise<Object>} Analytics data
 */
export const getVendorAnalytics = async (vendorId = null) => {
  try {
    if (vendorId) {
      // Get analytics for specific vendor
      return await getSingleVendorAnalytics(vendorId);
    } else {
      // Get overall analytics for all approved vendors
      return await getAllVendorsAnalytics();
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get analytics for a single vendor
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} Vendor analytics
 */
const getSingleVendorAnalytics = async (vendorId) => {
  try {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Get vendor orders using vendorBreakdown (actual Order model structure)
    let orders = [];
    if (Order) {
      orders = await Order.find({
        'vendorBreakdown.vendorId': vendorId,
        status: { $ne: 'cancelled' } // Exclude cancelled orders
      }).lean();
    }

    // Calculate statistics
    const totalOrders = orders.length;
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalEarnings = 0;
    let pendingEarnings = 0;
    let paidEarnings = 0;

    orders.forEach((order) => {
      // Use vendorBreakdown (actual field in Order model)
      const vendorBreakdown = order.vendorBreakdown?.find(
        (vb) => vb.vendorId?.toString() === vendorId.toString()
      );

      if (vendorBreakdown) {
        const subtotal = vendorBreakdown.subtotal || 0;
        const commission = vendorBreakdown.commission || (subtotal * (vendor.commissionRate || 0.1));
        const earnings = subtotal - commission;

        totalRevenue += subtotal;
        totalCommission += commission;
        totalEarnings += earnings;

        // Assuming order status determines payment status
        if (order.status === 'delivered' || order.status === 'completed') {
          paidEarnings += earnings;
        } else {
          pendingEarnings += earnings;
        }
      }
    });

    return {
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        storeName: vendor.storeName,
        status: vendor.status,
        commissionRate: vendor.commissionRate || 0.1,
      },
      stats: {
        totalOrders,
        totalRevenue,
        totalCommission,
        totalEarnings,
        pendingEarnings,
        paidEarnings,
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get analytics for all approved vendors
 * @returns {Promise<Object>} Overall analytics
 */
const getAllVendorsAnalytics = async () => {
  try {
    const approvedVendors = await Vendor.find({ status: 'approved' }).lean();

    // Get all orders
    let orders = [];
    if (Order) {
      orders = await Order.find({}).lean();
    }

    // Calculate overall stats
    let totalVendors = approvedVendors.length;
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalEarnings = 0;

    const vendorStats = approvedVendors.map((vendor) => {
      // Filter orders that have this vendor in vendorBreakdown
      const vendorOrders = orders.filter((order) => {
        return order.vendorBreakdown?.some(
          (vb) => vb.vendorId?.toString() === vendor._id.toString()
        );
      });

      let vendorRevenue = 0;
      let vendorEarnings = 0;
      let vendorPendingEarnings = 0;
      let vendorPaidEarnings = 0;

      vendorOrders.forEach((order) => {
        // Use vendorBreakdown (actual field in Order model)
        const vendorBreakdown = order.vendorBreakdown?.find(
          (vb) => vb.vendorId?.toString() === vendor._id.toString()
        );

        if (vendorBreakdown) {
          const subtotal = vendorBreakdown.subtotal || 0;
          const commission = vendorBreakdown.commission || (subtotal * (vendor.commissionRate || 0.1));
          const earnings = subtotal - commission;

          vendorRevenue += subtotal;
          vendorEarnings += earnings;

          if (order.status === 'delivered' || order.status === 'completed') {
            vendorPaidEarnings += earnings;
          } else {
            vendorPendingEarnings += earnings;
          }
        }
      });

      totalOrders += vendorOrders.length;
      totalRevenue += vendorRevenue;
      totalEarnings += vendorEarnings;

      return {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          storeName: vendor.storeName,
          status: vendor.status,
        },
        stats: {
          totalOrders: vendorOrders.length,
          totalRevenue: vendorRevenue,
          totalEarnings: vendorEarnings,
          pendingEarnings: vendorPendingEarnings,
          paidEarnings: vendorPaidEarnings,
        },
      };
    });

    // Sort by revenue (descending)
    vendorStats.sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue);

    return {
      overall: {
        totalVendors,
        totalOrders,
        totalRevenue,
        totalEarnings,
      },
      vendors: vendorStats,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get vendor orders
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { page, limit, status }
 * @returns {Promise<Object>} { orders, total, page, totalPages }
 */
export const getVendorOrders = async (vendorId, filters = {}) => {
  try {
    if (!Order) {
      // Return empty result if Order model doesn't exist
      return {
        orders: [],
        total: 0,
        page: parseInt(filters.page || 1),
        limit: parseInt(filters.limit || 10),
        totalPages: 0,
      };
    }

    const { page = 1, limit = 10, status } = filters;

    const query = {
      'vendorBreakdown.vendorId': vendorId,
      status: { $ne: 'cancelled' } // Exclude cancelled orders
    };

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      orders,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    throw error;
  }
};

