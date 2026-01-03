import Order from '../models/Order.model.js';
import Transaction from '../models/Transaction.model.js';
import Address from '../models/Address.model.js';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import Vendor from '../models/Vendor.model.js';
import mongoose from 'mongoose';
import { createWalletTransaction } from './wallet.service.js';

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
 * @returns {Promise<Object>} Created order
 */
export const createOrder = async (orderData) => {
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
    const calculatedTax = tax || 0;
    const calculatedDiscount = discount || 0;
    const calculatedTotal = total || (calculatedSubtotal + calculatedTax + calculatedShipping - calculatedDiscount);

    // Calculate vendor breakdown
    const vendorBreakdownMap = {};
    const productIds = items.map(item => item.productId || item.id);
    const products = await Product.find({ _id: { $in: productIds } })
      .populate('vendorId', 'name storeName commissionRate')
      .select('vendorId vendorName')
      .lean();

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
 * @returns {Promise<Object>} Updated order
 */
export const updateOrderPayment = async (orderId, paymentData) => {
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
      .populate('items.productId', 'name images slug')
      .populate('vendorBreakdown.vendorId', 'name storeName')
      .lean();

    if (!order) {
      throw new Error('Order not found');
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
      .populate('items.productId', 'name images slug')
      .populate('vendorBreakdown.vendorId', 'name storeName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    return {
      orders,
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

