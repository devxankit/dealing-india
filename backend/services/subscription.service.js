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
    const currentTier = await SubscriptionTier.findById(tierId);
    if (!currentTier) {
      throw new Error('Subscription tier not found');
    }

    // Check if critical fields are changing
    const isPriceChanged = updateData.priceMonthly !== undefined && updateData.priceMonthly !== currentTier.priceMonthly;
    const isNameChanged = updateData.name !== undefined && updateData.name !== currentTier.name;

    // We create a new plan if price changes, or if name changes (to keep consistency),
    // provided the plan is not free (price > 0).
    const newPrice = updateData.priceMonthly !== undefined ? updateData.priceMonthly : currentTier.priceMonthly;

    if ((isPriceChanged || isNameChanged) && newPrice > 0) {
      const planName = updateData.name || currentTier.name;
      const description = updateData.description || currentTier.description || `Monthly subscription for ${planName}`;

      try {
        const plan = await razorpayService.createPlan({
          name: planName,
          amount: newPrice,
          currency: 'INR',
          period: 'monthly',
          interval: 1,
          description: description
        });
console.log("plan",plan)
        updateData.razorpayPlanId = plan.id;
      } catch (error) {
        console.error('Failed to create new Razorpay plan during tier update:', error);
        throw new Error(`Failed to update tier: Could not create Razorpay plan - ${error.message}`);
      }
    } else if (newPrice === 0) {
      // If updating to free, clear plan ID
      updateData.razorpayPlanId = null;
    }

    return await SubscriptionTier.findByIdAndUpdate(tierId, updateData, { new: true });
  }

  async getVendorSubscription(vendorId) {
    try {
      // Convert vendorId to ObjectId if it's a string
      const vendorObjectId = typeof vendorId === 'string'
        ? new mongoose.Types.ObjectId(vendorId)
        : vendorId;

      // First, try to get the vendor's current subscription reference
      const Vendor = (await import('../models/Vendor.model.js')).default;
      const vendor = await Vendor.findById(vendorObjectId).select('currentSubscription').lean();

      let subscription = null;

      // Priority 1: If vendor has a currentSubscription reference, ALWAYS use that
      // This ensures admin manual overrides are reflected immediately
      if (vendor?.currentSubscription) {
        subscription = await VendorSubscription.findById(vendor.currentSubscription)
          .populate({
            path: 'tierId',
            select: 'name priceMonthly reelLimit extraReelPrice features isActive'
          })
          .populate({
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .lean();

        // If subscription found via reference, return it immediately (regardless of status)
        // This ensures vendor sees admin's manual override changes
        if (subscription) {
          // B2B subscriptions have planId, regular subscriptions have tierId
          // Return if either exists (B2B vendor or regular vendor)
          if (subscription.planId || subscription.tierId) {
            return subscription;
          } else {
            // Neither planId nor tierId exists, log warning but continue to find another subscription
            console.warn(`Subscription ${subscription._id} has neither planId (B2B) nor tierId (regular), trying to find alternative`);
          }
        }
      }

      // Priority 2: Try to find active subscription
      // Note: If Priority 1 found a subscription (even if invalid), skip Priority 2
      if (!subscription || (!subscription.planId && !subscription.tierId)) {
        subscription = await VendorSubscription.findOne({
          vendorId: vendorObjectId,
          status: 'active'
        })
          .populate({
            path: 'tierId',
            select: 'name priceMonthly reelLimit extraReelPrice features isActive'
          })
          .populate({
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .sort({ createdAt: -1 }) // Get most recent
          .lean();
      }

      // Priority 3: If still no subscription, get the most recent subscription regardless of status
      // This ensures vendor sees their subscription even if admin changed status
      if (!subscription) {
        subscription = await VendorSubscription.findOne({
          vendorId: vendorObjectId
        })
          .populate({
            path: 'tierId',
            select: 'name priceMonthly reelLimit extraReelPrice features isActive'
          })
          .populate({
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .sort({ createdAt: -1 }) // Get most recent
          .lean();
      }

      // If no subscription found at all, return null (not an error)
      if (!subscription) {
        return null;
      }

      // B2B subscriptions have planId, regular subscriptions have tierId
      // Return subscription if either exists
      if (subscription.planId || subscription.tierId) {
        return subscription;
      }

      // Neither planId nor tierId exists - invalid subscription
      console.warn(`Subscription ${subscription._id} has neither planId (B2B) nor tierId (regular)`);
      return null;
    } catch (error) {
      console.error('Error in getVendorSubscription:', error);
      // Don't throw error, return null instead to allow frontend to handle gracefully
      return null;
    }
  }

  /**
   * Initialize subscription with Razorpay order (for payment)
   * NOTE: Does NOT create subscription record until payment is completed
   */
  async initializeSubscription(vendorId, tierId, io = null) {
    try {
      const tier = await SubscriptionTier.findById(tierId);
      if (!tier) throw new Error('Subscription tier not found');

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) throw new Error('Vendor not found');

      // If free tier, activate immediately
      if (tier.priceMonthly === 0) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
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
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      }

      // For paid tiers, ONLY create Razorpay order (DO NOT create subscription yet)
      // Subscription will be created only when payment is verified
      const subscriptionCode = `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create Razorpay order with metadata (vendorId, tierId) for later reference
      let razorpayOrder = null;
      let razorpayKeyId = null;

      try {
        razorpayOrder = await razorpayService.createOrder(
          tier.priceMonthly,
          'INR',
          subscriptionCode,
          {
            vendorId: vendorId.toString(),
            tierId: tierId.toString(),
            tierName: tier.name,
            type: 'subscription'
          }
        );

        razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;
      } catch (razorpayError) {
        console.error('Razorpay order creation failed:', razorpayError);
        throw new Error(`Failed to initialize payment: ${razorpayError.message}`);
      }

      // Return razorpay order details WITHOUT creating subscription
      // Subscription will be created in verifySubscriptionPayment when payment succeeds
      return {
        subscription: null, // No subscription created yet
        razorpay: razorpayOrder,
        razorpayKeyId,
        vendorId: vendorId.toString(),
        tierId: tierId.toString()
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify payment and create/activate subscription
   * Now accepts vendorId and tierId instead of subscriptionId since subscription doesn't exist yet
   */
  async verifySubscriptionPayment(vendorId, tierId, paymentData, io = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

      // Validate vendor and tier exist
      const vendor = await Vendor.findById(vendorId).session(session)
        .select('businessName storeName email phone');
      if (!vendor) throw new Error('Vendor not found');

      const tier = await SubscriptionTier.findById(tierId).session(session);
      if (!tier) throw new Error('Subscription tier not found');

      // Verify Razorpay payment signature
      const isValid = razorpayService.verifyPayment(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        throw new Error('Payment verification failed');
      }

      // Get payment details from Razorpay to confirm payment status
      let paymentDetails;
      try {
        paymentDetails = await razorpayService.getPaymentDetails(razorpayPaymentId);
      } catch (error) {
        console.error('Error fetching payment details:', error);
        throw new Error('Failed to verify payment with payment gateway');
      }

      // Check if payment is actually successful
      if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
        // Payment failed - create subscription with 'failed' status for tracking
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const failedSubscription = await VendorSubscription.create([{
          vendorId,
          tierId,
          billingCycle: 'monthly',
          startDate,
          endDate,
          paymentMethod: 'razorpay',
          status: 'failed', // Mark as failed
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          usage: {
            reelsUploaded: 0,
            extraReelsCharged: 0,
            lastResetDate: startDate
          },
          auditLogs: [{
            action: 'subscription_payment',
            timestamp: new Date(),
            details: {
              amount: tier.priceMonthly,
              status: 'failed',
              razorpayOrderId,
              razorpayPaymentId,
              razorpaySignature,
              type: 'subscription_payment',
              tierName: tier.name,
              paymentDate: new Date(),
              failureReason: `Payment status: ${paymentDetails.status}`
            }
          }]
        }], { session });

        await session.commitTransaction();
        throw new Error('Payment not successful. Payment status: ' + paymentDetails.status);
      }

      // Payment successful - create subscription with 'active' status
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const subscription = await VendorSubscription.create([{
        vendorId,
        tierId,
        billingCycle: 'monthly',
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        status: 'active', // Activate immediately since payment succeeded
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        lastPaymentDate: new Date(),
        nextBillingDate: endDate,
        usage: {
          reelsUploaded: 0,
          extraReelsCharged: 0,
          lastResetDate: startDate
        }
      }], { session });

      // Update vendor's current subscription
      await Vendor.findByIdAndUpdate(vendorId, {
        currentSubscription: subscription[0]._id
      }, { session });

      // Add audit log entry for subscription payment (for billing history)
      const amount = tier.priceMonthly;
      if (amount > 0) {
        subscription[0].auditLogs.push({
          action: 'subscription_payment',
          timestamp: new Date(),
          details: {
            amount,
            status: 'completed',
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            type: 'subscription_payment',
            tierName: tier.name,
            paymentDate: new Date()
          }
        });
        await subscription[0].save({ session });
      }

      // Send notification to admin
      try {
        const vendorName = vendor.businessName || vendor.storeName || 'A vendor';
        const tierName = tier.name || 'Unknown Plan';
        const adminNotification = {
          recipientType: 'admin',
          type: 'payment_success',
          title: 'New Subscription Payment',
          message: `${vendorName} has subscribed to ${tierName} plan (₹${amount})`,
          metadata: {
            subscriptionId: subscription[0]._id,
            vendorId: vendorId,
            tierName: tierName,
            amount,
            type: 'subscription'
          },
          actionUrl: `/admin/subscriptions/${subscription[0]._id}`
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

      // Populate the subscription before returning
      const populatedSubscription = await VendorSubscription.findById(subscription[0]._id)
        .populate('tierId')
        .populate({
          path: 'vendorId',
          select: 'businessName storeName email phone'
        });

      return populatedSubscription;
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

      // Note: Transaction model is for customer orders, not vendor subscriptions
      // We track vendor subscription payments via VendorSubscription model and audit logs
      // No need to create Transaction record for vendor subscriptions

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
      // createOrder expects amount in rupees, it will convert to paise internally
      const razorpayOrder = await razorpayService.createOrder(
        paymentCheck.extraCharge, // Pass amount in rupees (e.g., 10 for ₹10)
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

      // Add audit log entry for extra reel payment (for billing history)
      // This is the primary way we track extra reel payments - don't overwrite subscription payment fields
      subscription.auditLogs.push({
        action: 'extra_reel_payment',
        timestamp: new Date(),
        details: {
          amount: extraCharge,
          status: 'completed',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          type: 'extra_reel_charge',
          paymentDate: new Date()
        }
      });

      // Update last payment date (but don't overwrite subscription payment IDs)
      subscription.lastPaymentDate = new Date();

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

      // Note: Transaction model is for customer orders, not vendor subscriptions
      // Track upgrade payment via audit logs instead
      if (chargeAmount > 0) {
        newSub[0].auditLogs.push({
          action: 'upgrade_payment',
          timestamp: new Date(),
          details: {
            amount: chargeAmount,
            status: 'completed',
            type: 'upgrade_proration',
            tierName: newTier.name,
            previousTierName: currentSub.tierId?.name || 'Unknown',
            paymentDate: new Date()
          }
        });
        await newSub[0].save({ session });
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
      // Total revenue from subscription transactions (VendorSubscription audit logs)
      // Transaction model is for customer orders, not vendor subscriptions
      const subscriptionRevenueResult = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$auditLogs.details.amount' }
          }
        }
      ]);
      const subscriptionRevenue = subscriptionRevenueResult[0]?.total || 0;

      // Total revenue from extra reel payments (VendorSubscription audit logs)
      const extraReelRevenueResult = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': 'extra_reel_payment',
            'auditLogs.details.status': 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$auditLogs.details.amount' }
          }
        }
      ]);
      const extraReelRevenue = extraReelRevenueResult[0]?.total || 0;

      // Total revenue = only subscription revenue (reel plan subscription, not extra reel charges)
      const totalRevenue = subscriptionRevenue;

      // Total orders: count of subscription payments (plans purchased)
      const totalOrdersResult = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed'
          }
        },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);
      const totalOrders = totalOrdersResult[0]?.count || 0;

      // Total customers: count of unique vendors with active subscriptions (regular plans)
      const totalCustomersResult = await VendorSubscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$vendorId' } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);
      const totalCustomers = totalCustomersResult[0]?.count || 0;

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

      // Recent payments (last 10 subscription payments from VendorSubscription audit logs)
      // Transaction model is for customer orders, not vendor subscriptions
      const recentSubscriptionPayments = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed'
          }
        },
        { $sort: { 'auditLogs.timestamp': -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'subscriptiontiers',
            localField: 'tierId',
            foreignField: '_id',
            as: 'tier'
          }
        },
        { $unwind: { path: '$tier', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: { $toString: '$_id' },
            vendorId: { $toString: '$vendorId' },
            vendorName: { $ifNull: ['$vendor.businessName', '$vendor.storeName'] },
            amount: '$auditLogs.details.amount',
            tierName: { $ifNull: ['$tier.name', '$auditLogs.details.tierName', 'Unknown'] },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' } },
            status: '$auditLogs.details.status',
            type: '$auditLogs.details.type',
            timestamp: '$auditLogs.timestamp',
            razorpayOrderId: '$auditLogs.details.razorpayOrderId'
          }
        }
      ]);

      // Recent extra reel payments (from VendorSubscription audit logs)
      const recentExtraReelPayments = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': 'extra_reel_payment',
            'auditLogs.details.status': 'completed'
          }
        },
        { $sort: { 'auditLogs.timestamp': -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'subscriptiontiers',
            localField: 'tierId',
            foreignField: '_id',
            as: 'tier'
          }
        },
        { $unwind: { path: '$tier', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: { $toString: '$_id' },
            vendorName: { $ifNull: ['$vendor.businessName', '$vendor.storeName'] },
            amount: '$auditLogs.details.amount',
            tierName: { $ifNull: ['$tier.name', 'Unknown'] },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' } },
            status: '$auditLogs.details.status',
            type: 'extra_reel_charge',
            timestamp: '$auditLogs.timestamp'
          }
        }
      ]);

      // Format subscription payments from audit logs
      const enrichedSubscriptionPayments = recentSubscriptionPayments.map(payment => ({
        id: payment._id,
        vendor: payment.vendorName || 'Unknown Vendor',
        amount: payment.amount,
        tier: payment.tierName,
        date: payment.date,
        status: payment.status,
        type: payment.type || 'subscription_payment',
        timestamp: payment.timestamp
      }));

      const enrichedExtraReelPayments = recentExtraReelPayments.map(payment => ({
        id: payment.id,
        vendor: payment.vendorName || 'Unknown Vendor',
        amount: payment.amount,
        tier: payment.tierName,
        date: payment.date,
        status: payment.status,
        type: payment.type,
        timestamp: payment.timestamp
      }));

      // Combine and sort by timestamp (newest first)
      const allRecentPayments = [...enrichedSubscriptionPayments, ...enrichedExtraReelPayments]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
        .map(({ timestamp, ...rest }) => rest); // Remove timestamp from final output

      // Revenue chart data (last 30 days) - includes both subscription and extra reel payments
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Subscription revenue data (from VendorSubscription audit logs)
      const subscriptionRevenueData = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' }
            },
            revenue: { $sum: '$auditLogs.details.amount' },
            orders: { $sum: 1 }
          }
        },
        {
          $project: {
            date: '$_id',
            revenue: 1,
            orders: 1,
            _id: 0
          }
        }
      ]);

      // Extra reel revenue data
      const extraReelRevenueData = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': 'extra_reel_payment',
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' }
            },
            revenue: { $sum: '$auditLogs.details.amount' },
            orders: { $sum: 1 }
          }
        },
        {
          $project: {
            date: '$_id',
            revenue: 1,
            orders: 1,
            _id: 0
          }
        }
      ]);

      // Combine and merge revenue data by date
      const revenueMap = new Map();

      subscriptionRevenueData.forEach(item => {
        revenueMap.set(item.date, {
          date: item.date,
          revenue: item.revenue,
          orders: item.orders
        });
      });

      extraReelRevenueData.forEach(item => {
        if (revenueMap.has(item.date)) {
          const existing = revenueMap.get(item.date);
          existing.revenue += item.revenue;
          existing.orders += item.orders;
        } else {
          revenueMap.set(item.date, {
            date: item.date,
            revenue: item.revenue,
            orders: item.orders
          });
        }
      });

      const revenueData = Array.from(revenueMap.values()).sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );

      // Calculate monthly growth (comparing last 30 days with previous 30 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // Current period: subscription + extra reel payments (from VendorSubscription audit logs)
      const currentPeriodSubscriptionRevenue = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' } } }
      ]);

      const currentPeriodExtraReelRevenue = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': 'extra_reel_payment',
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' } } }
      ]);

      // Previous period: subscription + extra reel payments (from VendorSubscription audit logs)
      const previousPeriodSubscriptionRevenue = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' } } }
      ]);

      const previousPeriodExtraReelRevenue = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': 'extra_reel_payment',
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' } } }
      ]);

      const currentRevenue = (currentPeriodSubscriptionRevenue[0]?.total || 0) +
        (currentPeriodExtraReelRevenue[0]?.total || 0);
      const previousRevenue = (previousPeriodSubscriptionRevenue[0]?.total || 0) +
        (previousPeriodExtraReelRevenue[0]?.total || 0);
      const monthlyGrowth = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
        : '0.0';

      // Calculate revenue change percentage
      const revenueChange = previousRevenue > 0
        ? parseFloat(((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1))
        : 0;

      // Calculate orders change (current period vs previous period)
      const currentPeriodOrders = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);
      const currentOrders = currentPeriodOrders[0]?.count || 0;

      const previousPeriodOrders = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);
      const previousOrders = previousPeriodOrders[0]?.count || 0;
      const ordersChange = previousOrders > 0
        ? parseFloat(((currentOrders - previousOrders) / previousOrders * 100).toFixed(1))
        : 0;

      // Calculate customers change (current active vs previous period active)
      const previousPeriodCustomers = await VendorSubscription.aggregate([
        {
          $match: {
            status: 'active',
            startDate: { $lt: thirtyDaysAgo }
          }
        },
        { $group: { _id: '$vendorId' } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);
      const previousCustomers = previousPeriodCustomers[0]?.count || 0;
      const customersChange = previousCustomers > 0
        ? parseFloat(((totalCustomers - previousCustomers) / previousCustomers * 100).toFixed(1))
        : 0;

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
        totalRevenue: totalRevenue, // For StatsCards component
        totalOrders: totalOrders, // For StatsCards component
        totalCustomers: totalCustomers, // For StatsCards component
        revenueChange: revenueChange, // Percentage change
        ordersChange: ordersChange, // Percentage change
        customersChange: customersChange, // Percentage change
        activeSubscriptions: activeSubscriptionsCount,
        monthlyGrowth: `+${monthlyGrowth}%`,
        churnRate: `${churnRate}%`,
        tierDistribution: tierDistribution.map(t => ({ name: t.name, count: t.count })),
        recentPayments: allRecentPayments,
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
    // Validate subscriptionId format
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      throw new Error('Subscription ID is required and must be a string');
    }

    // Trim whitespace
    const trimmedId = subscriptionId.trim();

    if (!mongoose.Types.ObjectId.isValid(trimmedId)) {
      throw new Error(`Invalid subscription ID format. Expected a 24-character hexadecimal string, got: ${trimmedId.substring(0, 20)}...`);
    }

    // Validate adminId format
    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error('Invalid admin ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const subscription = await VendorSubscription.findById(subscriptionId).session(session)
        .populate('tierId')
        .populate('vendorId');

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Validate subscription has required fields
      if (!subscription.endDate) {
        throw new Error('Subscription end date is missing');
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
          if (!subscription.endDate) {
            throw new Error('Subscription end date is required for extension');
          }
          const newEndDate = new Date(subscription.endDate);
          newEndDate.setDate(newEndDate.getDate() + 30);
          subscription.endDate = newEndDate;
          subscription.nextBillingDate = newEndDate;
          if (subscription.status === 'expired') {
            subscription.status = 'active';
          }
          subscription.auditLogs.push(auditLog);
          updatedSubscription = await subscription.save({ session });

          // Update vendor's currentSubscription reference to ensure it's up to date
          const vendorIdForExtend = subscription.vendorId?._id || subscription.vendorId;
          if (vendorIdForExtend && mongoose.Types.ObjectId.isValid(vendorIdForExtend)) {
            await Vendor.findByIdAndUpdate(vendorIdForExtend, {
              currentSubscription: subscription._id
            }, { session });
          }
          break;

        case 'extend_custom':
          const { days } = details;
          if (!days || isNaN(days) || parseInt(days) <= 0) {
            throw new Error('Invalid number of days. Please provide a positive number.');
          }
          const daysToAdd = parseInt(days);
          const customEndDate = new Date(subscription.endDate);
          customEndDate.setDate(customEndDate.getDate() + daysToAdd);
          subscription.endDate = customEndDate;
          subscription.nextBillingDate = customEndDate;
          if (subscription.status === 'expired') {
            subscription.status = 'active';
          }
          subscription.auditLogs.push(auditLog);
          updatedSubscription = await subscription.save({ session });

          // Update vendor's currentSubscription reference
          const vendorIdForCustom = subscription.vendorId?._id || subscription.vendorId;
          if (vendorIdForCustom && mongoose.Types.ObjectId.isValid(vendorIdForCustom)) {
            await Vendor.findByIdAndUpdate(vendorIdForCustom, {
              currentSubscription: subscription._id
            }, { session });
          }
          break;

        case 'grant_premium_trial':
          const PremiumTier = await SubscriptionTier.findOne({ name: 'Premium' }).session(session);
          if (!PremiumTier) {
            throw new Error('Premium tier not found');
          }

          // Get previous tier name safely
          const previousTierName = subscription.tierId?.name || subscription.tierId?.toString() || 'Unknown';

          // Deactivate current subscription
          subscription.status = 'expired';
          subscription.cancellationDate = new Date();
          subscription.auditLogs.push({
            action: 'manual_override_grant_premium_trial',
            timestamp: new Date(),
            performedBy: adminId,
            details: { previousTier: previousTierName }
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

          // Update vendor's current subscription reference
          const vendorIdValue = subscription.vendorId?._id || subscription.vendorId;
          if (vendorIdValue && mongoose.Types.ObjectId.isValid(vendorIdValue)) {
            await Vendor.findByIdAndUpdate(vendorIdValue, {
              currentSubscription: newTrialSub[0]._id
            }, { session });
          }

          updatedSubscription = newTrialSub[0];
          break;

        case 'cancel_subscription':
          subscription.status = 'cancelled';
          subscription.cancellationDate = new Date();
          subscription.autoRenew = false;
          subscription.auditLogs.push(auditLog);
          updatedSubscription = await subscription.save({ session });

          // Update vendor's currentSubscription reference to ensure vendor sees the cancellation
          const vendorIdForCancel = subscription.vendorId?._id || subscription.vendorId;
          if (vendorIdForCancel && mongoose.Types.ObjectId.isValid(vendorIdForCancel)) {
            await Vendor.findByIdAndUpdate(vendorIdForCancel, {
              currentSubscription: subscription._id
            }, { session });
          }
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

            // Update vendor's currentSubscription reference
            const vendorIdForReactivate = subscription.vendorId?._id || subscription.vendorId;
            if (vendorIdForReactivate && mongoose.Types.ObjectId.isValid(vendorIdForReactivate)) {
              await Vendor.findByIdAndUpdate(vendorIdForReactivate, {
                currentSubscription: subscription._id
              }, { session });
            }
          } else {
            throw new Error('Subscription is already active');
          }
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // IMPORTANT: Always update vendor's currentSubscription reference after any manual override
      // This ensures vendor sees the changes immediately
      const vendorIdForUpdate = subscription.vendorId?._id || subscription.vendorId;
      if (vendorIdForUpdate && mongoose.Types.ObjectId.isValid(vendorIdForUpdate)) {
        await Vendor.findByIdAndUpdate(vendorIdForUpdate, {
          currentSubscription: updatedSubscription._id
        }, { session });
      }

      await session.commitTransaction();

      // Populate the returned subscription for better response
      const populatedSubscription = await VendorSubscription.findById(updatedSubscription._id)
        .populate('tierId', 'name priceMonthly reelLimit')
        .populate('vendorId', 'businessName storeName email')
        .lean();

      return populatedSubscription || updatedSubscription;
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in manualSubscriptionOverride:', error);
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
      // Use lean() for better performance - auditLogs are included in lean() results
      const subscriptions = await VendorSubscription.find({ vendorId: vendorObjectId })
        .populate('tierId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      // Process subscriptions and ensure auditLogs are properly formatted
      const subscriptionsData = subscriptions.map(sub => {
        // Ensure auditLogs is an array (lean() preserves arrays)
        const auditLogs = Array.isArray(sub.auditLogs) ? sub.auditLogs : [];

        return {
          ...sub,
          auditLogs: auditLogs.map(log => {
            // Ensure log is a plain object with required fields
            if (log && typeof log === 'object') {
              return {
                action: log.action,
                timestamp: log.timestamp,
                details: log.details || {}
              };
            }
            return log;
          })
        };
      });

      const billingHistory = [];

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Billing History] Found ${subscriptionsData.length} subscriptions for vendor ${vendorId}`);
      }

      // Process each subscription to create billing history entries
      for (const sub of subscriptionsData) {
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

        // Add entries from audit logs (renewals and extra reel payments)
        // Ensure auditLogs is an array and iterate through it
        const auditLogs = Array.isArray(sub.auditLogs) ? sub.auditLogs : [];

        if (auditLogs.length > 0) {
          for (const log of auditLogs) {
            // Skip if log is null or undefined
            if (!log || !log.action) continue;

            // Debug logging for extra reel payments
            if (log.action === 'extra_reel_payment') {
              console.log(`[Billing History] Processing extra_reel_payment log:`, {
                hasDetails: !!log.details,
                detailsType: typeof log.details,
                amount: log.details?.amount,
                status: log.details?.status,
                timestamp: log.timestamp
              });
            }

            // Renewal entries
            if (log.action === 'renewal' && log.details && typeof log.details === 'object' && log.details.amount) {
              const renewalDate = log.timestamp instanceof Date
                ? log.timestamp
                : new Date(log.timestamp);

              billingHistory.push({
                id: `${sub._id}-renewal-${renewalDate.getTime()}`,
                transactionCode: `RENEW-${sub._id}-${renewalDate.getTime()}`,
                amount: log.details.amount,
                type: 'subscription_payment',
                status: log.details.status === 'success' ? 'completed' : 'failed',
                method: sub.paymentMethod || 'razorpay',
                tierName: sub.tierId?.name || 'Unknown',
                date: renewalDate,
                invoiceUrl: null
              });
            }

            // Subscription payment entries (initial payment)
            if (log.action === 'subscription_payment' && log.details && typeof log.details === 'object' && log.details.amount) {
              const paymentDate = log.timestamp instanceof Date
                ? log.timestamp
                : (log.details.paymentDate instanceof Date
                  ? log.details.paymentDate
                  : new Date(log.timestamp));

              billingHistory.push({
                id: `${sub._id}-payment-${paymentDate.getTime()}`,
                transactionCode: log.details.razorpayOrderId || `SUB-${sub._id}-${paymentDate.getTime()}`,
                amount: log.details.amount,
                type: 'subscription_payment',
                status: log.details.status === 'completed' ? 'completed' : 'failed',
                method: sub.paymentMethod || 'razorpay',
                tierName: log.details.tierName || sub.tierId?.name || 'Unknown',
                date: paymentDate,
                invoiceUrl: null
              });
            }

            // Upgrade payment entries
            if (log.action === 'upgrade_payment' && log.details && typeof log.details === 'object' && log.details.amount) {
              const upgradeDate = log.timestamp instanceof Date
                ? log.timestamp
                : (log.details.paymentDate instanceof Date
                  ? log.details.paymentDate
                  : new Date(log.timestamp));

              billingHistory.push({
                id: `${sub._id}-upgrade-${upgradeDate.getTime()}`,
                transactionCode: `UPGRADE-${sub._id}-${upgradeDate.getTime()}`,
                amount: log.details.amount,
                type: 'upgrade_proration',
                status: log.details.status === 'completed' ? 'completed' : 'failed',
                method: sub.paymentMethod || 'razorpay',
                tierName: log.details.tierName || sub.tierId?.name || 'Unknown',
                date: upgradeDate,
                invoiceUrl: null
              });
            }

            // Extra reel payment entries - check for details object and amount
            if (log.action === 'extra_reel_payment') {
              // Check if details exists - handle both object and stringified JSON
              let details = log.details;

              // If details is a string, try to parse it
              if (typeof details === 'string') {
                try {
                  details = JSON.parse(details);
                } catch (e) {
                  console.log(`[Billing History] Failed to parse details string:`, e);
                  details = null;
                }
              }

              const hasDetails = details && typeof details === 'object';
              // Get amount - check multiple possible locations
              const amount = hasDetails
                ? (details.amount !== undefined && details.amount !== null ? details.amount : null)
                : null;

              // Debug logging (only in development)
              if (process.env.NODE_ENV === 'development') {
                console.log(`[Billing History] Processing extra_reel_payment:`, {
                  hasDetails,
                  detailsType: typeof log.details,
                  amount,
                  amountType: typeof amount
                });
              }

              if (hasDetails && amount !== null && amount !== undefined && !isNaN(amount)) {
                // Ensure timestamp is a Date object
                const paymentDate = log.timestamp instanceof Date
                  ? log.timestamp
                  : (details.paymentDate instanceof Date
                    ? details.paymentDate
                    : new Date(log.timestamp));

                // Debug logging (only in development)
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Billing History] ✓ Adding extra reel payment to billing history:`, {
                    amount,
                    date: paymentDate,
                    status: details.status
                  });
                }

                billingHistory.push({
                  id: `${sub._id}-extra-reel-${paymentDate.getTime()}`,
                  transactionCode: details.razorpayOrderId || `REEL-${sub._id}-${paymentDate.getTime()}`,
                  amount: Number(amount),
                  type: 'extra_reel_charge',
                  status: details.status === 'completed' ? 'completed' : 'failed',
                  method: 'razorpay',
                  tierName: sub.tierId?.name || 'Unknown',
                  date: paymentDate,
                  invoiceUrl: null
                });
              } else if (process.env.NODE_ENV === 'development') {
                console.log(`[Billing History] ✗ Skipping extra_reel_payment - validation failed:`, {
                  hasDetails,
                  amount,
                  isNaN: isNaN(amount)
                });
              }
            }
          }
        }

        // Extra reel payments are tracked via audit logs, so no need for additional checks here
      }

      // Sort by date (newest first)
      billingHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Billing History] Final billing history count: ${billingHistory.length}`);
        const extraReelCount = billingHistory.filter(item => item.type === 'extra_reel_charge').length;
        console.log(`[Billing History] Extra reel charges in history: ${extraReelCount}`);
      }

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
