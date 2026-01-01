import {
  createOrder as createOrderService,
  updateOrderPayment,
  getOrderById,
  getUserOrders,
  cancelOrder as cancelOrderService,
} from '../../services/order.service.js';
import razorpayService from '../../services/razorpay.service.js';

/**
 * Create a new order and initialize Razorpay payment (if online payment)
 * POST /api/user/orders/create
 */
export const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id; // From auth middleware
    const {
      items,
      total,
      paymentMethod,
      shippingAddress,
      subtotal,
      shipping = 0,
      tax = 0,
      discount = 0,
      couponCode = null,
    } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required',
      });
    }

    if (!total || total <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid total amount is required',
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required',
      });
    }

    // Check if payment method requires Razorpay
    const onlinePaymentMethods = ['creditCard', 'debitCard', 'upi', 'wallet'];
    const requiresRazorpay = onlinePaymentMethods.includes(paymentMethod);

    // Create order in database
    const order = await createOrderService({
      customerId: userId,
      items,
      total,
      paymentMethod,
      shippingAddress,
      subtotal,
      shipping,
      tax,
      discount,
      couponCode,
    });

    let razorpayOrder = null;
    let razorpayKeyId = null;

    // If online payment, create Razorpay order
    if (requiresRazorpay) {
      try {
        razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        if (!razorpayKeyId) {
          throw new Error('Razorpay key ID not configured');
        }

        razorpayOrder = await razorpayService.createOrder(
          total,
          'INR',
          order.orderCode,
          {
            orderId: order._id.toString(),
            customerId: userId,
            couponCode: couponCode || '',
          }
        );

        // Update order with Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();
      } catch (razorpayError) {
        console.error('Razorpay order creation failed:', razorpayError);
        
        // Provide more specific error message
        let errorMessage = 'Failed to initialize payment gateway. Please try again.';
        if (razorpayError.message.includes('authentication failed')) {
          errorMessage = 'Payment gateway configuration error. Please contact support.';
        } else if (razorpayError.message.includes('not configured')) {
          errorMessage = 'Payment gateway is not configured. Please contact support.';
        } else {
          errorMessage = razorpayError.message || errorMessage;
        }
        
        // Order is created but Razorpay failed - user can retry payment
        return res.status(500).json({
          success: false,
          message: errorMessage,
          error: razorpayError.message,
        });
      }
    }

    // Return order details with Razorpay info if applicable
    res.status(201).json({
      success: true,
      message: requiresRazorpay
        ? 'Order created. Please proceed with payment.'
        : 'Order created successfully.',
      data: {
        order: {
          id: order._id,
          orderCode: order.orderCode,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          status: order.status,
          createdAt: order.createdAt,
        },
        razorpay: requiresRazorpay && razorpayOrder
          ? {
              orderId: razorpayOrder.id,
              amount: razorpayOrder.amount,
              currency: razorpayOrder.currency,
              keyId: razorpayKeyId,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Razorpay payment and update order
 * POST /api/user/orders/verify-payment
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Validate required fields
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields',
      });
    }

    // Verify payment signature
    const isValidSignature = razorpayService.verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
      });
    }

    // Get payment details from Razorpay to confirm
    let paymentDetails;
    try {
      paymentDetails = await razorpayService.getPaymentDetails(razorpayPaymentId);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify payment with payment gateway',
      });
    }

    // Check if payment is actually successful
    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful',
      });
    }

    // Update order with payment details
    const updatedOrder = await updateOrderPayment(orderId, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      status: 'completed',
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and order confirmed successfully',
      data: {
        order: {
          id: updatedOrder._id,
          orderCode: updatedOrder.orderCode,
          total: updatedOrder.total,
          paymentStatus: updatedOrder.paymentStatus,
          status: updatedOrder.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 * GET /api/user/orders/:orderId
 */
export const getOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { orderId } = req.params;

    const order = await getOrderById(orderId, userId);

    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: {
        order,
      },
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    next(error);
  }
};

/**
 * Get all orders for authenticated user
 * GET /api/user/orders
 */
export const getOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, paymentStatus, page, limit } = req.query;

    const filters = {
      status,
      paymentStatus,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    };

    const result = await getUserOrders(userId, filters);

    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an order
 * POST /api/user/orders/:orderId/cancel
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { orderId } = req.params;

    const cancelledOrder = await cancelOrderService(orderId, userId);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order: {
          id: cancelledOrder._id,
          orderCode: cancelledOrder.orderCode,
          status: cancelledOrder.status,
        },
      },
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    if (error.message.includes('cannot be cancelled')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

