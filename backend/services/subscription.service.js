import SubscriptionTier from '../models/SubscriptionTier.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Vendor from '../models/Vendor.model.js';
import Transaction from '../models/Transaction.model.js';
import mongoose from 'mongoose';

class SubscriptionService {
  async getAllTiers() {
    return await SubscriptionTier.find({ isActive: true });
  }

  async createTier(tierData) {
    return await SubscriptionTier.create(tierData);
  }

  async updateTier(tierId, updateData) {
    return await SubscriptionTier.findByIdAndUpdate(tierId, updateData, { new: true });
  }

  async getVendorSubscription(vendorId) {
    return await VendorSubscription.findOne({ vendorId, status: 'active' })
      .populate('tierId');
  }

  async subscribeVendor(vendorId, tierId, paymentMethod) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const tier = await SubscriptionTier.findById(tierId).session(session);
      if (!tier) throw new Error('Subscription tier not found');

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const subscription = await VendorSubscription.create([{
        vendorId,
        tierId,
        billingCycle: 'monthly',
        startDate,
        endDate,
        paymentMethod,
        status: 'active',
        lastPaymentDate: startDate,
        nextBillingDate: endDate,
        usage: {
          reelsUploaded: 0,
          extraReelsCharged: 0,
          lastResetDate: startDate
        }
      }], { session });

      await Vendor.findByIdAndUpdate(vendorId, {
        currentSubscription: subscription[0]._id
      }, { session });

      // Create a transaction record
      const amount = tier.priceMonthly;
      if (amount > 0) {
        await Transaction.create([{
          transactionCode: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount,
          type: 'payment',
          status: 'completed',
          method: paymentMethod,
          vendorId,
          details: { subscriptionId: subscription[0]._id, tierName: tier.name }
        }], { session });
      }

      await session.commitTransaction();
      return subscription[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async trackReelUpload(vendorId) {
    const subscription = await VendorSubscription.findOne({ vendorId, status: 'active' }).populate('tierId');
    if (!subscription) {
      // If no subscription, they might be on a legacy state, but based on requirements, 
      // they should have a Free plan by default.
      throw new Error('No active subscription found for vendor');
    }

    const { tierId: tier } = subscription;
    let extraCharge = 0;

    // Check limits
    if (tier.reelLimit !== -1) { // -1 means unlimited
      if (subscription.usage.reelsUploaded >= tier.reelLimit) {
        extraCharge = tier.extraReelPrice || 10;
      }
    }

    subscription.usage.reelsUploaded += 1;
    if (extraCharge > 0) {
      subscription.usage.extraReelsCharged += extraCharge;
      
      // In a real system, you might charge immediately or add to next bill
      // For now, we record it in usage and could create a separate transaction if needed
      await Transaction.create({
        transactionCode: `REEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: extraCharge,
        type: 'payment',
        status: 'completed',
        method: subscription.paymentMethod || 'wallet',
        vendorId,
        details: { subscriptionId: subscription._id, type: 'extra_reel_charge' }
      });
    }

    await subscription.save();
    return { 
      totalUploaded: subscription.usage.reelsUploaded, 
      extraCharge,
      limit: tier.reelLimit 
    };
  }

  async upgradeSubscription(vendorId, newTierId) {
    // Implementation for upgrade with proration logic
    const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' }).populate('tierId');
    if (!currentSub) throw new Error('No active subscription found');

    const newTier = await SubscriptionTier.findById(newTierId);
    if (!newTier) throw new Error('New subscription tier not found');

    // Calculate proration
    const now = new Date();
    const remainingTime = currentSub.endDate - now;
    const totalTime = currentSub.endDate - currentSub.startDate;
    const remainingRatio = Math.max(0, remainingTime / totalTime);

    const currentPrice = currentSub.tierId.priceMonthly;
    const unusedAmount = currentPrice * remainingRatio;

    const newPrice = newTier.priceMonthly;
    const chargeAmount = Math.max(0, newPrice - unusedAmount);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Deactivate current sub
      currentSub.status = 'expired';
      currentSub.cancellationDate = now;
      await currentSub.save({ session });

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const newSub = await VendorSubscription.create([{
        vendorId,
        tierId: newTierId,
        billingCycle: 'monthly',
        startDate: now,
        endDate,
        status: 'active',
        paymentMethod: currentSub.paymentMethod,
        lastPaymentDate: now,
        nextBillingDate: endDate,
        usage: {
          reelsUploaded: 0, // Reset for new tier
          extraReelsCharged: 0,
          lastResetDate: now
        },
        auditLogs: [{
          action: 'upgrade',
          details: { fromTier: currentSub.tierId.name, toTier: newTier.name, proratedCharge: chargeAmount }
        }]
      }], { session });

      await Vendor.findByIdAndUpdate(vendorId, {
        currentSubscription: newSub[0]._id
      }, { session });

      if (chargeAmount > 0) {
        await Transaction.create([{
          transactionCode: `SUB-UP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount: chargeAmount,
          type: 'payment',
          status: 'completed',
          method: currentSub.paymentMethod,
          vendorId,
          details: { subscriptionId: newSub[0]._id, tierName: newTier.name, type: 'upgrade_proration' }
        }], { session });
      }

      await session.commitTransaction();
      return newSub[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getSubscriptionAnalytics() {
    const totalRevenue = await Transaction.aggregate([
      { $match: { transactionCode: /^SUB-/ } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const tierDistribution = await VendorSubscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$tierId', count: { $sum: 1 } } },
      { $lookup: { from: 'subscriptiontiers', localField: '_id', foreignField: '_id', as: 'tier' } },
      { $unwind: '$tier' },
      { $project: { name: '$tier.name', count: 1 } }
    ]);

    return {
      revenue: totalRevenue[0]?.total || 0,
      tiers: tierDistribution
    };
  }
}

export default new SubscriptionService();
