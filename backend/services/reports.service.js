import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';

/**
 * Helper to get B2B vendor IDs
 */
const getB2BVendorIds = async () => {
  const vendors = await Vendor.find({ vendorType: 'b2b' }).select('_id');
  return vendors.map(v => v._id);
};

/**
 * Get sales report (B2B-ONLY)
 */
export const getSalesReport = async (filters = {}) => {
  try {
    const { startDate, endDate } = filters;
    const b2bVendorIds = await getB2BVendorIds();

    // Build query
    const query = {
      'vendorBreakdown.vendorId': { $in: b2bVendorIds }
    };
    if (startDate || endDate) {
      const dateQuery = {};
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
      query.$or = [
        { orderDate: dateQuery },
        { createdAt: dateQuery }
      ];
    }

    // Get orders
    const orders = await Order.find(query)
      .populate('customerId', 'name email phone')
      .populate('shippingAddress')
      .sort({ createdAt: -1 })
      .lean();

    // Filter vendorBreakdown in summary calculation
    let totalSales = 0;
    orders.forEach(order => {
      order.vendorBreakdown.forEach(vb => {
        if (b2bVendorIds.some(id => id.toString() === vb.vendorId?.toString())) {
          totalSales += (vb.subtotal || 0);
        }
      });
    });

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Format orders for response
    const ordersList = orders.map((order) => ({
      id: order.orderCode || order._id.toString(),
      customer: {
        name: order.customerId?.name || order.customerSnapshot?.name || 'Guest',
        email: order.customerId?.email || order.customerSnapshot?.email || '',
        phone: order.customerId?.phone || order.customerSnapshot?.phone || '',
      },
      date: order.orderDate || order.createdAt,
      status: order.status,
      total: order.vendorBreakdown.reduce((sum, vb) =>
        b2bVendorIds.some(id => id.toString() === vb.vendorId?.toString()) ? sum + vb.subtotal : sum, 0),
      items: order.items || [],
      shippingAddress: order.shippingAddress,
      tax: order.pricing?.tax || 0,
      shippingFee: order.pricing?.shipping || 0,
    }));

    return {
      summary: {
        totalSales,
        totalOrders,
        averageOrderValue,
      },
      orders: ordersList,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get inventory report (B2B-ONLY)
 */
export const getInventoryReport = async () => {
  try {
    const b2bVendorIds = await getB2BVendorIds();
    const products = await Product.find({ vendorId: { $in: b2bVendorIds } }).lean();

    // Calculate stats
    const totalProducts = products.length;
    const inStock = products.filter((p) => p.stock === 'in_stock').length;
    const lowStock = products.filter((p) => p.stock === 'low_stock').length;
    const outOfStock = products.filter((p) => p.stock === 'out_of_stock').length;
    const totalValue = products.reduce(
      (sum, p) => sum + (p.price * (p.stockQuantity || 0)),
      0
    );

    // Get low stock products
    const lowStockProducts = products.filter(
      (p) => p.stock === 'low_stock' || p.stock === 'out_of_stock'
    );

    // Format products
    const formatProduct = (product) => ({
      id: product._id.toString(),
      name: product.name,
      image: product.image || '',
      stockQuantity: product.stockQuantity || 0,
      stock: product.stock,
      price: product.price,
      value: product.price * (product.stockQuantity || 0),
    });

    return {
      stats: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
        totalValue,
      },
      lowStockProducts: lowStockProducts.map(formatProduct),
      products: products.map(formatProduct),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get dashboard summary for admin (B2B-ONLY)
 */
export const getAdminDashboardSummary = async (period = 'month') => {
  try {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === 'today') {
    } else if (period === 'week') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(endDate.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(endDate.getMonth() - 3);
    } else if (period === 'year') {
      startDate.setFullYear(endDate.getFullYear() - 1);
    } else {
      startDate.setMonth(endDate.getMonth() - 1);
    }

    const b2bVendorIds = await getB2BVendorIds();

    // Get orders in the period (B2B filtering)
    const orders = await Order.find({
      'vendorBreakdown.vendorId': { $in: b2bVendorIds },
      $or: [
        { orderDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ],
      status: { $nin: ['cancelled', 'refunded'] },
    }).lean();

    // Get previous period orders for comparison
    const previousStartDate = new Date(startDate);
    const diff = endDate.getTime() - startDate.getTime();
    previousStartDate.setTime(startDate.getTime() - diff);

    const previousEndDate = new Date(startDate);
    previousEndDate.setMilliseconds(-1);

    const prevOrders = await Order.find({
      'vendorBreakdown.vendorId': { $in: b2bVendorIds },
      $or: [
        { orderDate: { $gte: previousStartDate, $lte: previousEndDate } },
        { createdAt: { $gte: previousStartDate, $lte: previousEndDate } }
      ],
      status: { $nin: ['cancelled', 'refunded'] },
    }).lean();

    // Calculate stats
    let totalRevenue = 0;
    orders.forEach(o => {
      o.vendorBreakdown.forEach(vb => {
        if (b2bVendorIds.some(id => id.toString() === vb.vendorId?.toString())) {
          totalRevenue += vb.subtotal;
        }
      });
    });

    let prevRevenue = 0;
    prevOrders.forEach(o => {
      o.vendorBreakdown.forEach(vb => {
        if (b2bVendorIds.some(id => id.toString() === vb.vendorId?.toString())) {
          prevRevenue += vb.subtotal;
        }
      });
    });

    let totalVendorEarnings = 0;
    let totalPlatformEarnings = 0;

    orders.forEach(order => {
      order.vendorBreakdown.forEach(vb => {
        if (b2bVendorIds.some(id => id.toString() === vb.vendorId?.toString())) {
          totalVendorEarnings += (vb.subtotal - (vb.discount || 0) - vb.commission);
          totalPlatformEarnings += vb.commission;
        }
      });
      // Simplified: platform also gets tax/shipping for B2B orders? 
      // Usually vendors keep it or it's handled separately. For now, matching original logic but filtered.
      totalPlatformEarnings += (order.pricing?.tax || 0) + (order.pricing?.shipping || 0) + (order.pricing?.platformFee || 0);
    });

    let prevVendorEarnings = 0;
    let prevPlatformEarnings = 0;

    prevOrders.forEach(order => {
      order.vendorBreakdown.forEach(vb => {
        if (b2bVendorIds.some(id => id.toString() === vb.vendorId?.toString())) {
          prevVendorEarnings += (vb.subtotal - (vb.discount || 0) - vb.commission);
          prevPlatformEarnings += vb.commission;
        }
      });
      prevPlatformEarnings += (order.pricing?.tax || 0) + (order.pricing?.shipping || 0) + (order.pricing?.platformFee || 0);
    });

    const totalOrders = orders.length;
    const prevOrdersCount = prevOrders.length;

    // Get total B2B customers
    const totalCustomers = await User.countDocuments({ role: 'user', currentMarketplace: 'b2b' });
    const prevCustomers = await User.countDocuments({
      role: 'user',
      currentMarketplace: 'b2b',
      createdAt: { $lt: startDate },
    });

    const calculateChange = (recent, previous) => {
      if (previous === 0) return recent > 0 ? 100 : 0;
      return parseFloat((((recent - previous) / previous) * 100).toFixed(1));
    };

    // Get top B2B products
    const topProducts = await Order.aggregate([
      {
        $match: {
          'vendorBreakdown.vendorId': { $in: b2bVendorIds },
          $or: [
            { orderDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ],
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
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
      { $match: { 'productInfo.vendorId': { $in: b2bVendorIds } } },
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

    // Generate revenue trends
    const trends = await Order.aggregate([
      {
        $match: {
          'vendorBreakdown.vendorId': { $in: b2bVendorIds },
          $or: [
            { orderDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ],
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      { $unwind: '$vendorBreakdown' },
      { $match: { 'vendorBreakdown.vendorId': { $in: b2bVendorIds } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'year' ? '%Y-%m' : '%Y-%m-%d',
              date: { $ifNull: ['$orderDate', '$createdAt'] },
            },
          },
          revenue: { $sum: '$vendorBreakdown.subtotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $match: {
          'vendorBreakdown.vendorId': { $in: b2bVendorIds },
          $or: [
            { orderDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent orders
    const recentOrders = await Order.find({
      'vendorBreakdown.vendorId': { $in: b2bVendorIds },
      $or: [
        { orderDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customerId', 'name email phone')
      .populate('shippingAddress')
      .populate('vendorBreakdown.vendorId', 'name storeName email phone')
      .lean();

    return {
      summary: {
        totalRevenue,
        revenueChange: calculateChange(totalRevenue, prevRevenue),
        totalOrders,
        ordersChange: calculateChange(totalOrders, prevOrdersCount),
        totalCustomers,
        customersChange: calculateChange(totalCustomers, prevCustomers),
        avgOrderValue: totalOrders === 0 ? 0 : totalRevenue / totalOrders,
        totalVendorEarnings,
        vendorEarningsChange: calculateChange(totalVendorEarnings, prevVendorEarnings),
        totalPlatformEarnings,
        platformEarningsChange: calculateChange(totalPlatformEarnings, prevPlatformEarnings),
      },
      statsCards: [
        {
          label: 'Total Revenue',
          value: totalRevenue,
          prevValue: prevRevenue,
          trend: calculateChange(totalRevenue, prevRevenue),
          suffix: '₹',
        },
        {
          label: 'Total Orders',
          value: totalOrders,
          prevValue: prevOrdersCount,
          trend: calculateChange(totalOrders, prevOrdersCount),
        },
        {
          label: 'Total Customers',
          value: totalCustomers,
          prevValue: prevCustomers,
          trend: calculateChange(totalCustomers, prevCustomers),
        },
        {
          label: 'Platform Earnings',
          value: totalPlatformEarnings,
          prevValue: prevPlatformEarnings,
          trend: calculateChange(totalPlatformEarnings, prevPlatformEarnings),
          suffix: '₹',
        },
      ],
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
      orderStatus: statusBreakdown.map((s) => ({
        status: s._id,
        count: s.count,
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.orderCode || order._id.toString(),
        customer: {
          name: order.customerId?.name || order.customerSnapshot?.name || 'Guest',
          email: order.customerId?.email || order.customerSnapshot?.email || '',
          phone: order.customerId?.phone || order.customerSnapshot?.phone || '',
        },
        date: order.orderDate || order.createdAt,
        status: order.status,
        total: order.vendorBreakdown.reduce((sum, vb) =>
          b2bVendorIds.some(id => id.toString() === vb.vendorId?.toString()) ? sum + vb.subtotal : sum, 0),
        items: order.items || [],
        shippingAddress: order.shippingAddress,
        tax: order.pricing?.tax || 0,
        shippingFee: order.pricing?.shipping || 0,
        vendorItems: (order.vendorBreakdown || []).map(vb => ({
          vendorId: vb.vendorId?._id || vb.vendorId,
          vendorName: vb.vendorName || vb.vendorId?.storeName || vb.vendorId?.name || 'Unknown Vendor',
          vendorEmail: vb.vendorId?.email || 'N/A',
          vendorPhone: vb.vendorId?.phone || 'N/A',
        }))
      })),
    };
  } catch (error) {
    throw error;
  }
};


