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
      query.orderDate = {};
      if (startDate) {
        query.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.orderDate.$lte = end;
      }
    }

    // Get orders
    const orders = await Order.find(query)
      .populate('customerId', 'name email phone')
      .populate('shippingAddress')
      .sort({ orderDate: -1 })
      .lean();

    // Calculate summary
    const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
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
    const startDate = new Date();

    if (period === 'week') {
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
      orderDate: { $gte: startDate, $lte: endDate },
      status: { $nin: ['cancelled', 'refunded'] },
    }).lean();

    // Get previous period orders for comparison
    const previousStartDate = new Date(startDate);
    const diff = endDate.getTime() - startDate.getTime();
    previousStartDate.setTime(startDate.getTime() - diff);

    const prevOrders = await Order.find({
      orderDate: { $gte: previousStartDate, $lt: startDate },
      status: { $nin: ['cancelled', 'refunded'] },
    }).lean();

    // Calculate stats
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Calculate Vendor Earnings vs Platform Earnings (Commission)
    let totalVendorEarnings = 0;
    let totalPlatformEarnings = 0;

    orders.forEach(order => {
      let orderVendorShare = 0;
      let orderPlatformShare = 0;

      if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
        order.vendorBreakdown.forEach(vb => {
          orderVendorShare += (vb.subtotal - vb.commission);
          orderPlatformShare += vb.commission;
        });
      } else {
        // Fallback: Assume flat 10% commission if no breakdown
        const commissionRate = 0.1;
        const commission = (order.total || 0) * commissionRate;
        orderPlatformShare += commission;
        orderVendorShare += ((order.total || 0) - commission);
      }

      totalVendorEarnings += orderVendorShare;
      // Total Revenue includes delivery, tax etc, but for simple split: Platform = Revenue - Vendor Share
      // detailed accuracy requires summing up non-vendor line items, but this is a good approximation
      totalPlatformEarnings += orderPlatformShare;
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
      { $match: { orderDate: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'refunded'] } } },
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
      { $match: { orderDate: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'refunded'] } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'year' ? '%Y-%m' : '%Y-%m-%d',
              date: '$orderDate',
            },
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Order status breakdown
    const statusBreakdown = await Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent orders
    const recentOrders = await Order.find({ orderDate: { $gte: startDate, $lte: endDate } })
      .sort({ orderDate: -1 })
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
      },
      summary: [
        {
          label: 'Total Revenue',
          value: totalRevenue,
          prevValue: prevRevenue,
          trend: prevRevenue === 0 ? 100 : ((totalRevenue - prevRevenue) / prevRevenue) * 100,
          suffix: '₹',
        },
        {
          label: 'Total Orders',
          value: totalOrders,
          prevValue: prevOrdersCount,
          trend: prevOrdersCount === 0 ? 100 : ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100,
        },
        {
          label: 'Total Customers',
          value: totalCustomers,
          prevValue: prevCustomers,
          trend: prevCustomers === 0 ? 100 : ((totalCustomers - prevCustomers) / prevCustomers) * 100,
        },
        {
          label: 'Vendor Earnings',
          value: totalVendorEarnings,
          prevValue: 0, // Simplified for now
          trend: 0,
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
      recentOrders: recentOrders.map((o) => ({
        id: o.orderCode || o._id,
        customer: {
          name: o.customerId?.name || o.customerSnapshot?.name || 'Guest',
          email: o.customerId?.email || o.customerSnapshot?.email || '',
          phone: o.customerId?.phone || o.customerSnapshot?.phone || '',
        },
        date: o.orderDate,
        status: o.status,
        total: o.total,
        items: o.items,
        shippingAddress: o.shippingAddress,
        tax: o.pricing?.tax || 0,
        shippingFee: o.pricing?.shipping || 0,
      })),
    };
  } catch (error) {
    throw error;
  }
};

