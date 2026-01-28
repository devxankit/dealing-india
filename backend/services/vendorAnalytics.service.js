import Vendor from '../models/Vendor.model.js';
import redisService from './redis.service.js';

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
        const discount = vendorBreakdown.discount || 0;
        const commission = vendorBreakdown.commission || (subtotal * (vendor.commissionRate || 0.1));
        const earnings = subtotal - discount - commission;

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

    // Get Redis real-time stats
    const viewCount = await redisService.get(`vendor:views:${vendorId}`) || 0;
    const todayOrders = await redisService.get(`vendor:orders:today:${vendorId}`) || 0;

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
        todayOrders: parseInt(todayOrders) || 0,
        viewCount: parseInt(viewCount) || 0,
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
          const discount = vendorBreakdown.discount || 0;
          const commission = vendorBreakdown.commission || (subtotal * (vendor.commissionRate || 0.1));
          const earnings = subtotal - discount - commission;

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
    };

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [ordersRaw, total] = await Promise.all([
      Order.find(query)
        .populate('customerId', 'name email phone')
        .populate('shippingAddress')
        .populate('items.productId', 'name images slug vendorId vendorName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    // Transform orders for frontend compatibility
    const orders = ordersRaw.map((order) => {
      const orderObj = {
        ...order,
        id: order._id.toString(),
        orderDate: order.orderDate || order.date || order.createdAt,
      };

      // Transform vendorBreakdown to vendorItems for frontend compatibility
      if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
        orderObj.vendorItems = order.vendorBreakdown.map((vb) => {
          // Get items for this vendor
          const vendorItems = (order.items || []).filter((item) => {
            const productVendorId = item.productId?.vendorId?._id || item.productId?.vendorId || item.productId?.vendorId;
            const vendorIdStr = (vb.vendorId?._id || vb.vendorId)?.toString();
            return vendorIdStr && productVendorId && productVendorId.toString() === vendorIdStr;
          });

          return {
            vendorId: vb.vendorId?._id || vb.vendorId,
            vendorName: vb.vendorName || vb.vendorId?.name || vb.vendorId?.storeName || 'Unknown Vendor',
            items: vendorItems.map((item) => ({
              id: item.productId?._id || item.productId || item._id,
              productId: item.productId?._id || item.productId,
              name: item.name || item.productId?.name,
              quantity: item.quantity,
              price: item.price,
              image: item.image || item.productId?.images?.[0],
              variant: item.variant,
            })),
            subtotal: vb.subtotal || 0,
            shipping: vb.shipping || 0,
            tax: vb.tax || 0,
            discount: vb.discount || 0,
            commission: vb.commission || 0,
          };
        });
      }

      return orderObj;
    });

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

