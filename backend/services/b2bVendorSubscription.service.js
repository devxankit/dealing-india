import VendorSubscription from '../models/VendorSubscription.model.js';
import Vendor from '../models/Vendor.model.js';
import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import mongoose from 'mongoose';

class B2BVendorSubscriptionService {
  /**
   * Get all B2B vendor subscriptions
   * @param {Object} filters - Filter options
   * @param {String} filters.status - Filter by status
   * @param {String} filters.planId - Filter by plan ID
   * @param {Boolean} filters.expiringSoon - Filter expiring soon subscriptions
   * @returns {Promise<Object>} Subscriptions with stats
   */
  async getAllB2BSubscriptions(filters = {}) {
    try {
      // Find all B2B vendors
      const b2bVendors = await Vendor.find({ vendorType: 'b2b' }).select('_id name email storeName');
      const b2bVendorIds = b2bVendors.map(v => v._id);

      // Build query
      const query = {
        vendorId: { $in: b2bVendorIds }
      };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.planId) {
        query.planId = new mongoose.Types.ObjectId(filters.planId);
      }

      // Get subscriptions - only those with planId (B2B subscriptions)
      query.planId = { $exists: true, $ne: null };
      
      let subscriptions = await VendorSubscription.find(query)
        .populate('vendorId', 'name email storeName')
        .populate('planId', 'name duration price')
        .sort({ createdAt: -1 })
        .lean();

      // Filter expiring soon (within 7 days)
      if (filters.expiringSoon) {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        subscriptions = subscriptions.filter(sub => {
          const endDate = new Date(sub.endDate);
          return endDate <= sevenDaysFromNow && endDate > new Date() && sub.status === 'active';
        });
      }

      // Calculate stats
      const stats = {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        expired: subscriptions.filter(s => s.status === 'expired').length,
        pending: subscriptions.filter(s => s.status === 'pending').length,
        expiringSoon: subscriptions.filter(s => {
          if (s.status !== 'active') return false;
          const endDate = new Date(s.endDate);
          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
          return endDate <= sevenDaysFromNow && endDate > new Date();
        }).length,
        monthlyRevenue: this.calculateMonthlyRevenue(subscriptions)
      };

      // Format subscriptions for frontend
      const formattedSubscriptions = subscriptions.map(sub => ({
        _id: sub._id,
        vendorName: sub.vendorId?.storeName || sub.vendorId?.name || 'Unknown Vendor',
        vendorEmail: sub.vendorId?.email || '',
        plan: sub.planId?.name || 'Unknown Plan',
        planDuration: sub.planId?.duration || 0,
        status: sub.status,
        amount: sub.planId?.price || 0,
        billingCycle: this.getBillingCycleLabel(sub.planId?.duration),
        expiryDate: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : null,
        startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : null,
        autoRenew: sub.autoRenew || false
      }));

      return {
        subscriptions: formattedSubscriptions,
        stats
      };
    } catch (error) {
      throw new Error(`Failed to fetch B2B subscriptions: ${error.message}`);
    }
  }

  /**
   * Calculate monthly revenue from active subscriptions
   */
  calculateMonthlyRevenue(subscriptions) {
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    let revenue = 0;

    activeSubs.forEach(sub => {
      if (sub.planId && sub.planId.price) {
        // Calculate monthly equivalent
        const duration = sub.planId.duration || 1;
        const monthlyPrice = sub.planId.price / duration;
        revenue += monthlyPrice;
      }
    });

    return Math.round(revenue);
  }

  /**
   * Get billing cycle label from duration
   */
  getBillingCycleLabel(duration) {
    if (!duration) return 'N/A';
    if (duration === 3) return '3 Months';
    if (duration === 6) return '6 Months';
    if (duration === 12) return '1 Year';
    return `${duration} Months`;
  }
}

export default new B2BVendorSubscriptionService();
