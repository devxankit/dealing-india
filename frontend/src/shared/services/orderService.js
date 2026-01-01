import api from '../utils/api';

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Created order with Razorpay details
 */
export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/user/orders/create', orderData);
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Verify Razorpay payment
 * @param {String} orderId - Order ID
 * @param {Object} paymentData - Payment verification data
 * @param {String} paymentData.razorpayOrderId - Razorpay order ID
 * @param {String} paymentData.razorpayPaymentId - Razorpay payment ID
 * @param {String} paymentData.razorpaySignature - Payment signature
 * @returns {Promise<Object>} Verified order
 */
export const verifyPayment = async (orderId, paymentData) => {
  try {
    const response = await api.post('/user/orders/verify-payment', {
      orderId,
      ...paymentData,
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

/**
 * Get order by ID
 * @param {String} orderId - Order ID
 * @returns {Promise<Object>} Order details
 */
export const getOrderById = async (orderId) => {
  try {
    const response = await api.get(`/user/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

/**
 * Get all orders for authenticated user
 * @param {Object} filters - Filter options
 * @param {String} filters.status - Order status filter
 * @param {String} filters.paymentStatus - Payment status filter
 * @param {Number} filters.page - Page number
 * @param {Number} filters.limit - Items per page
 * @returns {Promise<Object>} Orders list with pagination
 */
export const getUserOrders = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/user/orders?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

/**
 * Cancel an order
 * @param {String} orderId - Order ID
 * @returns {Promise<Object>} Cancelled order
 */
export const cancelOrder = async (orderId) => {
  try {
    const response = await api.post(`/user/orders/${orderId}/cancel`);
    return response.data;
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};

