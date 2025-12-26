import Order from '../models/Order.model.js';
import Vendor from '../models/Vendor.model.js';
import mongoose from 'mongoose';

/**
 * Transform a single order to include vendorItems structure
 * Groups items by vendorId and calculates vendor-specific totals
 * @param {Object} order - Order document
 * @param {String} vendorId - Vendor ID to filter for
 * @returns {Object|null} Transformed order with vendorItems, or null if no items for this vendor
 */
export const transformOrderWithVendorItems = async (order, vendorId) => {
  try {
    if (!order || !order.items || order.items.length === 0) {
      return null;
    }

    // Check if items.productId is already populated, if not populate it
    let populatedOrder = order;
    if (order.items && order.items[0] && order.items[0].productId && typeof order.items[0].productId === 'object' && !order.items[0].productId.vendorId) {
      // Need to populate
      populatedOrder = await Order.findById(order._id)
        .populate('items.productId', 'vendorId vendorName')
        .lean();
    } else if (order.items && order.items[0] && typeof order.items[0].productId === 'string') {
      // Need to populate
      populatedOrder = await Order.findById(order._id)
        .populate('items.productId', 'vendorId vendorName')
        .lean();
    }

    if (!populatedOrder) {
      return null;
    }

    // Group items by vendorId
    const vendorGroups = {};
    let hasVendorItems = false;

    populatedOrder.items.forEach((item) => {
      const product = item.productId;
      if (!product || !product.vendorId) {
        return;
      }

      const itemVendorId = product.vendorId.toString();
      
      // Only process items for the requested vendor
      if (itemVendorId !== vendorId.toString()) {
        return;
      }

      hasVendorItems = true;

      if (!vendorGroups[itemVendorId]) {
        vendorGroups[itemVendorId] = {
          vendorId: itemVendorId,
          vendorName: product.vendorName || 'Unknown Vendor',
          items: [],
          subtotal: 0,
          shipping: 0,
          tax: 0,
          discount: 0,
        };
      }

      const itemSubtotal = (item.price || 0) * (item.quantity || 1);
      vendorGroups[itemVendorId].items.push({
        id: item.productId?._id?.toString() || item.productId?.toString(),
        productId: item.productId?._id?.toString() || item.productId?.toString(),
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        image: item.image,
      });

      vendorGroups[itemVendorId].subtotal += itemSubtotal;
    });

    // If no items for this vendor, return null
    if (!hasVendorItems) {
      return null;
    }

    // Get vendor to calculate commission
    const vendor = await Vendor.findById(vendorId).lean();
    const commissionRate = vendor?.commissionRate || 0.1; // Default 10%

    // Calculate commission and earnings for each vendor group
    const vendorItems = Object.values(vendorGroups).map((group) => {
      const commission = group.subtotal * commissionRate;
      const vendorEarnings = group.subtotal - commission;

      return {
        ...group,
        commission,
        vendorEarnings,
      };
    });

    // Transform order to match frontend structure
    const transformedOrder = {
      id: order._id?.toString() || order.orderCode,
      _id: order._id?.toString(),
      orderCode: order.orderCode,
      userId: order.customerId?.toString() || order.customerId,
      customerId: order.customerId?.toString() || order.customerId,
      date: order.orderDate || order.createdAt,
      createdAt: order.createdAt,
      status: order.status,
      items: populatedOrder.items.map((item) => ({
        id: item.productId?._id?.toString() || item.productId?.toString(),
        productId: item.productId?._id?.toString() || item.productId?.toString(),
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        image: item.image,
      })),
      vendorItems,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      orderDate: order.orderDate,
    };

    return transformedOrder;
  } catch (error) {
    throw error;
  }
};

/**
 * Get vendor orders with vendorItems transformation
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { page, limit, status }
 * @returns {Promise<Object>} { orders, total, page, totalPages }
 */
export const getVendorOrdersTransformed = async (vendorId, filters = {}) => {
  try {
    const { page = 1, limit = 1000, status } = filters;

    // First, get all product IDs for this vendor
    const Product = (await import('../models/Product.model.js')).default;
    const vendorProducts = await Product.find({ vendorId, isActive: true })
      .select('_id')
      .lean();

    const vendorProductIds = vendorProducts.map((p) => p._id);

    if (vendorProductIds.length === 0) {
      return {
        orders: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
      };
    }

    // Build query to find orders containing vendor's products
    const query = {
      'items.productId': { $in: vendorProductIds },
    };

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get orders
    const orders = await Order.find(query)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'vendorId vendorName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Transform each order
    const transformedOrders = [];
    for (const order of orders) {
      const transformed = await transformOrderWithVendorItems(order, vendorId);
      if (transformed) {
        // Add customer info if available
        if (order.customerId) {
          transformed.customer = {
            name: order.customerId.name || 'Guest Customer',
            email: order.customerId.email || '',
            phone: order.customerId.phone || '',
          };
        }
        transformedOrders.push(transformed);
      }
    }

    // Get total count
    const total = await Order.countDocuments(query);

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      orders: transformedOrders,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get all vendor orders (no pagination limit for aggregation purposes)
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { status }
 * @returns {Promise<Array>} Array of transformed orders
 */
export const getAllVendorOrdersTransformed = async (vendorId, filters = {}) => {
  try {
    const { status } = filters;

    // Get all product IDs for this vendor
    const Product = (await import('../models/Product.model.js')).default;
    const vendorProducts = await Product.find({ vendorId, isActive: true })
      .select('_id')
      .lean();

    const vendorProductIds = vendorProducts.map((p) => p._id);

    if (vendorProductIds.length === 0) {
      return [];
    }

    // Build query
    const query = {
      'items.productId': { $in: vendorProductIds },
    };

    if (status) {
      query.status = status;
    }

    // Get all orders (no pagination)
    const orders = await Order.find(query)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'vendorId vendorName')
      .sort({ createdAt: -1 })
      .lean();

    // Transform each order
    const transformedOrders = [];
    for (const order of orders) {
      const transformed = await transformOrderWithVendorItems(order, vendorId);
      if (transformed) {
        // Add customer info if available
        if (order.customerId) {
          transformed.customer = {
            name: order.customerId.name || 'Guest Customer',
            email: order.customerId.email || '',
            phone: order.customerId.phone || '',
          };
        }
        transformedOrders.push(transformed);
      }
    }

    return transformedOrders;
  } catch (error) {
    throw error;
  }
};

