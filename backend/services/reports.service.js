import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';

/**
 * Get sales report
 */
export const getSalesReport = async (filters = {}) => {
  try {
    const { startDate, endDate } = filters;

    // Build query
    const query = {};
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

    // Calculate summary
    const totalSales = orders.reduce((sum, order) => sum + (order.pricing?.total || order.total || 0), 0);
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
      total: order.total,
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
 * Get inventory report
 */
export const getInventoryReport = async () => {
  try {
    const products = await Product.find().lean();

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
 * Get dashboard summary for admin
 */
export const getAdminDashboardSummary = async (period = 'month') => {
  try {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === 'today') {
      // Already set to start of today
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

    // Get orders in the period
    const orders = await Order.find({
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
      $or: [
        { orderDate: { $gte: previousStartDate, $lte: previousEndDate } },
        { createdAt: { $gte: previousStartDate, $lte: previousEndDate } }
      ],
      status: { $nin: ['cancelled', 'refunded'] },
    }).lean();

    // Calculate stats
    const totalRevenue = orders.reduce((sum, o) => sum + (o.pricing?.total || o.total || 0), 0);
    const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.pricing?.total || o.total || 0), 0);

    // Calculate Vendor Earnings vs Platform Earnings (Commission)
    let totalVendorEarnings = 0;
    let totalPlatformEarnings = 0;

    orders.forEach(order => {
      let orderVendorShare = 0;
      let orderPlatformShare = 0;

      if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
        order.vendorBreakdown.forEach(vb => {
          orderVendorShare += (vb.subtotal - (vb.discount || 0) - vb.commission);
          orderPlatformShare += vb.commission;
        });
        // Add tax, shipping and platform fees to platform share
        orderPlatformShare += (order.pricing?.tax || 0);
        orderPlatformShare += (order.pricing?.shipping || 0);
        orderPlatformShare += (order.pricing?.platformFee || 0);
      } else {
        // Fallback: Assume flat 10% commission if no breakdown
        const commissionRate = 0.1;
        const subtotal = order.pricing?.subtotal || order.total || 0;
        const commission = subtotal * commissionRate;
        orderPlatformShare += commission + (order.pricing?.tax || 0) + (order.pricing?.shipping || 0);
        orderVendorShare += (subtotal - (order.pricing?.discount || 0) - commission);
      }

      totalVendorEarnings += orderVendorShare;
      // Total Revenue includes delivery, tax etc, but for simple split: Platform = Revenue - Vendor Share
      // detailed accuracy requires summing up non-vendor line items, but this is a good approximation
      totalPlatformEarnings += orderPlatformShare;
    });

    // Get previous period vendor/platform earnings for comparison
    let prevVendorEarnings = 0;
    let prevPlatformEarnings = 0;
    
    prevOrders.forEach(order => {
      if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
        order.vendorBreakdown.forEach(vb => {
          prevVendorEarnings += (vb.subtotal - (vb.discount || 0) - vb.commission);
          prevPlatformEarnings += vb.commission;
        });
        prevPlatformEarnings += (order.pricing?.tax || 0) + (order.pricing?.shipping || 0) + (order.pricing?.platformFee || 0);
      } else {
        const commissionRate = 0.1;
        const subtotal = order.pricing?.subtotal || order.total || 0;
        const commission = subtotal * commissionRate;
        prevPlatformEarnings += commission + (order.pricing?.tax || 0) + (order.pricing?.shipping || 0);
        prevVendorEarnings += (subtotal - (order.pricing?.discount || 0) - commission);
      }
    });

    const totalOrders = orders.length;
    const prevOrdersCount = prevOrders.length;

    // Get total customers
    const totalCustomers = await User.countDocuments({ role: 'user' });
    const prevCustomers = await User.countDocuments({
      role: 'user',
      createdAt: { $lt: startDate },
    });

    const calculateChange = (recent, previous) => {
      if (previous === 0) return recent > 0 ? 100 : 0;
      return parseFloat((((recent - previous) / previous) * 100).toFixed(1));
    };

    // Get top products
    const topProducts = await Order.aggregate([
      { 
        $match: { 
          $or: [
            { orderDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ],
          status: { $nin: ['cancelled', 'refunded'] } 
        } 
      },
      { $unwind: '$items' },
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

    // Generate revenue trends (daily for month/week, monthly for year)
    const trends = await Order.aggregate([
      { 
        $match: { 
          $or: [
            { orderDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ],
          status: { $nin: ['cancelled', 'refunded'] } 
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'year' ? '%Y-%m' : '%Y-%m-%d',
              date: { $ifNull: ['$orderDate', '$createdAt'] },
            },
          },
          revenue: { $sum: { $ifNull: ['$pricing.total', '$total', 0] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Order status breakdown
    const statusBreakdown = await Order.aggregate([
      { 
        $match: { 
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
      $or: [
        { orderDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customerId', 'name email phone')
      .populate('shippingAddress')
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
        total: order.total,
        items: order.items || [],
        shippingAddress: order.shippingAddress,
        tax: order.pricing?.tax || 0,
        shippingFee: order.pricing?.shipping || 0,
      })),
    };
  } catch (error) {
    throw error;
  }
};

