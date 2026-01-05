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
export const getVendorPerformanceMetrics = async (vendorId, period = 'all') => {
  try {
    // Get all vendor orders
    let query = {
      $or: [
        { 'vendorBreakdown.vendorId': new mongoose.Types.ObjectId(vendorId) },
        { 'items.productId': { $in: await Product.find({ vendorId }).distinct('_id') } }
      ]
    };

    if (period !== 'all') {
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
      query.orderDate = { $gte: startDate };
    }

    const orders = await Order.find(query).sort({ orderDate: -1 }).lean();

    // Get total products count
    const totalProducts = await Product.countDocuments({
      vendorId: vendorId,
    });

    // Get vendor for commission rate
    const vendor = await mongoose.model('Vendor').findById(vendorId).lean();
    const defaultCommissionRate = vendor?.commissionRate || 0.1;

    // Get vendor product IDs for fallback calculation
    const vendorProductIds = await Product.find({ vendorId }).distinct('_id');
    const vendorProductIdStrings = vendorProductIds.map(id => id.toString());

    // Calculate metrics from orders
    let totalRevenue = 0;
    let totalEarnings = 0;
    let pendingEarnings = 0;
    let paidEarnings = 0;
    const customerIds = new Set();

    orders.forEach((order) => {
      let orderSubtotal = 0;
      let orderEarnings = 0;
      let foundInBreakdown = false;

      // Try to get data from vendorBreakdown first
      if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
        const vendorItem = order.vendorBreakdown.find(
          (vi) => vi.vendorId?.toString() === vendorId.toString()
        );

        if (vendorItem) {
          orderSubtotal = vendorItem.subtotal || 0;
          orderEarnings = vendorItem.vendorEarnings || (orderSubtotal - (vendorItem.commission || 0));
          foundInBreakdown = true;
        }
      }

      // Fallback: Calculate from items if not found in breakdown
      if (!foundInBreakdown && order.items) {
        order.items.forEach(item => {
          const pId = item.productId?.toString() || item.productId;
          if (vendorProductIdStrings.includes(pId)) {
            const itemSubtotal = (item.price || 0) * (item.quantity || 1);
            orderSubtotal += itemSubtotal;
          }
        });
        const commission = orderSubtotal * defaultCommissionRate;
        orderEarnings = orderSubtotal - commission;
      }

      if (orderSubtotal > 0) {
        totalRevenue += orderSubtotal;
        totalEarnings += orderEarnings;

        // Track customer
        if (order.customerId || order.userId) {
          customerIds.add((order.customerId || order.userId).toString());
        }

        // Categorize earnings by order status
        if (order.status === 'delivered' || order.status === 'completed') {
          paidEarnings += orderEarnings;
        } else if (order.status !== 'cancelled' && order.status !== 'returned' && order.status !== 'refunded') {
          pendingEarnings += orderEarnings;
        }
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

    // Prepare aggregation match stage
    const matchStage = {
      $match: {
        $or: [
          { 'vendorBreakdown.vendorId': new mongoose.Types.ObjectId(vendorId) },
          { 'items.productId': { $in: vendorProductIds } }
        ],
        status: { $nin: ['cancelled', 'refunded'] },
      },
    };

    if (period !== 'all') {
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
      matchStage.$match.orderDate = { $gte: startDate };
    }

    // Generate revenue trends
    const trends = await Order.aggregate([
      matchStage,
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
    // We need to be careful here because items might not have vendorId
    const topProducts = await Order.aggregate([
      matchStage,
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': { $in: vendorProductIds },
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

