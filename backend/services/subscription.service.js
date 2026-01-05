import SubscriptionTier from '../models/SubscriptionTier.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Vendor from '../models/Vendor.model.js';
import Transaction from '../models/Transaction.model.js';
import razorpayService from './razorpay.service.js';
import NotificationService from './notification.service.js';
import mongoose from 'mongoose';

class SubscriptionService {
  async getAllTiers(includeInactive = false) {
    try {
      const query = includeInactive ? {} : { isActive: true };
      const tiers = await SubscriptionTier.find(query)
        .sort({ priceMonthly: 1 }) // Sort by price ascending
        .lean();
      return tiers || [];
    } catch (error) {
      console.error('Error getting all tiers:', error);
      throw error;
    }
  }

  async createTier(tierData) {
    return await SubscriptionTier.create(tierData);
  }

  async updateTier(tierId, updateData) {
    return await SubscriptionTier.findByIdAndUpdate(tierId, updateData, { new: true });
  }

  async getVendorSubscription(vendorId) {
    try {
      // Convert vendorId to ObjectId if it's a string
      const vendorObjectId = typeof vendorId === 'string' 
        ? new mongoose.Types.ObjectId(vendorId) 
        : vendorId;

      const subscription = await VendorSubscription.findOne({ 
        vendorId: vendorObjectId, 
        status: 'active' 
      })
        .populate({
          path: 'tierId',
          select: 'name priceMonthly reelLimit extraReelPrice features isActive'
        })
        .lean();
      
      // If no active subscription, return null (not an error)
      if (!subscription) {
        return null;
      }

      // If tierId is null (deleted tier), handle gracefully
      if (!subscription.tierId) {
        console.warn(`Subscription ${subscription._id} has invalid tierId`);
        return null;
      }

      return subscription;
    } catch (error) {
      console.error('Error in getVendorSubscription:', error);
      // Don't throw error, return null instead to allow frontend to handle gracefully
      return null;
    }
  }

  /**
   * Initialize subscription with Razorpay order (for payment)
   */
  async initializeSubscription(vendorId, tierId, io = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const tier = await SubscriptionTier.findById(tierId).session(session);
      if (!tier) throw new Error('Subscription tier not found');

      const vendor = await Vendor.findById(vendorId).session(session);
      if (!vendor) throw new Error('Vendor not found');

      // If free tier, activate immediately
      if (tier.priceMonthly === 0) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const subscription = await VendorSubscription.create([{
          vendorId,
          tierId,
          billingCycle: 'monthly',
          startDate,
          endDate,
          paymentMethod: 'free',
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

        await session.commitTransaction();
        return {
          subscription: subscription[0],
          razorpay: null,
          razorpayKeyId: null
        };
      }

      // For paid tiers, create pending subscription and Razorpay order
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const subscriptionCode = `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const subscription = await VendorSubscription.create([{
        vendorId,
        tierId,
        billingCycle: 'monthly',
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        status: 'pending', // Will be activated after payment
        usage: {
          reelsUploaded: 0,
          extraReelsCharged: 0,
          lastResetDate: startDate
        }
      }], { session });

      // Create Razorpay order
      let razorpayOrder = null;
      let razorpayKeyId = null;
      
      try {
        razorpayOrder = await razorpayService.createOrder(
          tier.priceMonthly,
          'INR',
          subscriptionCode,
          {
            subscriptionId: subscription[0]._id.toString(),
            vendorId: vendorId.toString(),
            tierId: tierId.toString(),
            tierName: tier.name,
            type: 'subscription'
          }
        );

        if (razorpayOrder && razorpayOrder.id) {
          subscription[0].razorpayOrderId = razorpayOrder.id;
          await subscription[0].save({ session });
        }

        razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;
      } catch (razorpayError) {
        console.error('Razorpay order creation failed:', razorpayError);
        await session.abortTransaction();
        throw new Error(`Failed to initialize payment: ${razorpayError.message}`);
      }

      await session.commitTransaction();
      
      return {
        subscription: subscription[0],
        razorpay: razorpayOrder,
        razorpayKeyId
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Verify payment and activate subscription
   */
  async verifySubscriptionPayment(subscriptionId, paymentData, io = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

      const subscription = await VendorSubscription.findById(subscriptionId).session(session)
        .populate('tierId')
        .populate({
          path: 'vendorId',
          select: 'businessName storeName email phone'
        });
      
      if (!subscription) throw new Error('Subscription not found');
      if (subscription.status === 'active') {
        throw new Error('Subscription is already active');
      }

      // Verify Razorpay payment
      const isValid = razorpayService.verifyPayment(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        throw new Error('Payment verification failed');
      }

      // Update subscription with payment details and activate
      subscription.razorpayOrderId = razorpayOrderId;
      subscription.razorpayPaymentId = razorpayPaymentId;
      subscription.razorpaySignature = razorpaySignature;
      subscription.status = 'active';
      subscription.lastPaymentDate = new Date();
      subscription.nextBillingDate = subscription.endDate;
      
      await subscription.save({ session });

      // Update vendor's current subscription
      await Vendor.findByIdAndUpdate(subscription.vendorId, {
        currentSubscription: subscription._id
      }, { session });

      // Create transaction record
      const amount = subscription.tierId.priceMonthly;
      if (amount > 0) {
        await Transaction.create([{
          transactionCode: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount,
          type: 'payment',
          status: 'completed',
          method: 'razorpay',
          vendorId: subscription.vendorId,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          details: {
            subscriptionId: subscription._id,
            tierName: subscription.tierId.name,
            type: 'subscription_payment'
          }
        }], { session });
      }

      // Send notification to admin
      try {
        const vendorName = subscription.vendorId?.businessName || subscription.vendorId?.storeName || 'A vendor';
        const tierName = subscription.tierId?.name || 'Unknown Plan';
        const adminNotification = {
          recipientType: 'admin',
          type: 'payment_success',
          title: 'New Subscription Payment',
          message: `${vendorName} has subscribed to ${tierName} plan (₹${amount})`,
          metadata: {
            subscriptionId: subscription._id,
            vendorId: subscription.vendorId?._id || subscription.vendorId,
            tierName: tierName,
            amount,
            type: 'subscription'
          },
          actionUrl: `/admin/subscriptions/${subscription._id}`
        };

        // Get all admins and send notification
        const Admin = (await import('../models/Admin.model.js')).default;
        const admins = await Admin.find({ isActive: true }).select('_id');
        
        if (admins.length > 0) {
          const notifications = admins.map(admin => ({
            ...adminNotification,
            recipientId: admin._id
          }));
          
          await NotificationService.createBulkNotifications(notifications, io);
        }
      } catch (notifError) {
        console.error('Error sending admin notification:', notifError);
        // Don't fail the transaction if notification fails
      }

      await session.commitTransaction();
      return subscription;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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

  async checkReelUploadPayment(vendorId) {
    const subscription = await VendorSubscription.findOne({ vendorId, status: 'active' }).populate('tierId');
    if (!subscription) {
      throw new Error('No active subscription found for vendor');
    }

    const { tierId: tier } = subscription;
    let requiresPayment = false;
    let extraCharge = 0;

    // Check if payment is required
    // Free plan (limit = 0): Always requires payment for each reel (even first one)
    // Other plans: Requires payment if limit is reached or exceeded
    if (tier.reelLimit === 0) {
      // Free plan - always requires payment for each reel
      requiresPayment = true;
      extraCharge = tier.extraReelPrice || 10;
    } else if (tier.reelLimit !== -1) { // -1 means unlimited
      // For Starter/Professional: Check if limit reached or exceeded
      if (subscription.usage.reelsUploaded >= tier.reelLimit) {
        requiresPayment = true;
        extraCharge = tier.extraReelPrice || 10;
      }
    }
    // Premium plan (limit = -1): No payment required

    return {
      requiresPayment,
      extraCharge,
      currentUsage: subscription.usage.reelsUploaded,
      limit: tier.reelLimit,
      tierName: tier.name
    };
  }

  async initializeExtraReelPayment(vendorId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const paymentCheck = await this.checkReelUploadPayment(vendorId);
      
      if (!paymentCheck.requiresPayment) {
        throw new Error('Payment not required for this reel upload');
      }

      const subscription = await VendorSubscription.findOne({ vendorId, status: 'active' }).session(session)
        .populate('tierId');
      
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Create Razorpay order for extra reel payment
      const orderCode = `REEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const razorpayOrder = await razorpayService.createOrder(
        paymentCheck.extraCharge * 100, // Convert to paise
        'INR',
        orderCode,
        {
          vendorId: vendorId.toString(),
          subscriptionId: subscription._id.toString(),
          type: 'extra_reel_payment',
          tierName: subscription.tierId.name
        }
      );

      if (!razorpayOrder || !razorpayOrder.id) {
        throw new Error('Failed to create payment order');
      }

      const razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;

      await session.commitTransaction();
      
      return {
        requiresPayment: true,
        extraCharge: paymentCheck.extraCharge,
        razorpay: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        },
        razorpayKeyId
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async verifyExtraReelPayment(vendorId, paymentData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

      // Verify Razorpay payment
      const isValid = razorpayService.verifyPayment(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        throw new Error('Payment verification failed');
      }

      const subscription = await VendorSubscription.findOne({ vendorId, status: 'active' }).session(session)
        .populate('tierId');
      
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const { tierId: tier } = subscription;
      const extraCharge = tier.extraReelPrice || 10;

      // Create transaction record
      await Transaction.create([{
        transactionCode: `REEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: extraCharge,
        type: 'payment',
        status: 'completed',
        method: 'razorpay',
        vendorId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        details: {
          subscriptionId: subscription._id,
          type: 'extra_reel_payment',
          tierName: tier.name
        }
      }], { session });

      // Record payment but don't increment usage yet (will be done when reel is uploaded)
      subscription.usage.extraReelsCharged += extraCharge;
      await subscription.save({ session });

      await session.commitTransaction();
      
      return {
        success: true,
        paymentVerified: true,
        extraCharge,
        currentUsage: subscription.usage.reelsUploaded,
        limit: tier.reelLimit
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async trackReelUpload(vendorId, paymentVerified = false) {
    const subscription = await VendorSubscription.findOne({ vendorId, status: 'active' }).populate('tierId');
    if (!subscription) {
      throw new Error('No active subscription found for vendor');
    }

    const { tierId: tier } = subscription;
    
    // Check if payment is required
    const paymentCheck = await this.checkReelUploadPayment(vendorId);
    
    // If payment is required but not verified, throw error
    if (paymentCheck.requiresPayment && !paymentVerified) {
      throw new Error('Payment required for this reel upload. Please complete payment first.');
    }
    
    // Track the upload
    subscription.usage.reelsUploaded += 1;
    await subscription.save();
    
    return { 
      totalUploaded: subscription.usage.reelsUploaded, 
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
    try {
      // Total revenue from all subscription-related transactions
      const totalRevenueResult = await Transaction.aggregate([
        { 
          $match: { 
            $or: [
              { transactionCode: /^SUB-/ },
              { 'details.type': { $in: ['subscription_payment', 'upgrade_proration', 'extra_reel_charge'] } }
            ]
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalRevenue = totalRevenueResult[0]?.total || 0;

      // Active subscriptions count
      const activeSubscriptionsCount = await VendorSubscription.countDocuments({ status: 'active' });

      // Tier distribution
      const tierDistribution = await VendorSubscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$tierId', count: { $sum: 1 } } },
        { $lookup: { from: 'subscriptiontiers', localField: '_id', foreignField: '_id', as: 'tier' } },
        { $unwind: '$tier' },
        { $project: { name: '$tier.name', count: 1 } }
      ]);

      // Recent payments (last 10 subscription payments)
      const recentPayments = await Transaction.find({
        $or: [
          { transactionCode: /^SUB-/ },
          { 'details.type': { $in: ['subscription_payment', 'upgrade_proration'] } }
        ],
        status: 'completed'
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate({
          path: 'vendorId',
          select: 'businessName storeName',
          model: 'Vendor'
        })
        .lean();

      const enrichedPayments = recentPayments.map(payment => {
        const vendorName = payment.vendorId?.businessName || payment.vendorId?.storeName || 'Unknown Vendor';
        const tierName = payment.details?.tierName || 'Unknown Tier';
        return {
          id: payment._id.toString(),
          vendor: vendorName,
          amount: payment.amount,
          tier: tierName,
          date: payment.createdAt.toISOString().split('T')[0],
          status: payment.status
        };
      });

      // Revenue chart data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const revenueData = await Transaction.aggregate([
        {
          $match: {
            $or: [
              { transactionCode: /^SUB-/ },
              { 'details.type': { $in: ['subscription_payment', 'upgrade_proration'] } }
            ],
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$amount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            revenue: 1,
            orders: 1,
            _id: 0
          }
        }
      ]);

      // Calculate monthly growth (comparing last 30 days with previous 30 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const currentPeriodRevenue = await Transaction.aggregate([
        {
          $match: {
            $or: [
              { transactionCode: /^SUB-/ },
              { 'details.type': { $in: ['subscription_payment', 'upgrade_proration'] } }
            ],
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const previousPeriodRevenue = await Transaction.aggregate([
        {
          $match: {
            $or: [
              { transactionCode: /^SUB-/ },
              { 'details.type': { $in: ['subscription_payment', 'upgrade_proration'] } }
            ],
            status: 'completed',
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const currentRevenue = currentPeriodRevenue[0]?.total || 0;
      const previousRevenue = previousPeriodRevenue[0]?.total || 0;
      const monthlyGrowth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
        : '0.0';

      // Calculate churn rate (expired subscriptions in last 30 days / total active subscriptions)
      const expiredLast30Days = await VendorSubscription.countDocuments({
        status: 'expired',
        endDate: { $gte: thirtyDaysAgo }
      });
      const churnRate = activeSubscriptionsCount > 0
        ? ((expiredLast30Days / activeSubscriptionsCount) * 100).toFixed(2)
        : '0.00';

      return {
        revenue: totalRevenue,
        activeSubscriptions: activeSubscriptionsCount,
        monthlyGrowth: `+${monthlyGrowth}%`,
        churnRate: `${churnRate}%`,
        tierDistribution: tierDistribution.map(t => ({ name: t.name, count: t.count })),
        recentPayments: enrichedPayments,
        revenueData: revenueData
      };
    } catch (error) {
      console.error('Error getting subscription analytics:', error);
      throw error;
    }
  }

  async getAllVendorSubscriptions(filters = {}) {
    try {
      const { status, tierId, expiringSoon } = filters;
      
      const query = {};
      if (status) query.status = status;
      if (tierId) query.tierId = tierId;
      
      // Filter for subscriptions expiring in next 7 days
      if (expiringSoon) {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        query.endDate = { $lte: sevenDaysFromNow, $gte: new Date() };
      }

      const subscriptions = await VendorSubscription.find(query)
        .populate({
          path: 'vendorId',
          select: 'businessName storeName email',
          model: 'Vendor'
        })
        .populate({
          path: 'tierId',
          select: 'name priceMonthly reelLimit',
          model: 'SubscriptionTier'
        })
        .sort({ endDate: 1 })
        .lean();

      return subscriptions.map(sub => ({
        vendor: sub.vendorId?.businessName || sub.vendorId?.storeName || 'Unknown',
        vendorId: sub.vendorId?._id || sub.vendorId,
        status: sub.status,
        tier: sub.tierId?.name || 'Unknown',
        expiry: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : null,
        renew: sub.autoRenew,
        startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : null,
        usage: {
          reelsUploaded: sub.usage?.reelsUploaded || 0,
          extraReelsCharged: sub.usage?.extraReelsCharged || 0
        },
        subscriptionId: sub._id
      }));
    } catch (error) {
      console.error('Error getting all vendor subscriptions:', error);
      throw error;
    }
  }

  async manualSubscriptionOverride(subscriptionId, action, adminId, details = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const subscription = await VendorSubscription.findById(subscriptionId).session(session)
        .populate('tierId')
        .populate('vendorId');

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      let updatedSubscription;
      const auditLog = {
        action: `manual_override_${action}`,
        timestamp: new Date(),
        performedBy: adminId,
        details: details
      };

      switch (action) {
        case 'extend_30_days':
          const newEndDate = new Date(subscription.endDate);
          newEndDate.setDate(newEndDate.getDate() + 30);
          subscription.endDate = newEndDate;
          subscription.nextBillingDate = newEndDate;
          if (subscription.status === 'expired') {
            subscription.status = 'active';
          }
          subscription.auditLogs.push(auditLog);
          updatedSubscription = await subscription.save({ session });
          break;

        case 'extend_custom':
          const { days } = details;
          if (!days || days <= 0) {
            throw new Error('Invalid number of days');
          }
          const customEndDate = new Date(subscription.endDate);
          customEndDate.setDate(customEndDate.getDate() + parseInt(days));
          subscription.endDate = customEndDate;
          subscription.nextBillingDate = customEndDate;
          if (subscription.status === 'expired') {
            subscription.status = 'active';
          }
          subscription.auditLogs.push(auditLog);
          updatedSubscription = await subscription.save({ session });
          break;

        case 'grant_premium_trial':
          const PremiumTier = await SubscriptionTier.findOne({ name: 'Premium' }).session(session);
          if (!PremiumTier) {
            throw new Error('Premium tier not found');
          }
          
          // Deactivate current subscription
          subscription.status = 'expired';
          subscription.cancellationDate = new Date();
          subscription.auditLogs.push({
            action: 'manual_override_grant_premium_trial',
            timestamp: new Date(),
            performedBy: adminId,
            details: { previousTier: subscription.tierId.name }
          });
          await subscription.save({ session });

          // Create new premium subscription
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 30); // 30-day trial
          
          const newTrialSub = await VendorSubscription.create([{
            vendorId: subscription.vendorId,
            tierId: PremiumTier._id,
            billingCycle: 'monthly',
            startDate: new Date(),
            endDate: trialEndDate,
            paymentMethod: 'trial',
            status: 'active',
            lastPaymentDate: new Date(),
            nextBillingDate: trialEndDate,
            usage: {
              reelsUploaded: 0,
              extraReelsCharged: 0,
              lastResetDate: new Date()
            },
            auditLogs: [auditLog]
          }], { session });

          await Vendor.findByIdAndUpdate(subscription.vendorId, {
            currentSubscription: newTrialSub[0]._id
          }, { session });

          updatedSubscription = newTrialSub[0];
          break;

        case 'cancel_subscription':
          subscription.status = 'cancelled';
          subscription.cancellationDate = new Date();
          subscription.autoRenew = false;
          subscription.auditLogs.push(auditLog);
          updatedSubscription = await subscription.save({ session });
          break;

        case 'reactivate':
          if (subscription.status === 'expired' || subscription.status === 'cancelled') {
            subscription.status = 'active';
            // Extend end date if it's in the past
            if (subscription.endDate < new Date()) {
              const reactivateEndDate = new Date();
              reactivateEndDate.setMonth(reactivateEndDate.getMonth() + 1);
              subscription.endDate = reactivateEndDate;
              subscription.nextBillingDate = reactivateEndDate;
            }
            subscription.auditLogs.push(auditLog);
            updatedSubscription = await subscription.save({ session });
          } else {
            throw new Error('Subscription is already active');
          }
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      await session.commitTransaction();
      return updatedSubscription;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update auto-renewal setting for a vendor subscription
   */
  async updateAutoRenewal(vendorId, autoRenew) {
    try {
      const subscription = await VendorSubscription.findOne({
        vendorId,
        status: 'active'
      });

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      subscription.autoRenew = autoRenew;
      await subscription.save();

      return subscription;
    } catch (error) {
      console.error('Error updating auto-renewal:', error);
      throw error;
    }
  }

  /**
   * Get billing history for a vendor
   */
  async getVendorBillingHistory(vendorId, filter = 'all') {
    try {
      // Convert vendorId to ObjectId if it's a string
      const vendorObjectId = typeof vendorId === 'string' 
        ? new mongoose.Types.ObjectId(vendorId) 
        : vendorId;

      // Get all subscriptions for the vendor (including expired ones)
      const subscriptions = await VendorSubscription.find({ vendorId: vendorObjectId })
        .populate('tierId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      const billingHistory = [];

      // Process each subscription to create billing history entries
      for (const sub of subscriptions) {
        // Add subscription payment entry if payment was made
        // Check for lastPaymentDate OR if subscription was created (for free tiers)
        if (sub.lastPaymentDate || (sub.status === 'active' && sub.tierId)) {
          const amount = sub.tierId?.priceMonthly || 0;
          
          // For free tier, still show it in history but with 0 amount
          // For paid tiers, only show if payment was made
          if (amount === 0 || (amount > 0 && sub.razorpayPaymentId)) {
            billingHistory.push({
              id: sub._id.toString(),
              transactionCode: sub.razorpayOrderId || `SUB-${sub._id}`,
              amount,
              type: 'subscription_payment',
              status: sub.status === 'active' ? 'completed' : 
                      sub.status === 'expired' ? 'completed' :
                      sub.status === 'pending' ? 'pending' : 'failed',
              method: sub.paymentMethod || (amount === 0 ? 'free' : 'razorpay'),
              tierName: sub.tierId?.name || 'Unknown',
              date: sub.lastPaymentDate || sub.startDate || sub.createdAt,
              invoiceUrl: null // Can be added later if invoice generation is implemented
            });
          }
        }

        // Add renewal entries from audit logs
        if (sub.auditLogs && sub.auditLogs.length > 0) {
          for (const log of sub.auditLogs) {
            if (log.action === 'renewal' && log.details?.amount) {
              billingHistory.push({
                id: `${sub._id}-${log.timestamp}`,
                transactionCode: `RENEW-${sub._id}-${new Date(log.timestamp).getTime()}`,
                amount: log.details.amount,
                type: 'subscription_payment',
                status: log.details.status === 'success' ? 'completed' : 'failed',
                method: sub.paymentMethod || 'razorpay',
                tierName: sub.tierId?.name || 'Unknown',
                date: log.timestamp,
                invoiceUrl: null
              });
            }
          }
        }
      }

      // Sort by date (newest first)
      billingHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Apply filter
      if (filter !== 'all') {
        return billingHistory.filter(item => item.status === filter);
      }

      return billingHistory;
    } catch (error) {
      console.error('Error getting vendor billing history:', error);
      throw error;
    }
  }
}

export default new SubscriptionService();
