import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import mongoose from 'mongoose';
import { getAllVendorOrdersTransformed } from './vendorOrders.service.js';

/**
 * Get vendor performance metrics
 * @param {String} vendorId - Vendor ID
 * @returns {Promise<Object>} { metrics, earnings }
 */
export const getVendorPerformanceMetrics = async (vendorId) => {
  try {
    // Get all vendor orders
    const orders = await getAllVendorOrdersTransformed(vendorId);

    // Get total products count
    const totalProducts = await Product.countDocuments({
      vendorId,
      isActive: true,
    });

    // Calculate metrics from orders
    let totalRevenue = 0;
    let totalEarnings = 0;
    let pendingEarnings = 0;
    let paidEarnings = 0;
    const customerIds = new Set();

    orders.forEach((order) => {
      const vendorItem = order.vendorItems?.find(
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
    const conversionRate = 0; // Requires visitor data not available

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

    // Generate daily revenue trends for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trends = await Order.aggregate([
      {
        $match: {
          'vendorBreakdown.vendorId': new mongoose.Types.ObjectId(vendorId),
          orderDate: { $gte: thirtyDaysAgo },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
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

    // Top selling products for this vendor
    const topProducts = await Order.aggregate([
      {
        $match: {
          'vendorBreakdown.vendorId': new mongoose.Types.ObjectId(vendorId),
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $match: {
          'productInfo.vendorId': new mongoose.Types.ObjectId(vendorId),
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
      { $sort: { sales: -1 } },
      { $limit: 5 },
    ]);

    return {
      metrics,
      earnings,
      revenueData: trends.map((t) => ({
        date: t._id,
        revenue: t.revenue,
        orders: t.orders,
      })),
      topProducts: topProducts.map((p) => ({
        id: p._id,
        name: p.name,
        image: p.image,
        sales: p.sales,
        revenue: p.revenue,
      })),
      recentOrders: orders.slice(0, 10).map((o) => ({
        id: o.orderCode || o._id,
        customer: {
          name: o.customerId?.name || o.customerSnapshot?.name || 'Guest',
          email: o.customerId?.email || o.customerSnapshot?.email || '',
        },
        date: o.orderDate,
        status: o.status,
        total: o.total,
        items: o.items,
      })),
    };
  } catch (error) {
    throw error;
  }
};

