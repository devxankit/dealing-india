import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Vendor from '../models/Vendor.model.js';

import razorpayService from './razorpay.service.js';
import NotificationService from './notification.service.js';
import zohoBooksService from './zohoBooks.service.js';
import { sendPaymentSuccessEmail, sendPaymentCancelledEmail } from './email.service.js';
import mongoose from 'mongoose';

const GST_RATE = 0.18;

class SubscriptionService {
  async getAllPlans(includeInactive = false) {
    try {
      const query = includeInactive ? {} : { isActive: true };
      const plans = await B2BSubscriptionPlan.find(query).sort({ price: 1 }).lean();
      return plans;
    } catch (error) {
      console.error('Error getting all plans:', error);
      throw error;
    }
  }

  async getVendorSubscription(vendorId) {
    try {
      const vendorObjectId = typeof vendorId === 'string'
        ? new mongoose.Types.ObjectId(vendorId)
        : vendorId;

      const VendorModel = (await import('../models/Vendor.model.js')).default;
      const vendor = await VendorModel.findById(vendorObjectId).select('currentSubscription').lean();

      let subscription = null;

      if (vendor?.currentSubscription) {
        subscription = await VendorSubscription.findById(vendor.currentSubscription)
          .populate({
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .lean();

        if (subscription && subscription.planId) {
          return subscription;
        }
      }

      if (!subscription || !subscription.planId) {
        subscription = await VendorSubscription.findOne({
          vendorId: vendorObjectId,
          status: 'active'
        })
          .populate({
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .sort({ createdAt: -1 })
          .lean();
      }

      if (!subscription) {
        subscription = await VendorSubscription.findOne({
          vendorId: vendorObjectId
        })
          .populate({
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .sort({ createdAt: -1 })
          .lean();
      }

      if (subscription && subscription.planId) {
        return subscription;
      }

      return null;
    } catch (error) {
      console.error('Error in getVendorSubscription:', error);
      return null;
    }
  }

  async initializeSubscription(vendorId, planId, io = null) {
    try {
      const plan = await B2BSubscriptionPlan.findById(planId);
      if (!plan) throw new Error('Subscription plan not found');

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) throw new Error('Vendor not found');

      const planPrice = plan.price;
      const planName = plan.name;

      if (planPrice === 0) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

          const subscriptionData = {
            vendorId,
            planId,
            billingCycle: 'yearly',
            startDate,
            endDate,
            paymentMethod: 'free',
            status: 'active',
            lastPaymentDate: startDate,
            nextBillingDate: endDate,
            usage: {
              lastResetDate: startDate
            }
          };

          const subscription = await VendorSubscription.create([subscriptionData], { session });

          await Vendor.findByIdAndUpdate(vendorId, {
            currentSubscription: subscription[0]._id
          }, { session });

          await session.commitTransaction();

          // Notify admins about free subscription
          try {
            await NotificationService.sendBulkNotification({
              type: 'payment_success',
              title: 'Vendor Subscription Purchase',
              message: 'Vendor has purchased a subscription plan.',
              actionUrl: `/admin/b2b-vendors/subscriptions`,
              metadata: {
                vendorId: vendorId.toString(),
                vendorName: vendor?.businessName || vendor?.storeName || 'A vendor',
                planName: planName,
                amount: 0,
                type: 'free_subscription'
              }
            }, 'admins');
          } catch (notifError) {
            console.error('Failed to notify admins about free subscription:', notifError);
          }

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

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

      const subscriptionCode = `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const gstAmount = Math.round(planPrice * GST_RATE);
      const totalAmount = planPrice + gstAmount;

      const pendingSubscriptionData = {
        vendorId,
        planId,
        billingCycle: 'yearly',
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        status: 'pending',
        basePrice: planPrice,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        usage: {
          lastResetDate: startDate
        }
      };

      const subscription = await VendorSubscription.create(pendingSubscriptionData);

      let razorpayOrder = await razorpayService.createOrder(
        totalAmount,
        'INR',
        subscriptionCode,
        {
          vendorId: vendorId.toString(),
          planId: planId.toString(),
          subscriptionId: subscription._id.toString(),
          planName: planName,
          basePrice: planPrice.toString(),
          gstAmount: gstAmount.toString(),
          totalAmount: totalAmount.toString(),
          type: 'subscription',
          isB2B: 'true'
        }
      );

      return {
        subscription,
        razorpay: razorpayOrder,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
        vendorId: vendorId.toString(),
        planId: planId.toString(),
        isB2B: true
      };
    } catch (error) {
      console.error('Initialize Subscription Error:', error);
      throw error;
    }
  }

  async verifySubscriptionPayment(vendorId, planId, paymentData, io = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

      const vendor = await Vendor.findById(vendorId).session(session);
      if (!vendor) throw new Error('Vendor not found');

      const plan = await B2BSubscriptionPlan.findById(planId).session(session);
      if (!plan) throw new Error('Subscription plan not found');

      const planPrice = plan.price;
      const planName = plan.name;
      const gstAmount = Math.round(planPrice * GST_RATE);
      const totalAmount = planPrice + gstAmount;

      const isValid = razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) throw new Error('Payment verification failed');

      let paymentDetails = await razorpayService.getPaymentDetails(razorpayPaymentId);
      const paymentStatus = paymentDetails.status;

      if (paymentStatus !== 'captured' && paymentStatus !== 'authorized' && paymentStatus !== 'created') {
        // Handle failure structurally
        const [failedSub] = await VendorSubscription.create([{
          vendorId,
          planId,
          billingCycle: 'yearly',
          startDate: new Date(),
          endDate: new Date(),
          paymentMethod: 'razorpay',
          status: 'failed',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          auditLogs: [{
            action: 'subscription_payment',
            timestamp: new Date(),
            details: { amount: planPrice, status: 'failed', planName, failureReason: `Status: ${paymentStatus}` }
          }]
        }], { session });

        await session.commitTransaction();

        // Background cancellation email
        (async () => {
          try {
            await sendPaymentCancelledEmail({
              to: vendor.email,
              amount: planPrice,
              planName,
              title: planName,
              paymentFor: 'subscription',
              paymentDate: new Date(),
              transactionId: razorpayPaymentId,
              referenceId: `SUB-${planId}-${razorpayOrderId}`,
              paymentMethod: 'razorpay',
              vendor: { name: vendor.businessName || vendor.storeName || 'Vendor', email: vendor.email, phone: vendor.phone }
            });
          } catch (e) {
            console.error('Failed to send cancellation email:', e.message);
          }
        })();

        throw new Error('Payment not successful. Status: ' + paymentStatus);
      }

      // Success Path
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

      const activeSubscriptionData = {
        vendorId,
        planId,
        billingCycle: 'yearly',
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        status: 'active',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        lastPaymentDate: new Date(),
        nextBillingDate: endDate,
        basePrice: planPrice,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        usage: { lastResetDate: startDate }
      };

      const subscription = await VendorSubscription.create([activeSubscriptionData], { session });

      await Vendor.findByIdAndUpdate(vendorId, {
        currentSubscription: subscription[0]._id
      }, { session });

      if (planPrice > 0) {
        subscription[0].auditLogs.push({
          action: 'subscription_payment',
          timestamp: new Date(),
          details: { amount: planPrice, status: 'completed', razorpayOrderId, razorpayPaymentId, planName, paymentDate: new Date() }
        });
        await subscription[0].save({ session });
      }

      // Admin notification
      try {
        const Admin = (await import('../models/Admin.model.js')).default;
        const admins = await Admin.find({ isActive: true }).select('_id');
        const notifications = admins.map(admin => ({
          recipientType: 'admin',
          recipientId: admin._id,
          type: 'payment_success',
          title: 'Vendor Subscription Purchase',
          message: 'Vendor has purchased a subscription plan.',
          metadata: { subscriptionId: subscription[0]._id, vendorId, planName, amount: planPrice, type: 'subscription' },
          actionUrl: `/admin/subscriptions/${subscription[0]._id}`
        }));
        await NotificationService.createBulkNotifications(notifications, io);
      } catch (notifError) {
        console.error('Error sending admin notification:', notifError);
      }

      await session.commitTransaction();

      // Trigger Zoho + Email integration helper (Async)
      this.processZohoAndEmailForSubscription(subscription[0]._id).catch(err => {
        console.error('[SubPay][Centralized] background integration error:', err);
      });

      return await VendorSubscription.findById(subscription[0]._id).populate('planId').populate('vendorId').lean();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async subscribeVendor(vendorId, planId, billingCycle, paymentMethod) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const plan = await B2BSubscriptionPlan.findById(planId).session(session);
      if (!plan) throw new Error('Plan not found');

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

      const subscription = await VendorSubscription.create([{
        vendorId,
        planId,
        billingCycle: billingCycle || 'yearly',
        startDate,
        endDate,
        paymentMethod,
        status: 'active',
        lastPaymentDate: startDate,
        nextBillingDate: endDate,
        usage: { lastResetDate: startDate }
      }], { session });

      await Vendor.findByIdAndUpdate(vendorId, { currentSubscription: subscription[0]._id }, { session });
      await session.commitTransaction();
      return subscription[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async upgradeSubscription(vendorId, newPlanId, billingCycle = 'monthly') {
    const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' }).populate('planId');
    if (!currentSub) throw new Error('No active subscription found');
    const newPlan = await B2BSubscriptionPlan.findById(newPlanId);
    if (!newPlan) throw new Error('New plan not found');

    const now = new Date();
    const remainingTime = currentSub.endDate - now;
    const totalTime = currentSub.endDate - currentSub.startDate;
    const remainingRatio = Math.max(0, remainingTime / totalTime);
    const unusedAmount = (currentSub.planId?.price || 0) * remainingRatio;
    const chargeAmount = Math.max(0, newPlan.price - unusedAmount);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      currentSub.status = 'expired';
      currentSub.cancellationDate = now;
      await currentSub.save({ session });

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (newPlan.duration || 12));

      const [newSub] = await VendorSubscription.create([{
        vendorId,
        planId: newPlanId,
        billingCycle: billingCycle || 'yearly',
        startDate: now,
        endDate,
        status: 'active',
        paymentMethod: currentSub.paymentMethod,
        lastPaymentDate: now,
        nextBillingDate: endDate,
        usage: { lastResetDate: now },
        auditLogs: [{
          action: 'upgrade',
          timestamp: new Date(),
          details: { fromPlan: currentSub.planId?.name || 'Unknown', toPlan: newPlan.name, proratedCharge: chargeAmount }
        }]
      }], { session });

      await Vendor.findByIdAndUpdate(vendorId, { currentSubscription: newSub._id }, { session });

      if (chargeAmount > 0) {
        newSub.auditLogs.push({
          action: 'upgrade_payment',
          timestamp: new Date(),
          details: { amount: chargeAmount, status: 'completed', type: 'upgrade_proration', planName: newPlan.name, paymentDate: new Date() }
        });
        await newSub.save({ session });
      }

      await session.commitTransaction();
      return newSub;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async initializeB2BUpgrade(vendorId, newPlanId) {
    try {
      const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' }).populate('planId');
      if (!currentSub) throw new Error('No active subscription found to upgrade');

      const newPlan = await B2BSubscriptionPlan.findById(newPlanId);
      if (!newPlan) throw new Error('New plan not found');

      const getRank = (name) => {
        const n = (name || '').toLowerCase();
        if (n.includes('gold')) return 5;
        if (n.includes('premium')) return 4;
        if (n.includes('diamond')) return 3;
        if (n.includes('silver')) return 2;
        if (n.includes('basic')) return 1;
        return 0;
      };

      if (getRank(newPlan.name) <= getRank(currentSub.planId.name)) {
        throw new Error('Downgrade not allowed. You can change plan after expiry.');
      }

      const today = new Date();
      const currentEndDate = new Date(currentSub.endDate);
      const currentStartDate = new Date(currentSub.startDate);
      const totalDays = Math.max(1, Math.ceil((currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24)));
      const remainingDays = Math.max(0, Math.ceil((currentEndDate - today) / (1000 * 60 * 60 * 24)));
      const credit = ((currentSub.planId.price || 0) / totalDays) * remainingDays;
      let finalBaseAmount = newPlan.price - credit;
      if (finalBaseAmount < 0) finalBaseAmount = 0;

      const gstAmount = Math.round(finalBaseAmount * GST_RATE);
      const finalTotalAmount = Math.round(finalBaseAmount + gstAmount);

      const upgradeCode = `UPG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const razorpayOrder = await razorpayService.createOrder(
        finalTotalAmount,
        'INR',
        upgradeCode,
        { 
          vendorId: vendorId.toString(), 
          newPlanId: newPlanId.toString(), 
          currentSubId: currentSub._id.toString(), 
          basePrice: Math.round(finalBaseAmount).toString(),
          gstAmount: gstAmount.toString(),
          totalAmount: finalTotalAmount.toString(),
          type: 'subscription_upgrade', 
          isB2B: 'true' 
        }
      );

      return {
        success: true,
        currentPlan: currentSub.planId.name,
        newPlan: newPlan.name,
        remainingDays,
        credit: Math.round(credit),
        newPlanPrice: newPlan.price,
        baseAmount: Math.round(finalBaseAmount),
        gstAmount: gstAmount,
        finalAmount: finalTotalAmount,
        razorpay: razorpayOrder,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('Initialize B2B Upgrade Error:', error);
      throw error;
    }
  }

  async verifyB2BUpgradePayment(vendorId, newPlanId, paymentData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;
      const isValid = razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) throw new Error('Payment verification failed');

      const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' }).session(session);
      const newPlan = await B2BSubscriptionPlan.findById(newPlanId).session(session);
      if (!newPlan) throw new Error('New plan not found');

      if (currentSub) {
        currentSub.status = 'expired';
        currentSub.cancellationDate = new Date();
        await currentSub.save({ session });
      }

      const startDate = new Date();
      const endDate = new Date();
      const durationMonths = newPlan.duration || 12;
      endDate.setMonth(endDate.getMonth() + durationMonths);

      let billingCycle = 'yearly';
      if (durationMonths === 6) billingCycle = 'half-yearly';
      if (durationMonths === 3) billingCycle = 'quarterly';
      if (durationMonths === 1) billingCycle = 'monthly';

      // Calculate GST breakdown for the upgrade
      const today = new Date();
      const currentEndDate = currentSub ? new Date(currentSub.endDate) : new Date();
      const currentStartDate = currentSub ? new Date(currentSub.startDate) : new Date();
      const totalDays = Math.max(1, Math.ceil((currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24)));
      const remainingDays = Math.max(0, Math.ceil((currentEndDate - today) / (1000 * 60 * 60 * 24)));
      const credit = currentSub ? ((currentSub.planId.price || 0) / totalDays) * remainingDays : 0;
      let finalBaseAmount = newPlan.price - credit;
      if (finalBaseAmount < 0) finalBaseAmount = 0;
      const gstAmount = Math.round(finalBaseAmount * GST_RATE);
      const finalTotalAmount = Math.round(finalBaseAmount + gstAmount);

      const [newSub] = await VendorSubscription.create([{
        vendorId,
        planId: newPlanId,
        status: 'active',
        billingCycle,
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        lastPaymentDate: startDate,
        nextBillingDate: endDate,
        basePrice: Math.round(finalBaseAmount),
        gstAmount: gstAmount,
        totalAmount: finalTotalAmount,
        usage: { lastResetDate: startDate },
        auditLogs: [{
          action: 'subscription_upgrade',
          timestamp: new Date(),
          details: { 
            fromPlan: currentSub ? currentSub.planId : null, 
            toPlan: newPlanId, 
            razorpayPaymentId, 
            basePrice: Math.round(finalBaseAmount),
            gstAmount: gstAmount,
            totalAmount: finalTotalAmount
          }
        }]
      }], { session });

      await Vendor.findByIdAndUpdate(vendorId, { currentSubscription: newSub._id }, { session });
      await session.commitTransaction();

      // Background Zoho/Email Integration
      this.processZohoAndEmailForSubscription(newSub._id).catch(err => {
        console.error('[SubUpgrade][Zoho] background error:', err);
      });

      return newSub;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getSubscriptionAnalytics() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const [
        subscriptionRevenueResult,
        totalOrdersResult,
        totalCustomersResult,
        activeSubscriptionsCount,
        planDistribution,
        recentSubscriptionPayments,
        revenueData,
        currentPeriodRes,
        previousPeriodRes,
        previousPeriodCustomersRes
      ] = await Promise.all([
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed' } },
          { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' } } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed' } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ]),
        VendorSubscription.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$vendorId' } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ]),
        VendorSubscription.countDocuments({ status: 'active' }),
        VendorSubscription.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$planId', count: { $sum: 1 } } },
          { $lookup: { from: 'b2bsubscriptionplans', localField: '_id', foreignField: '_id', as: 'plan' } },
          { $unwind: '$plan' },
          { $project: { name: '$plan.name', count: 1 } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed' } },
          { $sort: { 'auditLogs.timestamp': -1 } },
          { $limit: 10 },
          { $lookup: { from: 'vendors', localField: 'vendorId', foreignField: '_id', as: 'vendor' } },
          { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'b2bsubscriptionplans', localField: 'planId', foreignField: '_id', as: 'plan' } },
          { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
          { $project: { vendorName: { $ifNull: ['$vendor.businessName', '$vendor.storeName'] }, amount: '$auditLogs.details.amount', planName: { $ifNull: ['$plan.name', '$auditLogs.details.planName', 'Unknown'] }, date: { $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' } }, status: '$auditLogs.details.status', timestamp: '$auditLogs.timestamp' } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed', 'auditLogs.timestamp': { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' } }, revenue: { $sum: '$auditLogs.details.amount' }, orders: { $sum: 1 } } },
          { $project: { date: '$_id', revenue: 1, orders: 1, _id: 0 } },
          { $sort: { date: 1 } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed', 'auditLogs.timestamp': { $gte: thirtyDaysAgo } } },
          { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' }, count: { $sum: 1 } } }
        ]),
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          { $match: { 'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] }, 'auditLogs.details.status': 'completed', 'auditLogs.timestamp': { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
          { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' }, count: { $sum: 1 } } }
        ]),
        VendorSubscription.aggregate([
          { $match: { status: 'active', startDate: { $lt: thirtyDaysAgo } } },
          { $group: { _id: '$vendorId' } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ])
      ]);

      const totalRevenue = subscriptionRevenueResult[0]?.total || 0;
      const totalOrders = totalOrdersResult[0]?.count || 0;
      const totalCustomers = totalCustomersResult[0]?.count || 0;
      const currentRevenue = currentPeriodRes[0]?.total || 0;
      const previousRevenue = previousPeriodRes[0]?.total || 0;

      const monthlyGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) : '0.0';

      return {
        revenue: totalRevenue,
        totalRevenue,
        totalOrders,
        totalCustomers,
        activeSubscriptions: activeSubscriptionsCount,
        monthlyGrowth: `+${monthlyGrowth}%`,
        planDistribution,
        recentPayments: recentSubscriptionPayments.map(p => ({ id: p._id, vendor: p.vendorName || 'Unknown', amount: p.amount, plan: p.planName, date: p.date, status: p.status })),
        revenueData
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  async getAllVendorSubscriptions(filters = {}) {
    try {
      const { status, planId, expiringSoon } = filters;
      const query = {};
      if (status) query.status = status;
      if (planId) query.planId = planId;
      if (expiringSoon) {
        const soon = new Date();
        soon.setDate(soon.getDate() + 7);
        query.endDate = { $lte: soon, $gte: new Date() };
      }

      const subscriptions = await VendorSubscription.find(query)
        .populate('vendorId', 'businessName storeName email address')
        .populate('planId', 'name price duration')
        .sort({ endDate: 1 }).lean();

      return subscriptions.map(sub => ({
        vendor: sub.vendorId?.businessName || sub.vendorId?.storeName || 'Unknown',
        vendorId: sub.vendorId?._id,
        status: sub.status,
        plan: sub.planId?.name || 'Unknown',
        expiry: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : null,
        renew: sub.autoRenew,
        startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : null,
        subscriptionId: sub._id
      }));
    } catch (error) {
      console.error('Error getting all subscriptions:', error);
      throw error;
    }
  }

  async manualSubscriptionOverride(subscriptionId, action, adminId, details = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const subscription = await VendorSubscription.findById(subscriptionId).session(session);
      if (!subscription) throw new Error('Subscription not found');

      const auditLog = { action: `manual_${action}`, timestamp: new Date(), performedBy: adminId, details };
      
      if (action === 'extend_30_days') {
        subscription.endDate = new Date(new Date(subscription.endDate).getTime() + 30 * 86400000);
        subscription.status = 'active';
      } else if (action === 'cancel_subscription') {
        // Stop auto-payment and upcoming renewals
        subscription.autoRenew = false;
        subscription.cancellationDate = new Date();
        
        // 🔹 Close auto-pay in Razorpay if subscription ID exists
        if (subscription.razorpaySubscriptionId) {
          try {
            await razorpayService.cancelSubscription(subscription.razorpaySubscriptionId);
          } catch (err) {
            console.error('[ManualCancel] Razorpay cancellation failed:', err.message);
            // We proceed as internal cancellation is primary
          }
        }
        
        // Note: We DO NOT set status = 'cancelled' here because
        // user should have access until the period ENDS.
        // A cron or expiry check will set it to 'expired' later.
      }

      subscription.auditLogs.push(auditLog);
      await subscription.save({ session });
      await session.commitTransaction();
      return subscription;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Vendor-side cancellation
   * Stops auto-renewal/RAZORPAY but keeps plan active until endDate
   */
  async cancelVendorSubscription(vendorId) {
    const sub = await VendorSubscription.findOne({ vendorId, status: 'active' });
    if (!sub) throw new Error('No active subscription found to cancel.');

    try {
      sub.autoRenew = false;
      sub.cancellationDate = new Date();
      
      // Stop Razorpay auto-pay
      if (sub.razorpaySubscriptionId) {
        await razorpayService.cancelSubscription(sub.razorpaySubscriptionId);
      }

      sub.auditLogs.push({
        action: 'vendor_cancelled_autopay',
        timestamp: new Date(),
        details: { message: 'Vendor stopped auto-renewal from panel' }
      });

      await sub.save();
      return sub;
    } catch (error) {
      console.error('Vendor cancel error:', error);
      throw error;
    }
  }

  async updateAutoRenewal(vendorId, autoRenew) {
    const sub = await VendorSubscription.findOne({ vendorId, status: 'active' });
    if (!sub) throw new Error('No active subscription');
    
    // If disabling auto-renew, stop it in Razorpay as well
    if (autoRenew === false && sub.razorpaySubscriptionId) {
      try {
        await razorpayService.cancelSubscription(sub.razorpaySubscriptionId);
      } catch (err) {
        console.error('[UpdateRenew] Razorpay sync failed:', err.message);
      }
    }

    sub.autoRenew = autoRenew;
    return await sub.save();
  }

  async getVendorBillingHistory(vendorId) {
    const subs = await VendorSubscription.find({ vendorId }).populate('planId').sort({ createdAt: -1 }).lean();
    const history = [];
    for (const sub of subs) {
      if (sub.lastPaymentDate || sub.status === 'active') {
        history.push({
          id: sub._id.toString(),
          transactionCode: sub.razorpayOrderId || `SUB-${sub._id}`,
          amount: sub.planId?.price || 0,
          type: 'subscription_payment',
          status: 'completed',
          date: sub.lastPaymentDate || sub.startDate,
          planName: sub.planId?.name || 'Unknown'
        });
      }
    }
    return history;
  }

  async processZohoAndEmailForSubscription(subscriptionId, customAmount = null) {
    try {
      console.log(`[SubPay][Zoho] Starting integration helper for subscription: ${subscriptionId.toString()}`);
      const subscriptionDoc = await VendorSubscription.findById(subscriptionId)
        .populate('planId')
        .populate('vendorId');

      if (!subscriptionDoc) return;

      // Avoid duplicate processing
      if (subscriptionDoc.emailNotification?.successSent) {
        console.log('[SubPay][Zoho] Success notification already sent for subscription', subscriptionId.toString());
        return;
      }

      const planDoc = subscriptionDoc.planId;
      const amount = customAmount || subscriptionDoc.totalAmount || planDoc?.price || 0;
      const planName = planDoc?.name || 'Subscription Plan';
      const razorpayPaymentId = subscriptionDoc.razorpayPaymentId;

      // Construct vendor info, handling both registered and pending vendors
      let vendorInfo = {};
      if (subscriptionDoc.vendorId) {
        const v = subscriptionDoc.vendorId;
        vendorInfo = {
          _id: v._id,
          name: v.businessName || v.storeName || v.name || 'Vendor',
          storeName: v.storeName || v.businessName,
          email: v.email,
          phone: v.phone,
          gstNumber: v.gstNumber,
          zohoContactId: v.zohoContactId || subscriptionDoc.zohoContactId
        };
      } else {
        // Handle pending registration
        vendorInfo = {
          name: 'Pending Vendor',
          email: subscriptionDoc.pendingVendorEmail,
          phone: subscriptionDoc.pendingVendorPhone,
          zohoContactId: subscriptionDoc.zohoContactId
        };
      }

      if (!vendorInfo.email) {
        console.warn('[SubPay][Zoho] No email found for subscription', subscriptionId);
        return;
      }

      // 1. Zoho Contact
      let contactId = vendorInfo.zohoContactId;
      console.log(`[SubPay][Zoho] Syncing contact for vendor: ${vendorInfo.email}, Existing ID: ${contactId || 'None'}`);
      if (!contactId) {
        try {
          // Pass a vendor-like object to ensureZohoContactForVendor
          contactId = await zohoBooksService.ensureZohoContactForVendor({
            email: vendorInfo.email,
            phone: vendorInfo.phone,
            name: vendorInfo.name,
            storeName: vendorInfo.storeName || vendorInfo.name,
            gstNumber: vendorInfo.gstNumber || null,
            zohoContactId: null
          });

          console.log(`[SubPay][Zoho] Contact Sync Result: ${contactId}`);
          // Save back to vendor if exists
          if (vendorInfo._id && contactId) {
            await Vendor.findByIdAndUpdate(vendorInfo._id, { zohoContactId: contactId });
          }
        } catch (e) { console.error('[SubPay][Zoho] Sync contact failed:', e.message); }
      }

      // 2. Zoho Invoice & Payment
      let invoice = null;
      let invoicePdfBuffer = null;
      if (contactId) {
        try {
          const invoiceRef = `SUB-${subscriptionId.toString()}`;
          invoice = await zohoBooksService.createSubscriptionInvoice({
            contactId, planName, amount, currency: 'INR', referenceNumber: invoiceRef,
            vendorGstNumber: vendorInfo.gstNumber
          });
          await zohoBooksService.recordInvoicePayment({
            contactId, invoiceId: invoice.id, amount, paymentDate: new Date(), razorpayPaymentId
          });

          if (invoice.id) {
            invoicePdfBuffer = await zohoBooksService.downloadInvoicePdf(invoice.id);
          }
        } catch (e) { console.error('Zoho Invoice failed:', e.message); }
      }

      // 3. Emails
      const vendorEmail = vendorInfo.email;
      const adminEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
      const commonEmailData = {
        amount, planName, title: planName, paymentFor: 'subscription',
        paymentDate: new Date(), transactionId: razorpayPaymentId,
        referenceId: `SUB-${subscriptionId}`, paymentMethod: 'razorpay',
        vendor: vendorInfo, invoicePdfBuffer
      };

      if (vendorEmail) await sendPaymentSuccessEmail({ ...commonEmailData, to: vendorEmail }).catch(e => console.error('Vendor email failed:', e.message));
      if (adminEmail) await sendPaymentSuccessEmail({ ...commonEmailData, to: adminEmail }).catch(e => console.error('Admin email failed:', e.message));

      await VendorSubscription.findByIdAndUpdate(subscriptionId, {
        zohoContactId: contactId,
        zohoInvoiceId: invoice?.id,
        zohoInvoiceStatus: invoice?.status,
        zohoInvoicePdfUrl: invoice?.pdfUrl,
        emailNotification: { successSent: true, lastSentAt: new Date() }
      });

    } catch (err) {
      console.error('[SubPay][Critical] Integration helper failed:', err);
    }
  }
}

export default new SubscriptionService();
