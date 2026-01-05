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
      const adminId = req.user?.id || req.user?._id;

      if (!subscriptionId || !action) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID and action are required'
        });
      }

      const updatedSubscription = await SubscriptionService.manualSubscriptionOverride(
        subscriptionId,
        action,
        adminId,
        details
      );

      res.status(200).json({
        success: true,
        message: `Subscription ${action} completed successfully`,
        data: updatedSubscription
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new AdminSubscriptionController();
