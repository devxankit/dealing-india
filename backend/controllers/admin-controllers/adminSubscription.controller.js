import SubscriptionService from '../../services/subscription.service.js';

class AdminSubscriptionController {
  async getTiers(req, res) {
    try {
      // Admin can see all tiers including inactive ones
      const includeInactive = req.query.includeInactive === 'true';
      const tiers = await SubscriptionService.getAllTiers(includeInactive);
      res.status(200).json({ success: true, data: tiers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async createTier(req, res) {
    try {
      const tier = await SubscriptionService.createTier(req.body);
      res.status(201).json({ success: true, data: tier });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateTier(req, res) {
    try {
      const tier = await SubscriptionService.updateTier(req.params.id, req.body);
      res.status(200).json({ success: true, data: tier });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAnalytics(req, res) {
    try {
      const analytics = await SubscriptionService.getSubscriptionAnalytics();
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMonitoring(req, res) {
    try {
      const { status, tierId, expiringSoon } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (tierId) filters.tierId = tierId;
      if (expiringSoon === 'true') filters.expiringSoon = true;

      const subscriptions = await SubscriptionService.getAllVendorSubscriptions(filters);
      res.status(200).json({ success: true, data: subscriptions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async manualOverride(req, res) {
    try {
      const { subscriptionId, action, details } = req.body;
      // Extract adminId from decoded JWT token (adminId is set in token payload)
      const adminId = req.user?.adminId || req.userDoc?._id;

      if (!subscriptionId || !action) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID and action are required'
        });
      }

      if (!adminId) {
        console.error('Admin ID not found in request:', {
          user: req.user,
          userDoc: req.userDoc ? { _id: req.userDoc._id, email: req.userDoc.email } : null
        });
        return res.status(401).json({
          success: false,
          message: 'Admin ID is required. Please ensure you are authenticated. Please login again.'
        });
      }

      // Validate action
      const validActions = ['extend_30_days', 'extend_custom', 'grant_premium_trial', 'cancel_subscription', 'reactivate'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: `Invalid action. Allowed actions: ${validActions.join(', ')}`
        });
      }

      // Validate details for extend_custom
      if (action === 'extend_custom' && (!details || !details.days)) {
        return res.status(400).json({
          success: false,
          message: 'Number of days is required for custom extension'
        });
      }

      const updatedSubscription = await SubscriptionService.manualSubscriptionOverride(
        subscriptionId,
        action,
        adminId,
        details || {}
      );

      res.status(200).json({
        success: true,
        message: `Subscription ${action.replace(/_/g, ' ')} completed successfully`,
        data: updatedSubscription
      });
    } catch (error) {
      console.error('Error in manualOverride controller:', error);
      const statusCode = error.message.includes('not found') || error.message.includes('Invalid') ? 400 : 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Failed to apply manual override'
      });
    }
  }
}

export default new AdminSubscriptionController();
