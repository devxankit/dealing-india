import SubscriptionService from '../../services/subscription.service.js';

class AdminSubscriptionController {
  async getTiers(req, res) {
    try {
      const tiers = await SubscriptionService.getAllTiers();
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
}

export default new AdminSubscriptionController();
