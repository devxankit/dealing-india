import b2bVendorSubscriptionService from '../../services/b2bVendorSubscription.service.js';

class AdminB2BVendorSubscriptionController {
  /**
   * Get all B2B vendor subscriptions
   * GET /admin/b2b-vendors/subscriptions
   */
  async getSubscriptions(req, res) {
    try {
      const { status, planId, expiringSoon } = req.query;
      
      const filters = {};
      if (status) filters.status = status;
      if (planId) filters.planId = planId;
      if (expiringSoon === 'true') filters.expiringSoon = true;

      const result = await b2bVendorSubscriptionService.getAllB2BSubscriptions(filters);
      
      res.status(200).json({
        success: true,
        data: result.subscriptions,
        stats: result.stats,
        message: 'B2B vendor subscriptions fetched successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch B2B vendor subscriptions',
      });
    }
  }
}

export default new AdminB2BVendorSubscriptionController();
