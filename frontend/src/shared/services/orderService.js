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

// ==================== VENDOR ORDER METHODS ====================

/**
 * Get vendor orders
 * @param {Object} filters - Filter options
 * @param {String} filters.status - Order status filter
 * @param {Number} filters.page - Page number
 * @param {Number} filters.limit - Items per page
 * @returns {Promise<Object>} Orders list with pagination
 */
export const getVendorOrders = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get(`/vendor/orders?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    throw error;
  }
};

/**
 * Get vendor order by ID
 * @param {String} orderId - Order ID
 * @returns {Promise<Object>} Order details
 */
export const getVendorOrderById = async (orderId) => {
  try {
    const response = await api.get(`/vendor/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vendor order:', error);
    throw error;
  }
};

/**
 * Update vendor order status
 * @param {String} orderId - Order ID
 * @param {String} status - New status
 * @param {String} note - Optional note
 * @returns {Promise<Object>} Updated order
 */
export const updateVendorOrderStatus = async (orderId, status, note = '') => {
  try {
    const response = await api.put(`/vendor/orders/${orderId}/status`, {
      status,
      note,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating vendor order status:', error);
    throw error;
  }
};

/**
 * Get vendor order statistics
 * @returns {Promise<Object>} Order statistics
 */
export const getVendorOrderStats = async () => {
  try {
    const response = await api.get('/vendor/orders/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching vendor order stats:', error);
    throw error;
  }
};

/**
 * Get vendor earnings statistics
 * @returns {Promise<Object>} Earnings statistics (pending vs realized)
 */
export const getVendorEarningsStats = async () => {
  try {
    const response = await api.get('/vendor/orders/earnings');
    return response.data;
  } catch (error) {
    console.error('Error fetching vendor earnings stats:', error);
    throw error;
  }
};

// ==================== ADMIN ORDER METHODS ====================

/**
 * Get admin orders
 * @param {Object} filters - Filter options
 * @param {String} filters.status - Order status filter
 * @param {String} filters.paymentStatus - Payment status filter
 * @param {String} filters.customerId - Customer ID filter
 * @param {String} filters.vendorId - Vendor ID filter
 * @param {String} filters.search - Search query
 * @param {String} filters.startDate - Start date filter
 * @param {String} filters.endDate - End date filter
 * @param {Number} filters.page - Page number
 * @param {Number} filters.limit - Items per page
 * @returns {Promise<Object>} Orders list with pagination
 */
export const getAdminOrders = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters.customerId) params.append('customerId', filters.customerId);
    if (filters.vendorId) params.append('vendorId', filters.vendorId);
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/admin/orders?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    throw error;
  }
};

/**
 * Get admin order by ID
 * @param {String} orderId - Order ID
 * @returns {Promise<Object>} Order details
 */
export const getAdminOrderById = async (orderId) => {
  try {
    const response = await api.get(`/admin/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching admin order:', error);
    throw error;
  }
};

/**
 * Update admin order status
 * @param {String} orderId - Order ID
 * @param {String} status - New status
 * @param {String} note - Optional note
 * @returns {Promise<Object>} Updated order
 */
export const updateAdminOrderStatus = async (orderId, status, note = '') => {
  try {
    const response = await api.put(`/admin/orders/${orderId}/status`, {
      status,
      note,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating admin order status:', error);
    throw error;
  }
};

/**
 * Cancel admin order
 * @param {String} orderId - Order ID
 * @param {String} reason - Cancellation reason
 * @returns {Promise<Object>} Cancelled order
 */
export const cancelAdminOrder = async (orderId, reason = '') => {
  try {
    const response = await api.put(`/admin/orders/${orderId}/cancel`, {
      reason,
    });
    return response.data;
  } catch (error) {
    console.error('Error cancelling admin order:', error);
    throw error;
  }
};

/**
 * Process refund (admin)
 * @param {String} orderId - Order ID
 * @param {Number} refundAmount - Refund amount
 * @param {String} refundTransactionId - Refund transaction ID
 * @param {String} note - Optional note
 * @returns {Promise<Object>} Refunded order
 */
export const processRefund = async (orderId, refundAmount, refundTransactionId = '', note = '') => {
  try {
    const response = await api.put(`/admin/orders/${orderId}/refund`, {
      refundAmount,
      refundTransactionId,
      note,
    });
    return response.data;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
};

/**
 * Get admin order statistics
 * @returns {Promise<Object>} Order statistics
 */
export const getAdminOrderStats = async () => {
  try {
    const response = await api.get('/admin/orders/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching admin order stats:', error);
    throw error;
  }
};

/**
 * Get admin order analytics for charts
 * @param {Object} params - { type, date }
 * @returns {Promise<Object>} Analytics data
 */
export const getAdminOrderAnalytics = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.date) queryParams.append('date', params.date);

    const response = await api.get(`/admin/reports/order-analytics?${queryParams.toString()}`);
    // response is already unwrapped by axios interceptor, so it's the backend JSON: { success, data }
    return response;
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    throw error;
  }
};
