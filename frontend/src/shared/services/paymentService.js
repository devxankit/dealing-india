/**
 * Initialize Razorpay Checkout
 * @param {Object} options - Razorpay checkout options
 * @param {String} options.key - Razorpay key ID
 * @param {Number} options.amount - Amount in rupees
 * @param {String} options.currency - Currency code (default: INR)
 * @param {String} options.name - Company/App name
 * @param {String} options.description - Order description
 * @param {String} options.orderId - Razorpay order ID
 * @param {String} options.prefill.name - Customer name
 * @param {String} options.prefill.email - Customer email
 * @param {String} options.prefill.contact - Customer phone
 * @param {Function} options.handler - Success callback
 * @param {Function} options.modal - Modal options
 * @returns {Promise} Razorpay checkout promise
 */
export const initializeRazorpayCheckout = (options) => {
  return new Promise((resolve, reject) => {
    // Check if Razorpay is loaded
    if (typeof window.Razorpay === 'undefined') {
      reject(new Error('Razorpay SDK not loaded. Please check if the script is included.'));
      return;
    }

    const {
      key,
      amount,
      currency = 'INR',
      name = 'Appzeto',
      description = 'Order Payment',
      orderId,
      prefill = {},
      handler,
      modal = {},
    } = options;

    if (!key || !amount || !orderId) {
      reject(new Error('Missing required Razorpay options: key, amount, or orderId'));
      return;
    }

    const razorpayOptions = {
      key,
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      name,
      description,
      order_id: orderId,
      prefill: {
        name: prefill.name || '',
        email: prefill.email || '',
        contact: prefill.contact || '',
      },
      theme: {
        color: '#10b981', // Green color matching app theme
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment cancelled by user'));
        },
        ...modal,
      },
      handler: (response) => {
        if (handler) {
          handler(response);
        }
        resolve(response);
      },
    };

    try {
      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Handle payment success
 * @param {Object} response - Razorpay payment response
 * @returns {Object} Formatted payment response
 */
export const handlePaymentSuccess = (response) => {
  return {
    razorpayOrderId: response.razorpay_order_id,
    razorpayPaymentId: response.razorpay_payment_id,
    razorpaySignature: response.razorpay_signature,
  };
};

/**
 * Handle payment error
 * @param {Error} error - Payment error
 * @returns {Object} Error details
 */
export const handlePaymentError = (error) => {
  return {
    success: false,
    message: error.message || 'Payment failed. Please try again.',
    error: error,
  };
};

