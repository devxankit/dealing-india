import Razorpay from 'razorpay';
import crypto from 'crypto';

class RazorpayService {
  constructor() {
    this.razorpay = null;
    this.initializeRazorpay();
  }

  /**
   * Initialize Razorpay instance with keys from environment variables
   */
  initializeRazorpay() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.warn('⚠️ Razorpay keys not found in environment variables');
      return;
    }

    try {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      console.log('✅ Razorpay initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Razorpay:', error.message);
      throw error;
    }
  }

  /**
   * Create an order in Razorpay
   * @param {Number} amount - Amount in paise (e.g., 10000 for ₹100)
   * @param {String} currency - Currency code (default: 'INR')
   * @param {String} receipt - Receipt ID for the order
   * @param {Object} notes - Additional notes/metadata
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder(amount, currency = 'INR', receipt, notes = {}) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized. Please check environment variables.');
    }

    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency.toUpperCase(),
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes,
      };

      const order = await this.razorpay.orders.create(options);
      return {
        id: order.id,
        entity: order.entity,
        amount: order.amount,
        amount_paid: order.amount_paid,
        amount_due: order.amount_due,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        attempts: order.attempts,
        notes: order.notes,
        created_at: order.created_at,
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  /**
   * Verify payment signature
   * @param {String} orderId - Razorpay order ID
   * @param {String} paymentId - Razorpay payment ID
   * @param {String} signature - Payment signature from Razorpay
   * @returns {Boolean} True if signature is valid
   */
  verifyPayment(orderId, paymentId, signature) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        throw new Error('Razorpay key secret not found');
      }

      // Create the signature string
      const payload = `${orderId}|${paymentId}`;
      
      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(payload)
        .digest('hex');

      // Compare signatures
      const isValid = expectedSignature === signature;
      
      if (!isValid) {
        console.warn('⚠️ Payment signature verification failed');
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Capture payment (for manual capture if needed)
   * @param {String} paymentId - Razorpay payment ID
   * @param {Number} amount - Amount to capture in rupees
   * @returns {Promise<Object>} Captured payment object
   */
  async capturePayment(paymentId, amount) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const captureAmount = Math.round(amount * 100); // Convert to paise
      const payment = await this.razorpay.payments.capture(paymentId, captureAmount);
      return payment;
    } catch (error) {
      console.error('Error capturing payment:', error);
      throw new Error(`Failed to capture payment: ${error.message}`);
    }
  }

  /**
   * Get payment details from Razorpay
   * @param {String} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentDetails(paymentId) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
  }

  /**
   * Get order details from Razorpay
   * @param {String} orderId - Razorpay order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrderDetails(orderId) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw new Error(`Failed to fetch order details: ${error.message}`);
    }
  }

  /**
   * Refund a payment
   * @param {String} paymentId - Razorpay payment ID
   * @param {Number} amount - Amount to refund in rupees (optional, full refund if not provided)
   * @param {String} notes - Refund notes
   * @returns {Promise<Object>} Refund details
   */
  async refundPayment(paymentId, amount = null, notes = {}) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const refundData = {
        notes: notes,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);
      return refund;
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new RazorpayService();

