import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import mongoose from 'mongoose';
import { getAllVendorOrdersTransformed } from './vendorOrders.service.js';

/**
 * Get vendor performance metrics
 * @param {String} vendorId - Vendor ID
 * @param {String} period - Time period (week, month, year)
 * @returns {Promise<Object>} { metrics, earnings, revenueData, topProducts, recentOrders }
 */
export const getVendorPerformanceMetrics = async (vendorId, period = 'month') => {
  try {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    // Get all vendor orders in the period
    const orders = await Order.find({
      'vendorBreakdown.vendorId': new mongoose.Types.ObjectId(vendorId),
      orderDate: { $gte: startDate },
    }).sort({ orderDate: -1 }).lean();

    // Get total products count
    const totalProducts = await Product.countDocuments({
      vendorId: vendorId,
    });

    // Calculate metrics from orders
    let totalRevenue = 0;
    let totalEarnings = 0;
    let pendingEarnings = 0;
    let paidEarnings = 0;
    const customerIds = new Set();

    orders.forEach((order) => {
      const vendorItem = order.vendorBreakdown?.find(
        (vi) => vi.vendorId?.toString() === vendorId.toString()
      );

      if (!vendorItem) {
        return;
      }

      const vendorEarnings = vendorItem.vendorEarnings || 0;
      totalRevenue += vendorItem.subtotal || 0;
      totalEarnings += vendorEarnings;

      // Track customer
      if (order.customerId || order.userId) {
        customerIds.add(order.customerId || order.userId);
      }

      // Categorize earnings by order status
      if (order.status === 'delivered') {
        paidEarnings += vendorEarnings;
      } else {
        pendingEarnings += vendorEarnings;
      }
    });

    const totalOrders = orders.length;
    const customerCount = customerIds.size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const conversionRate = 0; // Requires visitor data

    const metrics = {
      totalRevenue,
      totalOrders,
      totalProducts,
      avgOrderValue,
      customerCount,
      conversionRate,
    };

    const earnings = {
      totalEarnings,
      pendingEarnings,
      paidEarnings,
    };

    // Generate revenue trends
    const trends = await Order.aggregate([
      {
        $match: {
          'vendorBreakdown.vendorId': new mongoose.Types.ObjectId(vendorId),
          orderDate: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'year' ? '%Y-%m' : '%Y-%m-%d',
              date: '$orderDate',
            },
          },
          revenue: {
            $sum: {
              $reduce: {
                input: '$vendorBreakdown',
                initialValue: 0,
                in: {
                  $cond: [
                    { $eq: ['$$this.vendorId', new mongoose.Types.ObjectId(vendorId)] },
                    { $add: ['$$value', '$$this.subtotal'] },
                    '$$value',
                  ],
                },
              },
            },
          },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get top products for this vendor
    const topProducts = await Order.aggregate([
      {
        $match: {
          'vendorBreakdown.vendorId': new mongoose.Types.ObjectId(vendorId),
          orderDate: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.vendorId': new mongoose.Types.ObjectId(vendorId),
        },
      },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          sales: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    // Format top products
    const formattedTopProducts = topProducts.map(p => ({
      id: p._id,
      name: p.name,
      image: p.image,
      sales: p.sales,
      revenue: p.revenue,
      stock: 'in_stock' // Mocking stock for now
    }));

    // Format revenue data
    const revenueData = trends.map((t) => ({
      date: t._id,
      revenue: t.revenue,
      orders: t.orders,
    }));

    // Recent orders (already sorted by date desc)
    const recentOrders = orders.slice(0, 5).map(order => ({
      id: order.orderCode || order._id,
      customerName: order.shippingAddress?.name || 'Guest',
      date: order.orderDate,
      total: order.vendorBreakdown?.find(v => v.vendorId.toString() === vendorId.toString())?.subtotal || 0,
      status: order.status
    }));

    return {
      metrics,
      earnings,
      revenueData,
      topProducts: formattedTopProducts,
      recentOrders
    };
  } catch (error) {
    console.error('Error in getVendorPerformanceMetrics:', error);
    throw error;
  }
};

