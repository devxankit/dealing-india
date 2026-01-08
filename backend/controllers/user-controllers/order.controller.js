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
 * 
 * For ONLINE payments (card, upi): Only creates Razorpay order, does NOT create DB order
 * For COD/Wallet-only: Creates order in DB immediately
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
      walletAmount = 0,
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

    // Check if payment method requires Razorpay (excluding wallet-only payments)
    const onlinePaymentMethods = ['creditCard', 'debitCard', 'upi'];
    const requiresRazorpay = onlinePaymentMethods.includes(paymentMethod);

    // Calculate amount to pay via Razorpay (after wallet deduction)
    const amountToPayOnline = Math.max(0, total - walletAmount);

    // Get socket.io instance
    const io = req.app.get('io');

    // If it's a COD order OR wallet covers full amount, create order immediately
    if (!requiresRazorpay || amountToPayOnline <= 0) {
      const order = await createOrderService({
        customerId: userId,
        items,
        total,
        paymentMethod: amountToPayOnline <= 0 ? 'wallet' : paymentMethod,
        shippingAddress,
        subtotal,
        shipping,
        tax,
        discount,
        couponCode,
        walletAmount,
      }, io);

      return res.status(201).json({
        success: true,
        message: 'Order created successfully.',
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
          razorpay: null,
        },
      });
    }

    // For online payments: Only create Razorpay order (NO DB order yet)
    // Order will be created after payment verification
    try {
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      if (!razorpayKeyId) {
        throw new Error('Razorpay key ID not configured');
      }

      // Validate amount before creating Razorpay order
      if (amountToPayOnline <= 0) {
        throw new Error('Invalid order total amount for payment');
      }

      // Minimum amount for Razorpay is ₹1 (100 paise)
      if (amountToPayOnline < 1) {
        throw new Error('Order amount must be at least ₹1');
      }

      // Generate a temporary order reference for Razorpay
      const tempOrderRef = `TEMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const razorpayOrder = await razorpayService.createOrder(
        amountToPayOnline,
        'INR',
        tempOrderRef,
        {
          customerId: userId,
          couponCode: couponCode || '',
          isTemporary: true, // Mark as temporary until order is created
        }
      );

      if (!razorpayOrder || !razorpayOrder.id) {
        throw new Error('Failed to create Razorpay order - invalid response');
      }

      // Return Razorpay details WITHOUT creating DB order
      // The order data will be sent again during payment verification
      res.status(200).json({
        success: true,
        message: 'Payment initialized. Complete payment to place order.',
        data: {
          order: null, // No order created yet
          razorpay: {
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: razorpayKeyId,
          },
          // Send back order data for frontend to use during verification
          pendingOrderData: {
            items,
            total,
            paymentMethod,
            shippingAddress,
            subtotal,
            shipping,
            tax,
            discount,
            couponCode,
            walletAmount,
          },
        },
      });
    } catch (razorpayError) {
      console.error('Razorpay order creation failed:', razorpayError);

      let errorMessage = 'Failed to initialize payment gateway. Please try again.';
      if (razorpayError.message.includes('authentication failed')) {
        errorMessage = 'Payment gateway configuration error. Please contact support.';
      } else if (razorpayError.message.includes('not configured')) {
        errorMessage = 'Payment gateway is not configured. Please contact support.';
      } else {
        errorMessage = razorpayError.message || errorMessage;
      }

      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: razorpayError.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Razorpay payment and CREATE order in database
 * POST /api/user/orders/verify-payment
 * 
 * This now creates the order after successful payment verification
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      // Order data (sent from frontend after payment success)
      orderData
    } = req.body;

    // Validate required payment fields
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields',
      });
    }

    // Validate order data
    if (!orderData || !orderData.items || !orderData.total) {
      return res.status(400).json({
        success: false,
        message: 'Missing order data for verification',
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

    // Get socket.io instance
    const io = req.app.get('io');

    // NOW create the order in database (payment is verified)
    const order = await createOrderService({
      customerId: userId,
      items: orderData.items,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      shippingAddress: orderData.shippingAddress,
      subtotal: orderData.subtotal,
      shipping: orderData.shipping || 0,
      tax: orderData.tax || 0,
      discount: orderData.discount || 0,
      couponCode: orderData.couponCode,
      walletAmount: orderData.walletAmount || 0,
      // Payment is already completed
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    }, io);

    // Update order payment status to completed
    const updatedOrder = await updateOrderPayment(order._id.toString(), {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      status: 'completed',
    }, io);

    res.status(200).json({
      success: true,
      message: 'Payment verified and order created successfully',
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
    console.log('Fetching orders for user:', userId);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found. Please login again.',
      });
    }

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
