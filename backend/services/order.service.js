import Order from '../models/Order.model.js';
import Transaction from '../models/Transaction.model.js';
import Address from '../models/Address.model.js';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import Vendor from '../models/Vendor.model.js';
import mongoose from 'mongoose';
import { createWalletTransaction } from './wallet.service.js';
import { getVendorOrdersTransformed } from './vendorOrders.service.js';
import notificationService from './notification.service.js';

/**
 * Generate unique order code
 * @returns {String} Order code
 */
const generateOrderCode = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${timestamp}-${random}`;
};

/**
 * Generate unique transaction code
 * @returns {String} Transaction code
 */
const generateTransactionCode = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN-${timestamp}-${random}`;
};

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @param {String} orderData.customerId - Customer ID
 * @param {Array} orderData.items - Order items
 * @param {Number} orderData.total - Total amount
 * @param {String} orderData.paymentMethod - Payment method
 * @param {Object} orderData.shippingAddress - Shipping address data or address ID
 * @param {Number} orderData.subtotal - Subtotal
 * @param {Number} orderData.shipping - Shipping charges
 * @param {Number} orderData.tax - Tax amount
 * @param {Number} orderData.discount - Discount amount
 * @param {String} orderData.couponCode - Coupon code (optional)
 * @param {Object} io - Socket.io instance (optional, for real-time notifications)
 * @returns {Promise<Object>} Created order
 */
export const createOrder = async (orderData, io = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      customerId,
      items,
      total,
      paymentMethod,
      shippingAddress,
      subtotal,
      shipping = 0,
      tax = 0,
      discount = 0,
      couponCode = null,
    } = orderData;

    // Validate required fields
    if (!customerId || !items || !Array.isArray(items) || items.length === 0 || !total) {
      throw new Error('Missing required order fields');
    }

    // Generate unique order code
    let orderCode = generateOrderCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await Order.findOne({ orderCode }).session(session);
      if (!existing) break;
      orderCode = generateOrderCode();
      attempts++;
    }

    // Get customer info for snapshot
    const customer = await User.findById(customerId).select('name email phone').lean();
    const customerSnapshot = customer ? {
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
    } : {};

    // Handle shipping address
    let addressId = null;
    if (shippingAddress) {
      if (mongoose.Types.ObjectId.isValid(shippingAddress)) {
        // It's an address ID
        addressId = shippingAddress;
      } else {
        // It's address data, create new address
        const address = await Address.create(
          [
            {
              userId: customerId,
              name: shippingAddress.name || 'Default',
              address: shippingAddress.address,
              city: shippingAddress.city,
              state: shippingAddress.state,
              zipCode: shippingAddress.zipCode,
              country: shippingAddress.country || 'India',
              phone: shippingAddress.phone,
              isDefault: false,
              type: 'home',
            },
          ],
          { session }
        );
        addressId = address[0]._id;
      }
    }

    // Calculate pricing breakdown
    const calculatedSubtotal = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const calculatedShipping = shipping || 0;
    
    // Fetch products for tax calculation and vendor breakdown
    const productIds = items.map(item => item.productId || item.id);
    const products = await Product.find({ _id: { $in: productIds } })
      .populate('vendorId', 'name storeName commissionRate')
      .select('_id vendorId vendorName taxRate taxIncluded price')
      .lean();
    
    // Calculate tax from products if not provided or validate provided tax
    let calculatedTax = tax || 0;
    if (!tax || tax === 0) {
      // Calculate tax based on product taxRate
      calculatedTax = items.reduce((sum, item) => {
        const productId = item.productId || item.id;
        const product = products.find(p => p._id.toString() === productId.toString());
        if (!product) return sum;
        
        const itemSubtotal = (item.price || 0) * (item.quantity || 1);
        const itemTaxRate = product.taxRate || 0;
        const itemTax = product.taxIncluded ? 0 : (itemSubtotal * itemTaxRate) / 100;
        return sum + itemTax;
      }, 0);
    }
    
    const calculatedDiscount = discount || 0;
    const calculatedTotal = total || (calculatedSubtotal + calculatedTax + calculatedShipping - calculatedDiscount);

    // Calculate vendor breakdown
    const vendorBreakdownMap = {};

    // Group items by vendor and calculate vendor totals
    items.forEach((item) => {
      const productId = item.productId || item.id;
      const product = products.find(p => p._id.toString() === productId.toString());
      if (!product || !product.vendorId) return;

      const vendorId = product.vendorId._id || product.vendorId;
      const vendorIdStr = vendorId.toString();
      
      if (!vendorBreakdownMap[vendorIdStr]) {
        const vendor = product.vendorId;
        vendorBreakdownMap[vendorIdStr] = {
          vendorId: vendorId,
          vendorName: product.vendorName || vendor.name || vendor.storeName || 'Unknown Vendor',
          subtotal: 0,
          shipping: 0,
          tax: 0,
          discount: 0,
          commission: 0,
        };
      }

      const itemTotal = item.price * item.quantity;
      vendorBreakdownMap[vendorIdStr].subtotal += itemTotal;
    });

    // Calculate shipping, tax, discount per vendor (proportional to subtotal)
    const totalSubtotal = Object.values(vendorBreakdownMap).reduce((sum, vb) => sum + vb.subtotal, 0);
    const vendorBreakdown = Object.values(vendorBreakdownMap).map((vb) => {
      const ratio = totalSubtotal > 0 ? vb.subtotal / totalSubtotal : 0;
      vb.shipping = calculatedShipping * ratio;
      vb.tax = calculatedTax * ratio;
      vb.discount = calculatedDiscount * ratio;
      
      // Calculate commission (default 10% if not set)
      const vendor = products.find(p => {
        const pid = p.vendorId?._id || p.vendorId;
        return pid && pid.toString() === vb.vendorId.toString();
      });
      const commissionRate = vendor?.vendorId?.commissionRate || 0.1;
      vb.commission = vb.subtotal * commissionRate;
      
      return vb;
    });

    // Create order with enhanced fields
    const orderData = {
      orderCode,
      customerId,
      items: items.map((item) => ({
        productId: item.productId || item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
      })),
      total: calculatedTotal,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' || paymentMethod === 'cash' ? 'pending' : 'pending',
      status: 'pending',
      shippingAddress: addressId,
      pricing: {
        subtotal: calculatedSubtotal,
        tax: calculatedTax,
        discount: calculatedDiscount,
        shipping: calculatedShipping,
        total: calculatedTotal,
        couponCode: couponCode || null,
      },
      customerSnapshot,
      vendorBreakdown,
      statusHistory: [
        {
          status: 'pending',
          changedByRole: 'user',
          timestamp: new Date(),
          note: 'Order placed',
        },
      ],
    };

    const order = await Order.create([orderData], { session });

    // Create notifications for user and vendors
    try {
      const orderDoc = order[0];
      const notifications = [];

      // Notification for user
      notifications.push({
        recipientId: customerId,
        recipientType: 'user',
        type: 'order_placed',
        title: 'Order Placed Successfully',
        message: `Your order #${orderCode} has been placed successfully. Total: ₹${total.toFixed(2)}`,
        orderId: orderDoc._id,
        actionUrl: `/app/orders/${orderDoc._id}`,
      });

      // Notifications for vendors (one per vendor in the order)
      const vendorIds = new Set();
      items.forEach((item) => {
        const product = item.productId;
        if (product && product.vendorId) {
          const vendorId = product.vendorId._id || product.vendorId;
          if (!vendorIds.has(vendorId.toString())) {
            vendorIds.add(vendorId.toString());
            notifications.push({
              recipientId: vendorId,
              recipientType: 'vendor',
              type: 'new_order',
              title: 'New Order Received',
              message: `You have received a new order #${orderCode} from ${customerSnapshot.name || 'Customer'}`,
              orderId: orderDoc._id,
              actionUrl: `/vendor/orders/${orderDoc._id}`,
            });
          }
        }
      });

      // Create notifications in bulk
      if (notifications.length > 0) {
        await notificationService.createBulkNotifications(notifications, io);
      }
    } catch (notifError) {
      // Log error but don't fail order creation
      console.error('Error creating notifications:', notifError);
    }

    await session.commitTransaction();
    return order[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Update order with payment details
 * @param {String} orderId - Order ID
 * @param {Object} paymentData - Payment data
 * @param {String} paymentData.razorpayOrderId - Razorpay order ID
 * @param {String} paymentData.razorpayPaymentId - Razorpay payment ID
 * @param {String} paymentData.razorpaySignature - Payment signature
 * @param {String} paymentData.status - Payment status ('completed' or 'failed')
 * @param {Object} io - Socket.io instance (optional, for real-time notifications)
 * @returns {Promise<Object>} Updated order
 */
export const updateOrderPayment = async (orderId, paymentData, io = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, status } = paymentData;

    // Find order
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    // Update order payment details
    const updateData = {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentStatus: status === 'completed' ? 'completed' : 'failed',
      $push: {
        statusHistory: {
          status: status === 'completed' ? 'processing' : order.status,
          changedByRole: 'system',
          timestamp: new Date(),
          note: status === 'completed' ? 'Payment completed, order processing' : 'Payment failed',
        },
      },
    };

    // If payment completed, update order status
    if (status === 'completed') {
      updateData.status = 'processing';
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
      session,
    }).populate('shippingAddress');

    // Create transaction record
    if (status === 'completed') {
      const transactionCode = generateTransactionCode();
      await Transaction.create(
        [
          {
            transactionCode,
            orderId: order._id,
            customerId: order.customerId,
            amount: order.total,
            type: 'payment',
            status: 'completed',
            method: order.paymentMethod,
            paymentGateway: 'razorpay',
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    return updatedOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get order by ID
 * @param {String} orderId - Order ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Promise<Object>} Order details
 */
export const getOrderById = async (orderId, userId = null) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { orderCode: orderId };

    if (userId) {
      query.customerId = userId;
    }

    const order = await Order.findOne(query)
      .populate('customerId', 'name email phone')
      .populate('shippingAddress')
      .populate('items.productId', 'name images slug vendorId vendorName')
      .populate('vendorBreakdown.vendorId', 'name storeName')
      .lean();

    if (!order) {
      throw new Error('Order not found');
    }

    // Transform vendorBreakdown to vendorItems for frontend compatibility
    if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
      order.vendorItems = order.vendorBreakdown.map((vb) => {
        // Get items for this vendor
        const vendorItems = order.items.filter((item) => {
          const productVendorId = item.productId?.vendorId?._id || item.productId?.vendorId || item.productId?.vendorId;
          const vendorIdStr = (vb.vendorId?._id || vb.vendorId)?.toString();
          return vendorIdStr && productVendorId && productVendorId.toString() === vendorIdStr;
        });

        return {
          vendorId: vb.vendorId?._id || vb.vendorId,
          vendorName: vb.vendorName || vb.vendorId?.name || vb.vendorId?.storeName || 'Unknown Vendor',
          items: vendorItems.map((item) => ({
            id: item.productId?._id || item.productId || item._id,
            productId: item.productId?._id || item.productId,
            name: item.name || item.productId?.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image || item.productId?.images?.[0],
          })),
          subtotal: vb.subtotal || 0,
          shipping: vb.shipping || 0,
          tax: vb.tax || 0,
          discount: vb.discount || 0,
          commission: vb.commission || 0,
        };
      });
    }

    return order;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all orders for a user
 * @param {String} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of orders
 */
export const getUserOrders = async (userId, filters = {}) => {
  try {
    const { status, paymentStatus, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query = { customerId: userId };

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const orders = await Order.find(query)
      .populate('shippingAddress')
      .populate('items.productId', 'name images slug vendorId vendorName')
      .populate('vendorBreakdown.vendorId', 'name storeName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform orders to include vendorItems from vendorBreakdown
    const transformedOrders = orders.map((order) => {
      const orderObj = { ...order };
      
      // Transform vendorBreakdown to vendorItems for frontend compatibility
      if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
        orderObj.vendorItems = order.vendorBreakdown.map((vb) => {
          // Get items for this vendor
          const vendorItems = order.items.filter((item) => {
            const productVendorId = item.productId?.vendorId?._id || item.productId?.vendorId || item.productId?.vendorId;
            const vendorIdStr = (vb.vendorId?._id || vb.vendorId)?.toString();
            return vendorIdStr && productVendorId && productVendorId.toString() === vendorIdStr;
          });

          return {
            vendorId: vb.vendorId?._id || vb.vendorId,
            vendorName: vb.vendorName || vb.vendorId?.name || vb.vendorId?.storeName || 'Unknown Vendor',
            items: vendorItems.map((item) => ({
              id: item.productId?._id || item.productId || item._id,
              productId: item.productId?._id || item.productId,
              name: item.name || item.productId?.name,
              quantity: item.quantity,
              price: item.price,
              image: item.image || item.productId?.images?.[0],
            })),
            subtotal: vb.subtotal || 0,
            shipping: vb.shipping || 0,
            tax: vb.tax || 0,
            discount: vb.discount || 0,
            commission: vb.commission || 0,
          };
        });
      }

      return orderObj;
    });

    const total = await Order.countDocuments(query);

    return {
      orders: transformedOrders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Cancel an order
 * @param {String} orderId - Order ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Promise<Object>} Cancelled order
 */
export const cancelOrder = async (orderId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { orderCode: orderId };

    query.customerId = userId;

    const order = await Order.findOne(query).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    // Only allow cancellation if order is pending or processing
    if (order.status !== 'pending' && order.status !== 'processing') {
      throw new Error('Order cannot be cancelled at this stage');
    }

    // Prepare cancellation data
    const cancellationData = {
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancelledByRole: 'user',
      refundStatus: order.paymentStatus === 'completed' ? 'pending' : undefined,
      refundAmount: order.paymentStatus === 'completed' ? order.total : undefined,
    };

    // Update order status with cancellation info and status history
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        status: 'cancelled',
        cancellation: cancellationData,
        $push: {
          statusHistory: {
            status: 'cancelled',
            changedBy: userId,
            changedByRole: 'user',
            timestamp: new Date(),
            note: 'Order cancelled by user',
          },
        },
      },
      { new: true, session }
    );

    // If payment was completed, create refund transaction
    if (order.paymentStatus === 'completed') {
      const transactionCode = generateTransactionCode();
      await Transaction.create(
        [
          {
            transactionCode,
            orderId: order._id,
            customerId: order.customerId,
            amount: order.total,
            type: 'refund',
            status: 'pending', // Refund will be processed separately
            method: order.paymentMethod,
            paymentGateway: order.razorpayPaymentId ? 'razorpay' : 'manual',
            razorpayOrderId: order.razorpayOrderId,
            razorpayPaymentId: order.razorpayPaymentId,
          },
        ],
        { session }
      );

      // Create wallet transaction for refund (credit)
      if (order.paymentMethod === 'wallet') {
        try {
          await createWalletTransaction(
            order.customerId.toString(),
            'credit',
            order.total,
            `Order Refund - ${order.orderCode}`,
            order._id.toString(),
            'refund'
          );
        } catch (walletError) {
          console.error('Error creating wallet refund transaction:', walletError);
          // Don't fail the order cancellation if wallet transaction fails
        }
      }
    }

    await session.commitTransaction();
    return updatedOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Validate status transition based on role
 */
export const validateStatusTransition = (currentStatus, newStatus, role) => {
  const validTransitions = {
    user: {
      pending: ['cancelled'],
      processing: ['cancelled'],
    },
    vendor: {
      processing: ['ready_to_ship', 'on_hold', 'dispatched'],
      ready_to_ship: ['dispatched', 'shipped_seller'],
      dispatched: ['shipped_seller'],
      on_hold: ['processing', 'ready_to_ship'],
    },
    admin: { '*': '*' },
  };

  if (role === 'admin') return true;
  const roleTransitions = validTransitions[role];
  if (!roleTransitions) return false;
  const allowedStatuses = roleTransitions[currentStatus];
  if (!allowedStatuses) return false;
  return allowedStatuses.includes(newStatus);
};

/**
 * Update order status with validation and history tracking
 * @param {String} orderId - Order ID
 * @param {String} newStatus - New status
 * @param {String} changedBy - User/Vendor/Admin ID who changed the status
 * @param {String} changedByRole - Role of who changed the status
 * @param {String} note - Optional note
 * @param {Object} io - Socket.io instance (optional, for real-time notifications)
 * @returns {Promise<Object>} Updated order
 */
export const updateOrderStatus = async (orderId, newStatus, changedBy, changedByRole, note = '', io = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { orderCode: orderId };

    const order = await Order.findOne(query).session(session);
    if (!order) throw new Error('Order not found');

    if (!validateStatusTransition(order.status, newStatus, changedByRole)) {
      throw new Error(`Invalid status transition from ${order.status} to ${newStatus} for role ${changedByRole}`);
    }

    const updateData = {
      status: newStatus,
      $push: {
        statusHistory: {
          status: newStatus,
          changedBy,
          changedByRole,
          timestamp: new Date(),
          note: note || `Status changed to ${newStatus} by ${changedByRole}`,
        },
      },
    };

    if (newStatus === 'cancelled' && !order.cancellation) {
      updateData.cancellation = {
        cancelledAt: new Date(),
        cancelledBy: changedBy,
        cancelledByRole,
        reason: note || 'Order cancelled',
        refundStatus: order.paymentStatus === 'completed' ? 'pending' : undefined,
        refundAmount: order.paymentStatus === 'completed' ? order.total : undefined,
      };
    }

    if (newStatus === 'delivered' && !order.tracking?.deliveredAt) {
      updateData.tracking = { ...order.tracking, deliveredAt: new Date() };
    }

    const updatedOrder = await Order.findByIdAndUpdate(order._id, updateData, {
      new: true,
      session,
    })
      .populate('shippingAddress')
      .populate('items.productId', 'name images slug')
      .populate('vendorBreakdown.vendorId', 'name storeName');

    // Create notifications for status change
    try {
      const notifications = [];
      const statusMessages = {
        processing: 'Your order is being processed',
        ready_to_ship: 'Your order is ready to ship',
        dispatched: 'Your order has been dispatched',
        shipped_seller: 'Your order has been shipped',
        shipped: 'Your order has been shipped',
        delivered: 'Your order has been delivered',
        cancelled: 'Your order has been cancelled',
        on_hold: 'Your order is on hold',
      };

      const statusTitle = {
        processing: 'Order Processing',
        ready_to_ship: 'Order Ready to Ship',
        dispatched: 'Order Dispatched',
        shipped_seller: 'Order Shipped',
        shipped: 'Order Shipped',
        delivered: 'Order Delivered',
        cancelled: 'Order Cancelled',
        on_hold: 'Order On Hold',
      };

      const notificationType = {
        processing: 'order_confirmed',
        ready_to_ship: 'order_status_change',
        dispatched: 'order_status_change',
        shipped_seller: 'order_shipped',
        shipped: 'order_shipped',
        delivered: 'order_delivered',
        cancelled: 'order_cancelled',
        on_hold: 'order_status_change',
      };

      // Notification for user
      notifications.push({
        recipientId: order.customerId,
        recipientType: 'user',
        type: notificationType[newStatus] || 'order_status_change',
        title: statusTitle[newStatus] || 'Order Status Updated',
        message: `${statusMessages[newStatus] || `Order status changed to ${newStatus}`} - Order #${order.orderCode}`,
        orderId: order._id,
        actionUrl: `/app/orders/${order._id}`,
      });

      // Notifications for vendors
      if (order.vendorBreakdown && order.vendorBreakdown.length > 0) {
        order.vendorBreakdown.forEach((vb) => {
          const vendorId = vb.vendorId?._id || vb.vendorId;
          if (vendorId) {
            notifications.push({
              recipientId: vendorId,
              recipientType: 'vendor',
              type: 'order_status_change',
              title: 'Order Status Updated',
              message: `Order #${order.orderCode} status changed to ${newStatus}`,
              orderId: order._id,
              actionUrl: `/vendor/orders/${order._id}`,
            });
          }
        });
      }

      // Notification for admin (optional - can be added if needed)
      // You can add admin notifications here if you want to notify admins about all status changes

      // Create notifications in bulk
      if (notifications.length > 0) {
        await notificationService.createBulkNotifications(notifications, io);
      }
    } catch (notifError) {
      console.error('Error creating status change notifications:', notifError);
    }

    await session.commitTransaction();
    return updatedOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get vendor orders with filtering
 */
export const getVendorOrders = async (vendorId, filters = {}) => {
  try {
    return await getVendorOrdersTransformed(vendorId, filters);
  } catch (error) {
    throw error;
  }
};

/**
 * Get all orders for admin with advanced filtering
 */
export const getAdminOrders = async (filters = {}) => {
  try {
    const { status, paymentStatus, customerId, vendorId, search, startDate, endDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;
    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) query.customerId = customerId;

    if (vendorId) {
      const vendorProducts = await Product.find({ vendorId, isActive: true }).select('_id').lean();
      const vendorProductIds = vendorProducts.map((p) => p._id);
      if (vendorProductIds.length > 0) {
        query['items.productId'] = { $in: vendorProductIds };
      } else {
        return { orders: [], total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 };
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const orderCodeMatches = await Order.find({ orderCode: searchRegex }).select('_id').lean();
      const customerMatches = await Order.find({
        $or: [{ 'customerSnapshot.name': searchRegex }, { 'customerSnapshot.email': searchRegex }],
      }).select('_id').lean();
      const searchIds = [...new Set([...orderCodeMatches.map(o => o._id), ...customerMatches.map(o => o._id)])];
      if (searchIds.length > 0) {
        query._id = { $in: searchIds };
      } else {
        return { orders: [], total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 };
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('customerId', 'name email phone')
      .populate('shippingAddress')
      .populate('items.productId', 'name images slug vendorId vendorName')
      .populate('vendorBreakdown.vendorId', 'name storeName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Order.countDocuments(query);
    return { orders, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) };
  } catch (error) {
    throw error;
  }
};

