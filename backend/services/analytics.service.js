import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import mongoose from 'mongoose';

/**
 * Helper to get B2B vendor IDs
 */
const getB2BVendorIds = async () => {
  const vendors = await Vendor.find({ vendorType: 'b2b' }).select('_id');
  return vendors.map(v => v._id);
};

/**
 * Get date range based on period
 * @param {string} period - 'week', 'month', 'year'
 * @returns {Object} - { startDate, endDate }
 */
const getDateRange = (period) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      break;
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'quarter':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  return { startDate, endDate };
};

/**
 * Get Admin Analytics Summary (B2B-ONLY)
 */
export const getAdminAnalyticsSummary = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const b2bVendorIds = await getB2BVendorIds();

  // Get total stats
  const [
    totalRevenueResult,
    totalOrders,
    totalProducts,
    totalCustomers
  ] = await Promise.all([
    Order.aggregate([
      { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorIds }, status: { $ne: 'cancelled' } } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorIds } } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.countDocuments({ 'vendorBreakdown.vendorId': { $in: b2bVendorIds }, status: { $ne: 'cancelled' } }),
    Product.countDocuments({ vendorId: { $in: b2bVendorIds } }),
    User.countDocuments({ role: 'user' }) // Customers are still customers, but we might want to filter those who ordered from B2B
  ]);

  const totalRevenue = totalRevenueResult[0]?.total || 0;

  // Growth stats
  const previousStartDate = new Date(startDate);
  const diff = endDate.getTime() - startDate.getTime();
  previousStartDate.setTime(startDate.getTime() - diff);

  const [
    recentRevenueResult,
    previousRevenueResult,
    recentOrders,
    previousOrders
  ] = await Promise.all([
    Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate }, 'vendorBreakdown.vendorId': { $in: b2bVendorIds }, status: { $ne: 'cancelled' } } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorIds } } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.aggregate([
      { $match: { orderDate: { $gte: previousStartDate, $lt: startDate }, 'vendorBreakdown.vendorId': { $in: b2bVendorIds }, status: { $ne: 'cancelled' } } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorIds } } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.countDocuments({ orderDate: { $gte: startDate, $lte: endDate }, 'vendorBreakdown.vendorId': { $in: b2bVendorIds }, status: { $ne: 'cancelled' } }),
    Order.countDocuments({ orderDate: { $gte: previousStartDate, $lt: startDate }, 'vendorBreakdown.vendorId': { $in: b2bVendorIds }, status: { $ne: 'cancelled' } })
  ]);

  const recentRevenue = recentRevenueResult[0]?.total || 0;
  const previousRevenue = previousRevenueResult[0]?.total || 0;

  const calculateChange = (recent, previous) => {
    if (previous === 0) return recent > 0 ? 100 : 0;
    return parseFloat((((recent - previous) / previous) * 100).toFixed(1));
  };

  return {
    totalRevenue,
    totalOrders,
    totalProducts,
    totalCustomers,
    revenueChange: calculateChange(recentRevenue, previousRevenue),
    ordersChange: calculateChange(recentOrders, previousOrders),
    productsChange: 0,
    customersChange: 0
  };
};

/**
 * Get Admin Chart Data (B2B-ONLY)
 */
export const getAdminChartData = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const b2bVendorIds = await getB2BVendorIds();

  const grouping = {
    week: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
    month: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
    year: { $dateToString: { format: '%Y-%m', date: '$orderDate' } }
  };

  const chartData = await Order.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
        'vendorBreakdown.vendorId': { $in: b2bVendorIds },
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$vendorBreakdown' },
    { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorIds } } },
    {
      $group: {
        _id: grouping[period] || grouping.month,
        revenue: { $sum: '$vendorBreakdown.subtotal' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return chartData.map(item => ({
    date: item._id,
    revenue: item.revenue,
    orders: item.orders
  }));
};

/**
 * Get Admin Finance Summary (B2B-ONLY)
 */
export const getAdminFinanceSummary = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const b2bVendorIds = await getB2BVendorIds();

  const [revenueResult, commissionResult, ordersCount] = await Promise.all([
    Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate }, 'vendorBreakdown.vendorId': { $in: b2bVendorIds }, status: { $ne: 'cancelled' } } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorIds } } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate }, 'vendorBreakdown.vendorId': { $in: b2bVendorIds }, status: 'delivered' } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorIds } } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.commission' } } }
    ]),
    Order.countDocuments({ orderDate: { $gte: startDate, $lte: endDate }, 'vendorBreakdown.vendorId': { $in: b2bVendorIds }, status: { $ne: 'cancelled' } })
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;
  const totalCommission = commissionResult[0]?.total || 0;

  return {
    totalRevenue,
    totalOrders: ordersCount,
    averageOrderValue: ordersCount > 0 ? totalRevenue / ordersCount : 0,
    totalCommission,
    netProfit: totalCommission // Simplified
  };
};

/**
 * Get Order Trends (B2B-ONLY)
 */
export const getOrderTrends = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const b2bVendorIds = await getB2BVendorIds();

  const trends = await Order.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
        'vendorBreakdown.vendorId': { $in: b2bVendorIds }
      }
    },
    { $unwind: '$vendorBreakdown' },
    { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorIds } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
        orders: { $sum: 1 },
        revenue: { $sum: "$vendorBreakdown.subtotal" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return trends.map(t => ({
    date: t._id,
    orders: t.orders,
    revenue: t.revenue
  }));
};

/**
 * Get Payment Breakdown (B2B-ONLY)
 */
export const getPaymentBreakdown = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const b2bVendorIds = await getB2BVendorIds();

  const breakdown = await Order.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
        'vendorBreakdown.vendorId': { $in: b2bVendorIds },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: "$paymentMethod",
        count: { $sum: 1 },
        amount: { $sum: "$total" }
      }
    }
  ]);

  return breakdown.map(b => ({
    method: b._id || 'Unknown',
    count: b.count,
    amount: b.amount
  }));
};

/**
 * Get Tax Reports (B2B-ONLY)
 */
export const getTaxReports = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const b2bVendorIds = await getB2BVendorIds();

  const taxData = await Order.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
        'vendorBreakdown.vendorId': { $in: b2bVendorIds },
        status: 'delivered'
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$orderDate" } },
        taxableAmount: { $sum: "$total" },
        taxAmount: { $sum: { $ifNull: ["$pricing.tax", 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return taxData.map(t => ({
    month: t._id,
    taxableAmount: t.taxableAmount,
    taxAmount: t.taxAmount
  }));
};

/**
 * Get Refund Reports (B2B-ONLY)
 */
export const getRefundReports = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const b2bVendorIds = await getB2BVendorIds();

  const orders = await Order.find({
    orderDate: { $gte: startDate, $lte: endDate },
    'vendorBreakdown.vendorId': { $in: b2bVendorIds },
    $or: [
      { status: { $in: ['returned', 'refunded'] } },
      { 'cancellation.refundStatus': { $exists: true } },
      { paymentStatus: 'refunded' }
    ]
  }).sort({ orderDate: -1 });

  return orders.map(order => ({
    id: order._id,
    orderCode: order.orderCode,
    customerName: order.customerSnapshot?.name || 'Customer',
    amount: order.cancellation?.refundAmount || order.total || 0,
    reason: order.cancellation?.reason || 'Order Returned/Cancelled',
    status: order.cancellation?.refundStatus || (order.status === 'refunded' ? 'completed' : 'pending'),
    requestedDate: order.cancellation?.cancelledAt || order.updatedAt,
    processedDate: order.cancellation?.refundStatus === 'completed' ? order.updatedAt : null
  }));
};

/**
 * Get Vendor Analytics (B2B-ONLY)
 */
export const getVendorAnalyticsSummary = async (vendorId, period) => {
  const { startDate, endDate } = getDateRange(period);
  const vId = new mongoose.Types.ObjectId(vendorId);

  // Verify vendor is B2B
  const vendor = await Vendor.findOne({ _id: vId, vendorType: 'b2b' });
  if (!vendor) throw new Error('Vendor not found or not B2B');

  const [totalEarningsResult, totalOrders, totalProducts, pendingEarningsResult] = await Promise.all([
    Order.aggregate([
      { $match: { 'vendorBreakdown.vendorId': vId, status: { $ne: 'cancelled' } } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': vId } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.countDocuments({ 'vendorBreakdown.vendorId': vId, status: { $ne: 'cancelled' } }),
    Product.countDocuments({ vendorId: vId }),
    Order.aggregate([
      {
        $match: {
          'vendorBreakdown.vendorId': vId,
          status: { $in: ['pending', 'processing', 'ready_to_ship', 'dispatched', 'shipped_seller', 'shipped'] }
        }
      },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': vId } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ])
  ]);

  const totalEarnings = totalEarningsResult[0]?.total || 0;
  const pendingEarnings = pendingEarningsResult[0]?.total || 0;

  return {
    totalRevenue: totalEarnings,
    pendingEarnings,
    totalOrders,
    totalProducts
  };
};

/**
 * Get Vendor Chart Data (B2B-ONLY)
 */
export const getVendorChartData = async (vendorId, period) => {
  const { startDate, endDate } = getDateRange(period);
  const vId = new mongoose.Types.ObjectId(vendorId);

  const grouping = {
    week: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
    month: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
    year: { $dateToString: { format: '%Y-%m', date: '$orderDate' } }
  };

  const chartData = await Order.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
        'vendorBreakdown.vendorId': vId,
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$vendorBreakdown' },
    { $match: { 'vendorBreakdown.vendorId': vId } },
    {
      $group: {
        _id: grouping[period] || grouping.month,
        revenue: { $sum: '$vendorBreakdown.subtotal' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return chartData.map(item => ({
    date: item._id,
    revenue: item.revenue,
    orders: item.orders
  }));
};

/**
 * Get Vendor Dashboard Data (B2B-ONLY)
 */
export const getVendorDashboardData = async (vendorId, period) => {
  const { startDate, endDate } = getDateRange(period);
  const vId = new mongoose.Types.ObjectId(vendorId);

  const [
    totalEarningsResult,
    pendingEarningsResult,
    totalOrders,
    totalProducts,
    recentOrders,
    topProductsResult,
    revenueData
  ] = await Promise.all([
    Order.aggregate([
      { $match: { 'vendorBreakdown.vendorId': vId, status: 'delivered' } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': vId } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.aggregate([
      {
        $match: {
          'vendorBreakdown.vendorId': vId,
          status: { $in: ['pending', 'processing', 'ready_to_ship', 'dispatched', 'shipped_seller', 'shipped'] }
        }
      },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': vId } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.countDocuments({ 'vendorBreakdown.vendorId': vId, status: { $ne: 'cancelled' } }),
    Product.countDocuments({ vendorId: vId }),
    Order.find({ 'vendorBreakdown.vendorId': vId })
      .sort({ orderDate: -1 })
      .limit(5)
      .lean(),
    Order.aggregate([
      { $match: { 'vendorBreakdown.vendorId': vId, status: 'delivered' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      { $match: { 'productInfo.vendorId': vId } },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          sales: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]),
    getVendorChartData(vendorId, period)
  ]);

  const totalEarnings = totalEarningsResult[0]?.total || 0;
  const pendingEarnings = pendingEarningsResult[0]?.total || 0;

  return {
    metrics: {
      totalRevenue: totalEarnings + pendingEarnings,
      totalOrders,
      totalProducts,
      avgOrderValue: totalOrders > 0 ? (totalEarnings + pendingEarnings) / totalOrders : 0,
      customerCount: 0,
    },
    earnings: {
      totalEarnings: totalEarnings + pendingEarnings,
      pendingEarnings: pendingEarnings,
      paidEarnings: totalEarnings,
    },
    revenueData,
    topProducts: topProductsResult.map(p => ({
      id: p._id,
      name: p.name,
      image: p.image,
      sales: p.sales,
      revenue: p.revenue
    })),
    recentOrders: recentOrders.map(o => ({
      id: o.orderCode,
      date: o.orderDate,
      total: o.vendorBreakdown.find(vb => vb.vendorId.toString() === vId.toString())?.subtotal || 0,
      status: o.status
    }))
  };
};

