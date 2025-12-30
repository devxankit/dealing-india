import Product from '../models/Product.model.js';
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

    return {
      metrics,
      earnings,
    };
  } catch (error) {
    throw error;
  }
};

