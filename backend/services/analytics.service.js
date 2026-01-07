import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';

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
      // Already set to start of today
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
 * Get Admin Analytics Summary
 * @param {string} period 
 */
export const getAdminAnalyticsSummary = async (period) => {
  const { startDate, endDate } = getDateRange(period);

  // Get total stats
  const [
    totalRevenueResult,
    totalOrders,
    totalProducts,
    totalCustomers
  ] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.countDocuments({ status: { $ne: 'cancelled' } }),
    Product.countDocuments(),
    User.countDocuments({ role: 'user' })
  ]);

  const totalRevenue = totalRevenueResult[0]?.total || 0;

  // Get growth stats (comparing with previous period)
  const previousStartDate = new Date(startDate);
  const diff = endDate.getTime() - startDate.getTime();
  previousStartDate.setTime(startDate.getTime() - diff);

  const [
    recentRevenueResult,
    previousRevenueResult,
    recentOrders,
    previousOrders,
    recentProducts,
    previousProducts,
    recentCustomers,
    previousCustomers
  ] = await Promise.all([
    Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.aggregate([
      { $match: { orderDate: { $gte: previousStartDate, $lt: startDate }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.countDocuments({ orderDate: { $gte: startDate, $lte: endDate }, status: { $ne: 'cancelled' } }),
    Order.countDocuments({ orderDate: { $gte: previousStartDate, $lt: startDate }, status: { $ne: 'cancelled' } }),
    Product.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    Product.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
    User.countDocuments({ role: 'user', createdAt: { $gte: startDate, $lte: endDate } }),
    User.countDocuments({ role: 'user', createdAt: { $gte: previousStartDate, $lt: startDate } })
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
    productsChange: calculateChange(recentProducts, previousProducts),
    customersChange: calculateChange(recentCustomers, previousCustomers)
  };
};

/**
 * Get Admin Chart Data
 * @param {string} period 
 */
export const getAdminChartData = async (period) => {
  const { startDate, endDate } = getDateRange(period);

  const grouping = {
    week: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
    month: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
    year: { $dateToString: { format: '%Y-%m', date: '$orderDate' } }
  };

  const chartData = await Order.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: grouping[period] || grouping.month,
        revenue: { $sum: '$total' },
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
 * Get Admin Finance Summary
 * @param {string} period 
 */
export const getAdminFinanceSummary = async (period) => {
  const { startDate, endDate } = getDateRange(period);

  const [revenueResult, commissionResult, ordersCount] = await Promise.all([
    // Total Revenue (GMV)
    Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    // Commissions (Admin Profit)
    Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate }, status: 'delivered' } },
      { $unwind: '$vendorBreakdown' },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.commission' } } }
    ]),
    Order.countDocuments({ orderDate: { $gte: startDate, $lte: endDate }, status: { $ne: 'cancelled' } })
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;
  const totalCommission = commissionResult[0]?.total || 0;

  // Simplified finance logic for a marketplace
  const costOfGoods = totalRevenue * 0.85; // Assume 85% goes to vendors
  const operatingExpenses = totalRevenue * 0.05; // Assume 5% operating cost
  const grossProfit = totalRevenue - costOfGoods;
  const netProfit = totalCommission - operatingExpenses;

  return {
    totalRevenue,
    totalOrders: ordersCount,
    averageOrderValue: ordersCount > 0 ? totalRevenue / ordersCount : 0,
    costOfGoods,
    operatingExpenses,
    grossProfit,
    netProfit,
    profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  };
};

/**
 * Get Order Trends
 * @param {string} period 
 */
export const getOrderTrends = async (period) => {
  const { startDate, endDate } = getDateRange(period);

  const trends = await Order.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
        orders: { $sum: 1 },
        revenue: { $sum: "$total" }
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
 * Get Payment Breakdown
 * @param {string} period 
 */
export const getPaymentBreakdown = async (period) => {
  const { startDate, endDate } = getDateRange(period);

  const breakdown = await Order.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
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
 * Get Tax Reports
 * @param {string} period 
 */
export const getTaxReports = async (period) => {
  const { startDate, endDate } = getDateRange(period);

  const taxData = await Order.aggregate([
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
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
 * Get Refund Reports
 * @param {string} period 
 */
export const getRefundReports = async (period) => {
  const { startDate, endDate } = getDateRange(period);

  const orders = await Order.find({
    orderDate: { $gte: startDate, $lte: endDate },
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
 * Get Vendor Analytics Summary
 * @param {string} vendorId 
 * @param {string} period 
 */
export const getVendorAnalyticsSummary = async (vendorId, period) => {
  const { startDate, endDate } = getDateRange(period);
  const vId = new mongoose.Types.ObjectId(vendorId);

  // Total stats for the vendor
  const [totalEarningsResult, totalOrders, totalProducts] = await Promise.all([
    Order.aggregate([
      { $match: { 'vendorBreakdown.vendorId': vId, status: { $ne: 'cancelled' } } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': vId } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.countDocuments({ 'vendorBreakdown.vendorId': vId, status: { $ne: 'cancelled' } }),
    Product.countDocuments({ vendorId: vId })
  ]);

  const totalEarnings = totalEarningsResult[0]?.total || 0;

  // Pending earnings (orders not yet delivered)
  const pendingEarningsResult = await Order.aggregate([
    {
      $match: {
        'vendorBreakdown.vendorId': vId,
        status: { $in: ['pending', 'processing', 'ready_to_ship', 'dispatched', 'shipped_seller', 'shipped'] }
      }
    },
    { $unwind: '$vendorBreakdown' },
    { $match: { 'vendorBreakdown.vendorId': vId } },
    { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
  ]);

  const pendingEarnings = pendingEarningsResult[0]?.total || 0;

  // Growth stats
  const previousStartDate = new Date(startDate);
  const diff = endDate.getTime() - startDate.getTime();
  previousStartDate.setTime(startDate.getTime() - diff);

  const [recentRevenueResult, previousRevenueResult, recentOrders, previousOrders] = await Promise.all([
    Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate }, 'vendorBreakdown.vendorId': vId, status: { $ne: 'cancelled' } } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': vId } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.aggregate([
      { $match: { orderDate: { $gte: previousStartDate, $lt: startDate }, 'vendorBreakdown.vendorId': vId, status: { $ne: 'cancelled' } } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': vId } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    Order.countDocuments({ orderDate: { $gte: startDate, $lte: endDate }, 'vendorBreakdown.vendorId': vId, status: { $ne: 'cancelled' } }),
    Order.countDocuments({ orderDate: { $gte: previousStartDate, $lt: startDate }, 'vendorBreakdown.vendorId': vId, status: { $ne: 'cancelled' } })
  ]);

  const recentRevenue = recentRevenueResult[0]?.total || 0;
  const previousRevenue = previousRevenueResult[0]?.total || 0;

  const calculateChange = (recent, previous) => {
    if (previous === 0) return recent > 0 ? 100 : 0;
    return parseFloat((((recent - previous) / previous) * 100).toFixed(1));
  };

  return {
    totalRevenue: totalEarnings,
    pendingEarnings,
    totalOrders,
    totalProducts,
    revenueChange: calculateChange(recentRevenue, previousRevenue),
    ordersChange: calculateChange(recentOrders, previousOrders)
  };
};

/**
 * Get Vendor Chart Data
 * @param {string} vendorId 
 * @param {string} period 
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
 * Get Vendor Dashboard Data
 * @param {string} vendorId 
 * @param {string} period 
 */
export const getVendorDashboardData = async (vendorId, period) => {
  const { startDate, endDate } = getDateRange(period);
  const vId = new mongoose.Types.ObjectId(vendorId);

  // 1. Basic Metrics & Earnings
  const [
    totalEarningsResult,
    pendingEarningsResult,
    totalOrders,
    totalProducts,
    recentOrders,
    topProductsResult
  ] = await Promise.all([
    // Total Earnings (Delivered)
    Order.aggregate([
      { $match: { 'vendorBreakdown.vendorId': vId, status: 'delivered' } },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': vId } },
      { $group: { _id: null, total: { $sum: '$vendorBreakdown.subtotal' } } }
    ]),
    // Pending Earnings (Not delivered, not cancelled)
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
    // Recent Orders
    Order.find({ 'vendorBreakdown.vendorId': vId })
      .sort({ orderDate: -1 })
      .limit(5)
      .select('orderCode orderDate total status vendorBreakdown')
      .lean(),
    // Top Products
    Order.aggregate([
      { $match: { 'vendorBreakdown.vendorId': vId, status: 'delivered' } },
      { $unwind: '$items' },
      // Since items don't have vendorId directly in some schemas, we might need to join or assume
      // But based on our logic, we'll try to match products belonging to this vendor
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
    ])
  ]);

  const totalEarnings = totalEarningsResult[0]?.total || 0;
  const pendingEarnings = pendingEarningsResult[0]?.total || 0;

  // 2. Revenue Data for Chart
  const revenueData = await getVendorChartData(vendorId, period);

  return {
    metrics: {
      totalRevenue: totalEarnings + pendingEarnings,
      totalOrders,
      totalProducts,
      avgOrderValue: totalOrders > 0 ? (totalEarnings + pendingEarnings) / totalOrders : 0,
      customerCount: 0, // Would need complex grouping to get unique customers
    },
    earnings: {
      totalEarnings: totalEarnings + pendingEarnings,
      pendingEarnings: pendingEarnings,
      paidEarnings: totalEarnings, // Simplified logic: delivered = paid
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
      total: o.vendorBreakdown.find(vb => vb.vendorId.toString() === vendorId.toString())?.subtotal || 0,
      status: o.status
    }))
  };
};
