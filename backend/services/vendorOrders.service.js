import Order from '../models/Order.model.js';
import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
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
    // Also preserve customerId if already populated
    let populatedOrder = order;
    const needsProductPopulation = order.items && order.items[0] && (
      (typeof order.items[0].productId === 'string') ||
      (typeof order.items[0].productId === 'object' && !order.items[0].productId.vendorId)
    );

    if (needsProductPopulation) {
      // Need to populate products, but preserve customerId if already populated
      const populateOptions = ['items.productId vendorId vendorName'];
      if (!order.customerId || typeof order.customerId === 'string' || order.customerId._id) {
        populateOptions.push('customerId name email phone');
      }
      populatedOrder = await Order.findById(order._id)
        .populate('items.productId', 'vendorId vendorName')
        .populate('customerId', 'name email phone')
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
        variant: item.variant,
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
      // Find matching breakdown entry from original order
      const breakdown = order.vendorBreakdown?.find(vb =>
        (vb.vendorId?._id || vb.vendorId)?.toString() === group.vendorId.toString()
      );

      if (breakdown) {
        group.shipping = breakdown.shipping || 0;
        group.tax = breakdown.tax || 0;
        group.discount = breakdown.discount || 0;
        group.commission = breakdown.commission || 0;
      } else {
        // Fallback if no breakdown found
        group.commission = group.subtotal * commissionRate;
      }

      const vendorEarnings = group.subtotal - group.discount - group.commission;

      return {
        ...group,
        vendorEarnings,
      };
    });

    // Extract customer info from populated order
    // Check both order and populatedOrder for customer info
    let customerInfo = null;
    const customerSource = populatedOrder.customerId || order.customerId;

    if (customerSource) {
      // Check if customerId is populated (object with name property) or just an ID
      if (typeof customerSource === 'object' && customerSource !== null) {
        // Check if it has name property (populated) or is just an ObjectId
        if (customerSource.name !== undefined || customerSource.email !== undefined) {
          // It's a populated object with customer data
          customerInfo = {
            name: customerSource.name || 'Guest Customer',
            email: customerSource.email || '',
            phone: customerSource.phone || '',
          };
        }
      }
    }

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
        variant: item.variant,
      })),
      vendorItems,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      orderDate: order.orderDate,
      // Add customer information
      customer: customerInfo,
      customerSnapshot: customerInfo, // For backward compatibility
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
    const { page = 1, limit = 1000, status, paymentMethod } = filters;

    // Convert vendorId to ObjectId if needed
    // Handle both string and ObjectId formats
    let vendorIdQuery;
    if (typeof vendorId === 'string' && mongoose.Types.ObjectId.isValid(vendorId)) {
      vendorIdQuery = new mongoose.Types.ObjectId(vendorId);
    } else if (vendorId instanceof mongoose.Types.ObjectId) {
      vendorIdQuery = vendorId;
    } else {
      vendorIdQuery = vendorId;
    }

    // First, get all product IDs for this vendor
    // Remove isActive check to show orders for all products (including inactive ones)
    const vendorProducts = await Product.find({ vendorId: vendorIdQuery })
      .select('_id')
      .lean();

    console.log('Vendor ID Query:', vendorIdQuery);
    console.log('Found Vendor Products Count:', vendorProducts.length);

    // Convert product IDs to ObjectIds for proper query matching
    const vendorProductIds = vendorProducts.map((p) => {
      const productId = p._id;
      if (typeof productId === 'string' && mongoose.Types.ObjectId.isValid(productId)) {
        return new mongoose.Types.ObjectId(productId);
      }
      return productId;
    });

    // Build query to find orders containing vendor's products
    const query = {
      $or: [
        { 'vendorBreakdown.vendorId': vendorIdQuery }
      ]
    };

    if (vendorProductIds.length > 0) {
      query.$or.push({ 'items.productId': { $in: vendorProductIds } });
    }

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      if (paymentMethod === 'cod') {
        query.paymentMethod = { $in: ['cod', 'cash'] };
      } else if (paymentMethod === 'prepaid') {
        query.paymentMethod = { $nin: ['cod', 'cash'] };
      } else {
        query.paymentMethod = paymentMethod;
      }
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

    console.log('Query used for orders:', JSON.stringify(query));
    console.log('Orders found in database:', orders.length);

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
    const { status, paymentMethod } = filters;

    // Convert vendorId to ObjectId if needed
    let vendorIdQuery;
    if (typeof vendorId === 'string' && mongoose.Types.ObjectId.isValid(vendorId)) {
      vendorIdQuery = new mongoose.Types.ObjectId(vendorId);
    } else if (vendorId instanceof mongoose.Types.ObjectId) {
      vendorIdQuery = vendorId;
    } else {
      vendorIdQuery = vendorId;
    }

    // First, get all product IDs for this vendor
    const vendorProducts = await Product.find({ vendorId: vendorIdQuery })
      .select('_id')
      .lean();

    const vendorProductIds = vendorProducts.map((p) => p._id);

    // Build query to find orders containing vendor's products or in breakdown
    const query = {
      $or: [
        { 'vendorBreakdown.vendorId': vendorIdQuery }
      ]
    };

    if (vendorProductIds.length > 0) {
      query.$or.push({ 'items.productId': { $in: vendorProductIds } });
    }

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      if (paymentMethod === 'cod') {
        query.paymentMethod = { $in: ['cod', 'cash'] };
      } else if (paymentMethod === 'prepaid') {
        query.paymentMethod = { $nin: ['cod', 'cash'] };
      } else {
        query.paymentMethod = paymentMethod;
      }
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

