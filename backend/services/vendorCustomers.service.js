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

      const customerId = order.customerId || order.userId || `guest-${order.id}`;
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
      customerMap[customerId].totalSpent += vendorItem.vendorEarnings || 0;

      const orderDate = new Date(order.date || order.createdAt || order.orderDate);
      if (
        !customerMap[customerId].lastOrderDate ||
        orderDate > new Date(customerMap[customerId].lastOrderDate)
      ) {
        customerMap[customerId].lastOrderDate = order.date || order.createdAt || order.orderDate;
      }
    });

    // Convert to array
    let customers = Object.values(customerMap);

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower)
      );
    }

    // Calculate aggregate stats
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const averageOrderValue =
      totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    const stats = {
      totalCustomers,
      totalRevenue,
      averageOrderValue,
    };

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

