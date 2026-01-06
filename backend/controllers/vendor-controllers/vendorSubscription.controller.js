import SubscriptionService from '../../services/subscription.service.js';

class VendorSubscriptionController {
  async getTiers(req, res) {
    try {
      const tiers = await SubscriptionService.getAllTiers();
      res.status(200).json({ success: true, data: tiers || [] });
    } catch (error) {
      console.error('Error getting tiers:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to get subscription tiers' 
      });
    }
  }

  async getCurrentSubscription(req, res) {
    try {
      // Get vendor ID from req.user (set by authenticate middleware)
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      
      if (!vendorId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Vendor ID not found' 
        });
      }

      const subscription = await SubscriptionService.getVendorSubscription(vendorId);
      // Return null if no subscription found (this is valid - vendor might not have subscribed yet)
      // Add timestamp to help frontend detect changes
      res.status(200).json({ 
        success: true, 
        data: subscription,
        timestamp: new Date().toISOString() // Add timestamp to force refresh detection
      });
    } catch (error) {
      console.error('Error getting current subscription:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to get subscription' 
      });
    }
  }

  async initializeSubscription(req, res) {
    try {
      const { tierId } = req.body;
      if (!tierId) {
        return res.status(400).json({ success: false, message: 'Tier ID is required' });
      }

      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const io = req.app.get('io');
      const result = await SubscriptionService.initializeSubscription(
        vendorId,
        tierId,
        io
      );

      res.status(200).json({
        success: true,
        message: result.razorpay ? 'Payment initialized. Please proceed with payment.' : 'Free subscription activated.',
        data: {
          subscription: result.subscription,
          razorpay: result.razorpay ? {
            orderId: result.razorpay.id,
            amount: result.razorpay.amount,
            currency: result.razorpay.currency,
            keyId: result.razorpayKeyId
          } : null
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { vendorId, tierId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      
      // Validate required fields
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({
          success: false,
          message: 'All payment details are required'
        });
      }

      // Get vendorId from authenticated user or request body
      const authenticatedVendorId = req.user?.vendorId || req.userDoc?._id;
      const finalVendorId = vendorId || authenticatedVendorId;
      
      if (!finalVendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required'
        });
      }

      if (!tierId) {
        return res.status(400).json({
          success: false,
          message: 'Tier ID is required'
        });
      }

      const io = req.app.get('io');
      const subscription = await SubscriptionService.verifySubscriptionPayment(
        finalVendorId,
        tierId,
        {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature
        },
        io
      );

      res.status(200).json({
        success: true,
        message: 'Payment verified and subscription activated successfully',
        data: subscription
      });
    } catch (error) {
      // Handle payment failure specifically
      const statusCode = error.message?.includes('Payment not successful') || 
                        error.message?.includes('verification failed') ? 400 : 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Payment verification failed' 
      });
    }
  }

  async subscribe(req, res) {
    try {
      const { tierId, billingCycle, paymentMethod } = req.body;
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const subscription = await SubscriptionService.subscribeVendor(
        vendorId,
        tierId,
        billingCycle,
        paymentMethod
      );
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async upgrade(req, res) {
    try {
      const { newTierId, billingCycle } = req.body;
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const subscription = await SubscriptionService.upgradeSubscription(
        vendorId,
        newTierId,
        billingCycle
      );
      res.status(200).json({ success: true, data: subscription });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateRenewal(req, res) {
    try {
      const { autoRenew } = req.body;
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      if (typeof autoRenew !== 'boolean') {
        return res.status(400).json({ success: false, message: 'autoRenew must be a boolean' });
      }

      const subscription = await SubscriptionService.updateAutoRenewal(vendorId, autoRenew);
      res.status(200).json({ 
        success: true, 
        message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`,
        data: subscription 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBillingHistory(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      const { filter = 'all' } = req.query;
      
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const billingHistory = await SubscriptionService.getVendorBillingHistory(vendorId, filter);
      
      // Always return success with data (even if empty array)
      res.status(200).json({ 
        success: true, 
        data: billingHistory || []
      });
    } catch (error) {
      console.error('Error in getBillingHistory controller:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to load billing history' 
      });
    }
  }

  async checkReelPayment(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const paymentCheck = await SubscriptionService.checkReelUploadPayment(vendorId);
      res.status(200).json({ success: true, data: paymentCheck });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async initializeExtraReelPayment(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      const result = await SubscriptionService.initializeExtraReelPayment(vendorId);
      res.status(200).json({
        success: true,
        message: 'Payment initialized for extra reel',
        data: result
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async verifyExtraReelPayment(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id;
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      
      if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID not found' });
      }

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({
          success: false,
          message: 'All payment details are required'
        });
      }

      const result = await SubscriptionService.verifyExtraReelPayment(vendorId, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully. You can now upload the reel.',
        data: result
      });
    } catch (error) {
      console.error('Error verifying extra reel payment:', error);
      const statusCode = error.message?.includes('verification failed') ? 400 : 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Failed to verify payment' 
      });
    }
  }
}

export default new VendorSubscriptionController();
