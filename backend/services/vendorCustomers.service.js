import User from '../models/User.model.js';
import { getAllVendorOrdersTransformed } from './vendorOrders.service.js';

/**
 * Get vendor customers with aggregated statistics
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { search, page, limit }
 * @returns {Promise<Object>} { customers, stats, pagination }
 */
export const getVendorCustomers = async (vendorId, filters = {}) => {
  try {
    const { search = '', page = 1, limit = 10 } = filters;

    // Get all vendor orders
    const orders = await getAllVendorOrdersTransformed(vendorId);

    console.log(`[getVendorCustomers] Found ${orders.length} orders for vendor ${vendorId}`);

    // Group orders by customerId
    const customerMap = {};

    orders.forEach((order) => {
      // Find vendor-specific items in this order
      const vendorItem = order.vendorItems?.find(
        (vi) => vi.vendorId?.toString() === vendorId.toString()
      );

      if (!vendorItem) {
        return;
      }

      // Convert customerId to string for consistent map key
      let customerId = null;
      if (order.customerId) {
        customerId = order.customerId.toString();
      } else if (order.userId) {
        customerId = order.userId.toString();
      } else {
        customerId = `guest-${order.id || order._id || order.orderCode}`;
      }

      // Get customer info from order.customer (set by getAllVendorOrdersTransformed)
      const customerName = order.customer?.name || 'Guest Customer';
      const customerEmail = order.customer?.email || '';
      const customerPhone = order.customer?.phone || '';

      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          id: customerId,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          orders: 0,
          totalSpent: 0,
          lastOrderDate: null,
        };
      }

      customerMap[customerId].orders += 1;
      customerMap[customerId].totalSpent += (vendorItem.vendorEarnings || 0);

      const orderDate = new Date(order.date || order.createdAt || order.orderDate);
      if (
        !customerMap[customerId].lastOrderDate ||
        orderDate > new Date(customerMap[customerId].lastOrderDate)
      ) {
        customerMap[customerId].lastOrderDate = order.date || order.createdAt || order.orderDate;
      }
    });

    console.log(`[getVendorCustomers] Grouped into ${Object.keys(customerMap).length} unique customers`);

    // Convert to array
    let allCustomers = Object.values(customerMap);

    // Calculate aggregate stats BEFORE filtering (for accurate stats)
    const totalCustomers = allCustomers.length;
    const totalRevenue = allCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
    const averageOrderValue =
      totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    const stats = {
      totalCustomers,
      totalRevenue,
      averageOrderValue,
    };

    // Apply search filter AFTER calculating stats
    let customers = allCustomers;
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          (c.email && c.email.toLowerCase().includes(searchLower))
      );
    }

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedCustomers = customers.slice(skip, skip + parseInt(limit));
    const total = customers.length;
    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      customers: paginatedCustomers,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: totalPages,
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get vendor customer detail by customer ID with orders
 * @param {String} vendorId - Vendor ID
 * @param {String} customerId - Customer ID
 * @returns {Promise<Object>} { customer, orders }
 */
export const getVendorCustomerById = async (vendorId, customerId) => {
  try {
    // Get all vendor orders
    const orders = await getAllVendorOrdersTransformed(vendorId);

    // Filter orders for this customer
    const customerOrders = orders.filter((order) => {
      // Find vendor-specific items in this order
      const vendorItem = order.vendorItems?.find(
        (vi) => vi.vendorId?.toString() === vendorId.toString()
      );

      if (!vendorItem) {
        return false;
      }

      // Convert customerId to string for comparison
      let orderCustomerId = null;
      if (order.customerId) {
        orderCustomerId = order.customerId.toString();
      } else if (order.userId) {
        orderCustomerId = order.userId.toString();
      } else {
        orderCustomerId = `guest-${order.id || order._id || order.orderCode}`;
      }

      return orderCustomerId === customerId.toString();
    });

    if (customerOrders.length === 0) {
      return null;
    }

    // Extract customer info from first order
    const firstOrder = customerOrders[0];
    const customerData = {
      id: customerId,
      name: firstOrder.customer?.name || 'Guest Customer',
      email: firstOrder.customer?.email || '',
      phone: firstOrder.customer?.phone || '',
      orders: customerOrders.length,
      totalSpent: customerOrders.reduce((sum, order) => {
        const vendorItem = order.vendorItems?.find(
          (vi) => vi.vendorId?.toString() === vendorId.toString()
        );
        return sum + (vendorItem?.vendorEarnings || 0);
      }, 0),
      lastOrderDate: customerOrders[0].date || customerOrders[0].createdAt || customerOrders[0].orderDate,
    };

    return {
      customer: customerData,
      orders: customerOrders,
    };
  } catch (error) {
    throw error;
  }
};

