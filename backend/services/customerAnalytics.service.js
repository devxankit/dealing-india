import User from '../models/User.model.js';
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
}

/**
 * Get customer analytics/statistics
 * @param {String} customerId - Customer ID (optional, if not provided returns overall stats)
 * @returns {Promise<Object>} Analytics data
 */
export const getCustomerAnalytics = async (customerId = null) => {
  try {
    if (customerId) {
      // Get analytics for specific customer
      return await getSingleCustomerAnalytics(customerId);
    } else {
      // Get overall analytics for all customers
      return await getAllCustomersAnalytics();
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get analytics for a single customer
 * @param {String} customerId - Customer ID
 * @returns {Promise<Object>} Customer analytics
 */
const getSingleCustomerAnalytics = async (customerId) => {
  try {
    const customer = await User.findById(customerId).lean();
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get customer orders
    let orders = [];
    if (Order) {
      orders = await Order.find({
        customerId: customerId,
        status: { $ne: 'cancelled' }
      }).lean();
    }

    // Calculate statistics
    const totalOrders = orders.length;
    let totalSpend = 0;
    let avgOrderValue = 0;
    let lastOrderDate = null;

    orders.forEach((order) => {
      totalSpend += (order.pricing?.total || order.total || 0);
      
      const orderDate = order.orderDate || order.createdAt;
      if (!lastOrderDate || new Date(orderDate) > new Date(lastOrderDate)) {
        lastOrderDate = orderDate;
      }
    });

    if (totalOrders > 0) {
      avgOrderValue = totalSpend / totalOrders;
    }

    return {
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
        joinedDate: customer.createdAt
      },
      stats: {
        totalOrders,
        totalSpend,
        avgOrderValue,
        lastOrderDate,
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get analytics for all customers
 * @returns {Promise<Object>} Overall analytics
 */
const getAllCustomersAnalytics = async () => {
  try {
    const customers = await User.find({ role: 'user' }).lean();

    // Get all orders
    let orders = [];
    if (Order) {
      orders = await Order.find({ status: { $ne: 'cancelled' } }).lean();
    }

    // Calculate overall stats
    let totalCustomers = customers.length;
    let totalOrders = orders.length;
    let totalRevenue = 0;

    const customerStats = customers.map((customer) => {
      // Filter orders for this customer
      const userOrders = orders.filter((order) => 
        order.customerId?.toString() === customer._id.toString()
      );

      let userSpend = 0;
      userOrders.forEach((order) => {
        userSpend += (order.pricing?.total || order.total || 0);
      });

      totalRevenue += userSpend;

      return {
        customer: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          status: customer.status,
        },
        stats: {
          totalOrders: userOrders.length,
          totalSpend: userSpend,
          avgOrderValue: userOrders.length > 0 ? userSpend / userOrders.length : 0,
        },
      };
    });

    // Sort by total spend (descending)
    customerStats.sort((a, b) => b.stats.totalSpend - a.stats.totalSpend);

    return {
      overall: {
        totalCustomers,
        totalOrders,
        totalRevenue,
      },
      customers: customerStats,
    };
  } catch (error) {
    throw error;
  }
};
