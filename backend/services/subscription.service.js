import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import Vendor from '../models/Vendor.model.js';

import razorpayService from './razorpay.service.js';
import NotificationService from './notification.service.js';
import zohoBooksService from './zohoBooks.service.js';
import { sendPaymentSuccessEmail, sendPaymentCancelledEmail } from './email.service.js';
import mongoose from 'mongoose';

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
            path: 'planId',
            select: 'name duration price features isActive'
          })
          .lean();

        // If subscription found via reference, return it immediately (regardless of status)
        // This ensures vendor sees admin's manual override changes
        if (subscription && subscription.planId) {
          return subscription;
        } else if (subscription) {
          // Subscription exists but has no planId (invalid B2B sub), log warning
          console.warn(`Subscription ${subscription._id} has no planId (B2B), trying to find alternative`);
        }
      }

      // Priority 2: Try to find active subscription
      // Note: If Priority 1 found a subscription (even if invalid), skip Priority 2
      if (!subscription || !subscription.planId) {
        subscription = await VendorSubscription.findOne({
          vendorId: vendorObjectId,
          status: 'active'
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

      // Return subscription if planId exists
      if (subscription.planId) {
        return subscription;
      }

      // No planId exists - invalid subscription
      console.warn(`Subscription ${subscription._id} has no planId (B2B)`);
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
  async initializeSubscription(vendorId, planId, io = null) {
    try {
      const plan = await B2BSubscriptionPlan.findById(planId);
      if (!plan) throw new Error('Subscription plan not found');

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) throw new Error('Vendor not found');

      const planPrice = plan.price;
      const planName = plan.name;

      // If free plan, activate immediately
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
            const vendor = await Vendor.findById(vendorId).select('businessName storeName');
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

      // For paid plans, create a PENDING subscription record first
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

      const subscriptionCode = `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const pendingSubscriptionData = {
        vendorId,
        planId,
        billingCycle: 'yearly',
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        status: 'pending',
        usage: {
          lastResetDate: startDate
        }
      };

      const subscription = await VendorSubscription.create(pendingSubscriptionData);

      // Create Razorpay order
      let razorpayOrder = null;
      let razorpayKeyId = null;

      try {
        razorpayOrder = await razorpayService.createOrder(
          planPrice,
          'INR',
          subscriptionCode,
          {
            vendorId: vendorId.toString(),
            planId: planId.toString(),
            subscriptionId: subscription._id.toString(),
            planName: planName,
            type: 'subscription',
            isB2B: 'true'
          }
        );

        razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;
      } catch (razorpayError) {
        console.error('Razorpay order creation failed:', razorpayError);
        // If razorpay fails, we might want to delete the pending sub, but keeping it as 'failed' or 'pending' is also fine
        throw new Error(`Failed to initialize payment: ${razorpayError.message}`);
      }

      return {
        subscription,
        razorpay: razorpayOrder,
        razorpayKeyId,
        vendorId: vendorId.toString(),
        planId: planId.toString(),
        isB2B: true
      };
    } catch (error) {
      console.error('Initialize Subscription Error:', error);
      throw error;
    }
  }

  /**
   * Verify payment and create/activate subscription
   * Now accepts vendorId and tierId instead of subscriptionId since subscription doesn't exist yet
   */
  async verifySubscriptionPayment(vendorId, planId, paymentData, io = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

      // Validate vendor and plan exist
      const vendor = await Vendor.findById(vendorId).session(session)
        .select('businessName storeName email phone');
      if (!vendor) throw new Error('Vendor not found');

      const plan = await B2BSubscriptionPlan.findById(planId).session(session);
      if (!plan) throw new Error('Subscription plan not found');

      const planPrice = plan.price;
      const planName = plan.name;

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

      // Check if payment is actually successful (captured, authorized, or created with valid signature)
      // Note: 'created' state with valid signature is acceptable for immediate fulfillment
      const paymentStatus = paymentDetails.status;
      if (paymentStatus !== 'captured' && paymentStatus !== 'authorized' && paymentStatus !== 'created') {
        const startDate = new Date();
        const endDate = new Date();
        const billingCycle = 'yearly';

        const failedSubscriptionData = {
          vendorId,
          billingCycle,
          startDate,
          endDate,
          paymentMethod: 'razorpay',
          status: 'failed',
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
              amount: planPrice,
              status: 'failed',
              razorpayOrderId,
              razorpayPaymentId,
              razorpaySignature,
              type: 'subscription_payment',
              planName: planName,
              paymentDate: new Date(),
              failureReason: `Payment status: ${paymentDetails.status}`
            }
          }]
        };

        failedSubscriptionData.planId = planId;

        const [failedSub] = await VendorSubscription.create([failedSubscriptionData], { session });

        await session.commitTransaction();

        // Fire-and-forget cancellation email (do not block or throw)
        (async () => {
          try {
            const recipient = vendor.email;
            if (recipient) {
              await sendPaymentCancelledEmail({
                to: recipient,
                amount: planPrice,
                planName,
                paymentDate: new Date(),
                transactionId: razorpayPaymentId,
              });
            }
            // Admin copy
            const adminEmail = process.env.EMAIL_FROM;
            if (adminEmail) {
              await sendPaymentCancelledEmail({
                to: adminEmail,
                amount: planPrice,
                planName,
                paymentDate: new Date(),
                transactionId: razorpayPaymentId,
              });
            }

            await VendorSubscription.findByIdAndUpdate(
              failedSub._id,
              {
                emailNotification: {
                  ...failedSub.emailNotification,
                  cancelSent: true,
                  lastSentAt: new Date(),
                },
              },
              { new: true }
            );
          } catch (e) {
            console.error('Failed to send payment cancelled email:', e.message);
            await VendorSubscription.findByIdAndUpdate(failedSub._id, {
              $push: {
                accountingErrors: {
                  at: 'payment_cancel_email',
                  message: e.message,
                },
              },
            });
          }
        })();

        throw new Error('Payment not successful. Payment status: ' + paymentStatus);
      }

      // Payment successful - create subscription with 'active' status
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
        usage: {
          lastResetDate: startDate
        }
      };

      const subscription = await VendorSubscription.create([activeSubscriptionData], { session });

      // Update vendor's current subscription
      await Vendor.findByIdAndUpdate(vendorId, {
        currentSubscription: subscription[0]._id
      }, { session });

      // Add audit log entry
      if (planPrice > 0) {
        subscription[0].auditLogs.push({
          action: 'subscription_payment',
          timestamp: new Date(),
          details: {
            amount: planPrice,
            status: 'completed',
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            type: 'subscription_payment',
            planName: planName,
            paymentDate: new Date()
          }
        });
        await subscription[0].save({ session });
      }

      // Send notification
      try {
        const vendorName = vendor.businessName || vendor.storeName || 'A vendor';
        const adminNotification = {
          recipientType: 'admin',
          type: 'payment_success',
          title: 'Vendor Subscription Purchase',
          message: 'Vendor has purchased a subscription plan.',
          metadata: {
            subscriptionId: subscription[0]._id,
            vendorId: vendorId,
            planName: planName,
            amount: planPrice,
            type: 'subscription'
          },
          actionUrl: `/admin/subscriptions/${subscription[0]._id}`
        };

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
      }

      await session.commitTransaction();

      let populatedSubscription = await VendorSubscription.findById(subscription[0]._id)
        .populate('planId')
        .populate({
          path: 'vendorId',
          select: 'businessName storeName email phone'
        });

      // Zoho Books + emails: do not affect payment result if they fail
      try {
        const vendorDoc = populatedSubscription.vendorId;
        const planDoc = populatedSubscription.planId;
        const amount = planDoc?.price || planPrice;

        // 1. Ensure Zoho contact
        const contactId = await zohoBooksService.ensureZohoContactForVendor(vendorDoc);

        // Persist contact on Vendor and VendorSubscription
        await Vendor.findByIdAndUpdate(vendorDoc._id, { zohoContactId: contactId });
        populatedSubscription.zohoContactId = contactId;

        // 2. Create invoice
        const invoiceRef = `SUB-${subscription[0]._id.toString()}`;
        const invoice = await zohoBooksService.createSubscriptionInvoice({
          contactId,
          planName: planDoc?.name || planName,
          amount,
          currency: 'INR',
          referenceNumber: invoiceRef,
        });

        // 3. Record payment
        const payment = await zohoBooksService.recordInvoicePayment({
          contactId,
          invoiceId: invoice.id,
          amount,
          paymentDate: new Date(),
          razorpayPaymentId,
        });

        // 4. Fetch invoice PDF (optional best-effort)
        let invoicePdfBuffer = null;
        try {
          if (invoice.pdfUrl) {
            const token = await zohoBooksService.getAccessToken();
            const pdfRes = await (await import('axios')).default.get(invoice.pdfUrl, {
              headers: {
                Authorization: `Zoho-oauthtoken ${token}`,
              },
              responseType: 'arraybuffer',
              timeout: 15000,
            });
            invoicePdfBuffer = Buffer.from(pdfRes.data);
          }
        } catch (pdfErr) {
          console.error('Failed to download Zoho invoice PDF:', pdfErr.message);
        }

        // 5. Send emails
        const paymentDate = new Date();
        const vendorEmail = vendorDoc.email;
        const adminEmail = process.env.EMAIL_FROM;

        if (vendorEmail) {
          await sendPaymentSuccessEmail({
            to: vendorEmail,
            amount,
            planName: planDoc?.name || planName,
            paymentDate,
            transactionId: razorpayPaymentId,
            invoicePdfBuffer,
          });
        }
        if (adminEmail) {
          await sendPaymentSuccessEmail({
            to: adminEmail,
            amount,
            planName: planDoc?.name || planName,
            paymentDate,
            transactionId: razorpayPaymentId,
            invoicePdfBuffer,
          });
        }

        populatedSubscription = await VendorSubscription.findByIdAndUpdate(
          subscription[0]._id,
          {
            zohoContactId: contactId,
            zohoInvoiceId: invoice.id,
            zohoInvoiceStatus: invoice.status,
            zohoInvoicePdfUrl: invoice.pdfUrl,
            zohoPaymentId: payment.id || null,
            emailNotification: {
              ...(populatedSubscription.emailNotification || {}),
              successSent: true,
              lastSentAt: new Date(),
            },
          },
          { new: true }
        )
          .populate('planId')
          .populate({
            path: 'vendorId',
            select: 'businessName storeName email phone',
          });
      } catch (accountingErr) {
        console.error('Zoho/email integration failed for subscription:', accountingErr.message);
        await VendorSubscription.findByIdAndUpdate(subscription[0]._id, {
          $push: {
            accountingErrors: {
              at: 'zoho_books_or_email',
              message: accountingErr.message,
            },
          },
        });
      }

      return populatedSubscription;
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
      if (!plan) throw new Error('Subscription plan not found');

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.duration || 12));

      const subscriptionData = {
        vendorId,
        planId,
        billingCycle: billingCycle || (plan.duration === 12 ? 'yearly' : plan.duration === 6 ? 'half-yearly' : plan.duration === 3 ? 'quarterly' : 'monthly'),
        startDate,
        endDate,
        paymentMethod,
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
      return subscription[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async upgradeSubscription(vendorId, newPlanId, billingCycle = 'monthly') {
    // Implementation for upgrade with B2B plans
    const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' }).populate('planId');
    if (!currentSub) throw new Error('No active subscription found');

    const newPlan = await B2BSubscriptionPlan.findById(newPlanId);
    if (!newPlan) throw new Error('New subscription plan not found');

    // Calculate proration
    const now = new Date();
    const remainingTime = currentSub.endDate - now;
    const totalTime = currentSub.endDate - currentSub.startDate;
    const remainingRatio = Math.max(0, remainingTime / totalTime);

    const currentPrice = currentSub.planId?.price || 0;
    const unusedAmount = currentPrice * remainingRatio;

    const newPrice = newPlan.price;
    const chargeAmount = Math.max(0, newPrice - unusedAmount);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Deactivate current sub
      currentSub.status = 'expired';
      currentSub.cancellationDate = now;
      await currentSub.save({ session });

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (newPlan.duration || 12));

      const newSubData = {
        vendorId,
        planId: newPlanId,
        billingCycle: billingCycle || 'yearly',
        startDate: now,
        endDate,
        status: 'active',
        paymentMethod: currentSub.paymentMethod,
        lastPaymentDate: now,
        nextBillingDate: endDate,
        usage: {
          lastResetDate: now
        },
        auditLogs: [{
          action: 'upgrade',
          timestamp: new Date(),
          details: {
            fromPlan: currentSub.planId?.name || 'Unknown',
            toPlan: newPlan.name,
            proratedCharge: chargeAmount
          }
        }]
      };

      const newSub = await VendorSubscription.create([newSubData], { session });

      await Vendor.findByIdAndUpdate(vendorId, {
        currentSubscription: newSub[0]._id
      }, { session });

      // Track upgrade payment via audit logs if there's a charge
      if (chargeAmount > 0) {
        newSub[0].auditLogs.push({
          action: 'upgrade_payment',
          timestamp: new Date(),
          details: {
            amount: chargeAmount,
            status: 'completed',
            type: 'upgrade_proration',
            planName: newPlan.name,
            previousPlanName: currentSub.planId?.name || 'Unknown',
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

  /**
   * NEW: Initialize B2B Subscription Upgrade with Pro-rata logic
   */
  async initializeB2BUpgrade(vendorId, newPlanId) {
    try {
      const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' }).populate('planId');
      if (!currentSub) throw new Error('No active subscription found to upgrade');

      const newPlan = await B2BSubscriptionPlan.findById(newPlanId);
      if (!newPlan) throw new Error('New subscription plan not found');

      // 1. Upgrade Path Validation (Basic -> Silver -> Diamond)
      const getRank = (name) => {
        const n = (name || '').toLowerCase();
        if (n.includes('gold')) return 5;
        if (n.includes('premium')) return 4;
        if (n.includes('diamond')) return 3;
        if (n.includes('silver')) return 2;
        if (n.includes('basic')) return 1;
        return 0;
      };

      const currentRank = getRank(currentSub.planId.name);
      const newRank = getRank(newPlan.name);

      if (newRank <= currentRank) {
        throw new Error('Downgrade not allowed. You can change plan after expiry.');
      }

      // 2. Pro-rata Billing Logic
      const today = new Date();
      const currentEndDate = new Date(currentSub.endDate);
      const currentStartDate = new Date(currentSub.startDate);

      // Calculate total duration of current plan in days
      const totalDurationTime = currentEndDate.getTime() - currentStartDate.getTime();
      const totalDurationDays = Math.max(1, Math.ceil(totalDurationTime / (1000 * 60 * 60 * 24))); // Avoid division by zero

      // Calculate remaining days
      const remainingTime = currentEndDate.getTime() - today.getTime();
      const remainingDays = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));

      const currentPlanPrice = currentSub.planId.price || 0;
      const perDayPrice = currentPlanPrice / totalDurationDays;
      const credit = perDayPrice * remainingDays;

      const newPlanPrice = newPlan.price;
      let finalAmount = newPlanPrice - credit;
      if (finalAmount < 0) finalAmount = 0;

      // 3. Create Razorpay Order
      const upgradeCode = `UPG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const razorpayOrder = await razorpayService.createOrder(
        Math.round(finalAmount),
        'INR',
        upgradeCode,
        {
          vendorId: vendorId.toString(),
          newPlanId: newPlanId.toString(),
          currentSubId: currentSub._id.toString(),
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
        newPlanPrice,
        finalAmount: Math.round(finalAmount),
        razorpay: razorpayOrder,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('Initialize B2B Upgrade Error:', error);
      throw error;
    }
  }

  /**
   * NEW: Verify B2B Upgrade Payment and Activate
   */
  async verifyB2BUpgradePayment(vendorId, newPlanId, paymentData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

      // 1. Verify Payment
      const isValid = razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) throw new Error('Payment verification failed');

      // 2. Fetch required docs
      const currentSub = await VendorSubscription.findOne({ vendorId, status: 'active' }).session(session);
      const newPlan = await B2BSubscriptionPlan.findById(newPlanId).session(session);
      if (!newPlan) throw new Error('New plan not found');

      // 3. Expire Old Plan
      if (currentSub) {
        currentSub.status = 'expired';
        currentSub.cancellationDate = new Date();
        await currentSub.save({ session });
      }

      // 4. Activate New Plan (Based on Plan Duration)
      const startDate = new Date();
      const endDate = new Date();
      const durationMonths = newPlan.duration || 12; // Default to 12 months if undefined
      endDate.setMonth(endDate.getMonth() + durationMonths);

      // Determine Billing Cycle Label
      let billingCycle = 'yearly';
      if (durationMonths === 6) billingCycle = 'half-yearly';
      if (durationMonths === 3) billingCycle = 'quarterly';
      if (durationMonths === 1) billingCycle = 'monthly';

      const newSubData = {
        vendorId,
        planId: newPlanId,
        status: 'active',
        billingCycle: billingCycle,
        startDate,
        endDate,
        paymentMethod: 'razorpay',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        lastPaymentDate: startDate,
        nextBillingDate: endDate,
        usage: { lastResetDate: startDate },
        auditLogs: [{
          action: 'subscription_upgrade',
          timestamp: new Date(),
          details: {
            fromPlan: currentSub ? currentSub.planId : null,
            toPlan: newPlanId,
            razorpayPaymentId,
            amount: paymentData.amount || 0,
            durationMonths // Log duration for debugging
          }
        }]
      };

      const newSub = await VendorSubscription.create([newSubData], { session });

      // 5. Update Vendor Record
      const Vendor = (await import('../models/Vendor.model.js')).default;
      await Vendor.findByIdAndUpdate(vendorId, {
        currentSubscription: newSub[0]._id
      }, { session });

      await session.commitTransaction();
      return newSub[0];
    } catch (error) {
      await session.abortTransaction();
      console.error('Verify B2B Upgrade Error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getSubscriptionAnalytics() {
    try {
      // Execute all analytics queries in parallel for maximum performance
      const [
        subscriptionRevenueResult,
        totalOrdersResult,
        totalCustomersResult,
        activeSubscriptionsCount,
        planDistribution,
        recentSubscriptionPayments
      ] = await Promise.all([
        // Total revenue from B2B subscription transactions
        VendorSubscription.aggregate([
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
        ]),
        // Total orders: count of subscription payments
        VendorSubscription.aggregate([
          { $unwind: '$auditLogs' },
          {
            $match: {
              'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
              'auditLogs.details.status': 'completed'
            }
          },
          { $group: { _id: null, count: { $sum: 1 } } }
        ]),
        // Total unique vendors with active subscriptions
        VendorSubscription.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$vendorId' } },
          { $group: { _id: null, count: { $sum: 1 } } }
        ]),
        VendorSubscription.countDocuments({ status: 'active' }),
        // Plan distribution
        VendorSubscription.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$planId', count: { $sum: 1 } } },
          { $lookup: { from: 'b2bsubscriptionplans', localField: '_id', foreignField: '_id', as: 'plan' } },
          { $unwind: '$plan' },
          { $project: { name: '$plan.name', count: 1 } }
        ]),
        // Recent B2B payments
        VendorSubscription.aggregate([
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
            $lookup: { from: 'vendors', localField: 'vendorId', foreignField: '_id', as: 'vendor' }
          },
          { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
          {
            $lookup: { from: 'b2bsubscriptionplans', localField: 'planId', foreignField: '_id', as: 'plan' }
          },
          { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: { $toString: '$_id' },
              vendorId: { $toString: '$vendorId' },
              vendorName: { $ifNull: ['$vendor.businessName', '$vendor.storeName'] },
              amount: '$auditLogs.details.amount',
              planName: { $ifNull: ['$plan.name', '$auditLogs.details.planName', 'Unknown'] },
              date: { $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' } },
              status: '$auditLogs.details.status',
              type: '$auditLogs.details.type',
              timestamp: '$auditLogs.timestamp'
            }
          }
        ])
      ]);

      const totalRevenue = subscriptionRevenueResult[0]?.total || 0;
      const totalOrders = totalOrdersResult[0]?.count || 0;
      const totalCustomers = totalCustomersResult[0]?.count || 0;

      const enrichedRecentPayments = recentSubscriptionPayments.map(payment => ({
        id: payment._id,
        vendor: payment.vendorName || 'Unknown Vendor',
        amount: payment.amount,
        plan: payment.planName,
        date: payment.date,
        status: payment.status,
        type: payment.type || 'subscription_payment'
      }));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // Current 30 days revenue data for chart
      const revenueData = await VendorSubscription.aggregate([
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
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$auditLogs.timestamp' } },
            revenue: { $sum: '$auditLogs.details.amount' },
            orders: { $sum: 1 }
          }
        },
        { $project: { date: '$_id', revenue: 1, orders: 1, _id: 0 } },
        { $sort: { date: 1 } }
      ]);

      // Calculate monthly growth comparisons
      const currentPeriodRes = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' }, count: { $sum: 1 } } }
      ]);

      const previousPeriodRes = await VendorSubscription.aggregate([
        { $unwind: '$auditLogs' },
        {
          $match: {
            'auditLogs.action': { $in: ['subscription_payment', 'upgrade_payment'] },
            'auditLogs.details.status': 'completed',
            'auditLogs.timestamp': { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, total: { $sum: '$auditLogs.details.amount' }, count: { $sum: 1 } } }
      ]);

      const currentRevenue = currentPeriodRes[0]?.total || 0;
      const previousRevenue = previousPeriodRes[0]?.total || 0;
      const currentOrders = currentPeriodRes[0]?.count || 0;
      const previousOrders = previousPeriodRes[0]?.count || 0;

      const monthlyGrowth = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
        : '0.0';

      const ordersChange = previousOrders > 0
        ? parseFloat(((currentOrders - previousOrders) / previousOrders * 100).toFixed(1))
        : 0;

      // Previous period customers for growth calculation
      const previousPeriodCustomersRes = await VendorSubscription.aggregate([
        {
          $match: {
            status: 'active',
            startDate: { $lt: thirtyDaysAgo }
          }
        },
        { $group: { _id: '$vendorId' } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);
      const previousCustomers = previousPeriodCustomersRes[0]?.count || 0;
      const customersChange = previousCustomers > 0
        ? parseFloat(((totalCustomers - previousCustomers) / previousCustomers * 100).toFixed(1))
        : 0;

      // Churn rate calculation
      const expiredLast30Days = await VendorSubscription.countDocuments({
        status: 'expired',
        endDate: { $gte: thirtyDaysAgo }
      });
      const churnRate = activeSubscriptionsCount > 0
        ? ((expiredLast30Days / activeSubscriptionsCount) * 100).toFixed(2)
        : '0.00';

      return {
        revenue: totalRevenue,
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        totalCustomers: totalCustomers,
        revenueChange: parseFloat(monthlyGrowth),
        ordersChange: ordersChange,
        customersChange: customersChange,
        activeSubscriptions: activeSubscriptionsCount,
        monthlyGrowth: `+${monthlyGrowth}%`,
        churnRate: `${churnRate}%`,
        planDistribution: planDistribution.map(p => ({ name: p.name, count: p.count })),
        recentPayments: enrichedRecentPayments,
        revenueData: revenueData
      };
    } catch (error) {
      console.error('Error getting subscription analytics:', error);
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
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        query.endDate = { $lte: sevenDaysFromNow, $gte: new Date() };
      }

      const subscriptions = await VendorSubscription.find(query)
        .populate({
          path: 'vendorId',
          select: 'businessName storeName email address',
          model: 'Vendor'
        })
        .populate({
          path: 'planId',
          select: 'name price duration',
          model: 'B2BSubscriptionPlan'
        })
        .sort({ endDate: 1 })
        .lean();

      return subscriptions.map(sub => ({
        vendor: sub.vendorId?.businessName || sub.vendorId?.storeName || 'Unknown',
        vendorId: sub.vendorId?._id || sub.vendorId,
        vendorCity: sub.vendorId?.address?.city || '',
        status: sub.status,
        plan: sub.planId?.name || 'Unknown',
        expiry: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : null,
        renew: sub.autoRenew,
        startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : null,
        usage: {
          lastResetDate: sub.usage?.lastResetDate || sub.startDate
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
        .populate('planId')
        .populate('vendorId');

      if (!subscription) {
        throw new Error('Subscription not found');
      }

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
          if (!days || isNaN(days) || parseInt(days) <= 0) {
            throw new Error('Invalid number of days. Please provide a positive number.');
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

      // IMPORTANT: Always update vendor's currentSubscription reference after any manual override
      // This ensures vendor sees the changes immediately
      const vendorIdForUpdate = subscription.vendorId?._id || subscription.vendorId;
      if (vendorIdForUpdate && mongoose.Types.ObjectId.isValid(vendorIdForUpdate)) {
        await Vendor.findByIdAndUpdate(vendorIdForUpdate, {
          currentSubscription: updatedSubscription._id
        }, { session });
      }

      await session.commitTransaction();

      const populatedSubscription = await VendorSubscription.findById(updatedSubscription._id)
        .populate('planId', 'name price features')
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
        .populate('planId', 'name price')
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
        if (sub.lastPaymentDate || (sub.status === 'active' && sub.planId)) {
          const amount = sub.planId?.price || 0;

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
              planName: sub.planId?.name || 'Unknown',
              date: sub.lastPaymentDate || sub.startDate || sub.createdAt,
              invoiceUrl: null
            });
          }
        }

        // Add entries from audit logs (renewals and upgrades)
        // Ensure auditLogs is an array and iterate through it
        const auditLogs = Array.isArray(sub.auditLogs) ? sub.auditLogs : [];

        if (auditLogs.length > 0) {
          for (const log of auditLogs) {
            if (!log || !log.action) continue;

            // Renewal entries
            if (log.action === 'renewal' && log.details && typeof log.details === 'object' && log.details.amount) {
              const renewalDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
              billingHistory.push({
                id: `${sub._id}-renewal-${renewalDate.getTime()}`,
                transactionCode: `RENEW-${sub._id}-${renewalDate.getTime()}`,
                amount: log.details.amount,
                type: 'subscription_payment',
                status: log.details.status === 'success' ? 'completed' : 'failed',
                method: sub.paymentMethod || 'razorpay',
                planName: sub.planId?.name || 'Unknown',
                date: renewalDate,
                invoiceUrl: null
              });
            }

            // Subscription payment entries (initial payment)
            if (log.action === 'subscription_payment' && log.details && typeof log.details === 'object' && log.details.amount) {
              const paymentDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
              billingHistory.push({
                id: `${sub._id}-payment-${paymentDate.getTime()}`,
                transactionCode: log.details.razorpayOrderId || `SUB-${sub._id}-${paymentDate.getTime()}`,
                amount: log.details.amount,
                type: 'subscription_payment',
                status: log.details.status === 'completed' ? 'completed' : 'failed',
                method: sub.paymentMethod || 'razorpay',
                planName: log.details.planName || sub.planId?.name || 'Unknown',
                date: paymentDate,
                invoiceUrl: null
              });
            }

            // Upgrade payment entries
            if (log.action === 'upgrade_payment' && log.details && typeof log.details === 'object' && log.details.amount) {
              const upgradeDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
              billingHistory.push({
                id: `${sub._id}-upgrade-${upgradeDate.getTime()}`,
                transactionCode: `UPGRADE-${sub._id}-${upgradeDate.getTime()}`,
                amount: log.details.amount,
                type: 'upgrade_proration',
                status: log.details.status === 'completed' ? 'completed' : 'failed',
                method: sub.paymentMethod || 'razorpay',
                planName: log.details.planName || sub.planId?.name || 'Unknown',
                date: upgradeDate,
                invoiceUrl: null
              });
            }
          }
        }

      }

      // Sort by date (newest first)
      billingHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Billing History] Final billing history count: ${billingHistory.length}`);
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
