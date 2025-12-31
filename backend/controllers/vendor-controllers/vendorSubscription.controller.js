import SubscriptionService from '../../services/subscription.service.js';

class VendorSubscriptionController {
  async getCurrentSubscription(req, res) {
    try {
      const subscription = await SubscriptionService.getVendorSubscription(req.vendor._id);
      res.status(200).json({ success: true, data: subscription });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async subscribe(req, res) {
    try {
      const { tierId, billingCycle, paymentMethod } = req.body;
      const subscription = await SubscriptionService.subscribeVendor(
        req.vendor._id,
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
      const subscription = await SubscriptionService.upgradeSubscription(
        req.vendor._id,
        newTierId,
        billingCycle
      );
      res.status(200).json({ success: true, data: subscription });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new VendorSubscriptionController();
