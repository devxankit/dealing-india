import Subscription from '../Models/SubscriptionModel.js';
import Plan from '../Models/SubscriptionTier.model.js';

import B2BSubscription from '../Models/B2BSubscriptionModel.js';
import B2BPlan from '../Models/B2BSubscriptionPlan.model.js';
import razorpay from '../Config/razorpay.js';
import crypto from 'crypto';

/* ============ CREATE SUBSCRIPTION ============ */
export const createSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    const vendorId = req.user.vendorId || req.user.id;

    if (!planId || !vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive',
      });
    }

    const activeSubscription = await Subscription.findOne({
      vendorId,
      status: 'active',
      isDeleted: false,
    });

    if (activeSubscription) {
      return res.status(400).json({
        success: false,
        message: 'Your current plan is already active',
      });
    }

    let razorpaySubscriptionId = null;
    let razorpaySubscriptionUrl = null;

    if (plan.priceMonthly > 0 && plan.razorpayPlanId) {
      const razorpaySub = await razorpay.subscriptions.create({
        plan_id: plan.razorpayPlanId,
        customer_notify: 1,
        total_count: 12,
      });

      razorpaySubscriptionId = razorpaySub.id;
      razorpaySubscriptionUrl = razorpaySub.short_url;
    }

    const subscription = await Subscription.create({
      vendorId,
      planId,
      razorpaySubscriptionId,
      razorpaySubscriptionUrl,
      status: plan.priceMonthly > 0 ? 'pending' : 'active',
      finalPayableAmount: plan.priceMonthly,
    });

    return res.status(201).json({
      success: true,
      message:
        plan.priceMonthly > 0
          ? 'Subscription created. Complete payment'
          : 'Free plan activated',
      subscription,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ GET SUBSCRIPTION OF B2C VENDOR ============ */
export const getSubscriptionByAdmin = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      vendorId: req.user.vendorId || req.user.id,
      isDeleted: false,
      status: { $in: ['active', 'cancelled', 'pending'] },
    });

    res.status(200).json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ GET ALL SUBSCRIPTIONS ============ */
export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      isDeleted: false,
    }).populate('vendorId planId');

    res.status(200).json({
      success: true,
      message: 'Subscriptions fetched successfully',
      subscriptions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ CANCEL SUBSCRIPTION ============ */
export const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription || subscription.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    if (!subscription.razorpaySubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay subscription ID missing',
      });
    }

    const razorpayResponse = await razorpay.subscriptions.cancel(
      subscription.razorpaySubscriptionId
    );

    subscription.status = 'cancelled';
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription cancel initiated',
      razorpay: razorpayResponse,
    });
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ GET ALL B2C SUBSCRIPTION PLANS ============ */
export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ priceMonthly: 1 });

    res.status(200).json({
      success: true,
      message: 'Plans fetched successfully',
      plans,
    });
  } catch (error) {
    console.error('Get Plans Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ GET B2C SUBSCRIPTION DETAILS BY ID ============ */
export const getSubscriptionDetails = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId)
      .populate('planId')
      .populate('vendorId', 'businessName email phone');

    if (!subscription || subscription.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // If not admin, ensure the vendor can only see their own subscription
    if (req.user.role !== 'admin') {
      const vendorId = req.user.vendorId || req.user.id;
      if (subscription.vendorId._id.toString() !== vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own subscriptions.',
        });
      }
    }

    // Fetch Razorpay subscription details if available
    let razorpayDetails = null;
    if (subscription.razorpaySubscriptionId) {
      try {
        razorpayDetails = await razorpay.subscriptions.fetch(
          subscription.razorpaySubscriptionId
        );
      } catch (rzpError) {
        console.error('Error fetching Razorpay details:', rzpError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Subscription details fetched successfully',
      subscription,
      razorpayDetails,
    });
  } catch (error) {
    console.error('Get Subscription Details Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ GET ALL B2B SUBSCRIPTION PLANS ============ */
export const getAllB2BPlans = async (req, res) => {
  try {
    const plans = await B2BPlan.find({ isActive: true }).sort({ duration: 1 });

    res.status(200).json({
      success: true,
      message: 'B2B Plans fetched successfully',
      plans,
    });
  } catch (error) {
    console.error('Get B2B Plans Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ GET B2B SUBSCRIPTION DETAILS BY ID ============ */
export const getB2BSubscriptionDetails = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await B2BSubscription.findById(subscriptionId)
      .populate('planId')
      .populate('vendorId', 'businessName email phone');

    if (!subscription || subscription.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'B2B Subscription not found',
      });
    }

    // If not admin, ensure the vendor can only see their own subscription
    if (req.user.role !== 'admin') {
      const vendorId = req.user.id || req.user.adminId;
      if (subscription.vendorId._id.toString() !== vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own subscriptions.',
        });
      }
    }

    // Fetch Razorpay subscription details if available
    let razorpayDetails = null;
    if (subscription.razorpaySubscriptionId) {
      try {
        razorpayDetails = await razorpay.subscriptions.fetch(
          subscription.razorpaySubscriptionId
        );
      } catch (rzpError) {
        console.error('Error fetching Razorpay details:', rzpError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'B2B Subscription details fetched successfully',
      subscription,
      razorpayDetails,
    });
  } catch (error) {
    console.error('Get B2B Subscription Details Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ////////////////////////////////B2B Subscription////////////////////////////



/* ============ CREATE B2B SUBSCRIPTION ============ */
export const createB2BSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    // const { id: adminId } = req.user;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const plan = await B2BPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive',
      });
    }

    const activeSubscription = await B2BSubscription.findOne({
      vendorId: req.user.id || req.user.vendorId,
      status: 'active',
      isDeleted: false,
    });

    if (activeSubscription) {
      return res.status(400).json({
        success: false,
        message: 'Your current plan is already active',
      });
    }

    let razorpaySubscriptionId = null;
    let razorpaySubscriptionUrl = null;

    if (plan.price > 0 && plan.razorpayPlanId) {
      const razorpaySub = await razorpay.subscriptions.create({
        plan_id: plan.razorpayPlanId,
        customer_notify: 1,
        total_count: 12,
      });

      razorpaySubscriptionId = razorpaySub.id;
      razorpaySubscriptionUrl = razorpaySub.short_url;
    }

    const subscription = await B2BSubscription.create({
      vendorId: req.user.id || req.user.vendorId,
      planId,
      razorpaySubscriptionId,
      razorpaySubscriptionUrl,
      status: plan.price > 0 ? 'pending' : 'active',
      finalPayableAmount: plan.price,
    });

    return res.status(201).json({
      success: true,
      message:
        plan.price > 0
          ? 'Subscription created. Complete payment'
          : 'Free plan activated',
      subscription,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ GET SUBSCRIPTION OF B2B VENDOR ============ */
export const getB2BSubscription = async (req, res) => {
  try {
    // B2B subscriptions use adminId field, not vendorId
    const adminId = req.user.id || req.user.vendorId;

    const subscriptions = await B2BSubscription.find({
      vendorId: adminId,
      isDeleted: false,
      status: { $in: ['active', 'cancelled'] },
    });

    res.status(200).json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ GET ALL SUBSCRIPTIONS ============ */
export const getAllB2BSubscriptions = async (req, res) => {
  try {
    const subscriptions = await B2BSubscription.find({
      isDeleted: false,
    }).populate('vendorId planId');

    res.status(200).json({
      success: true,
      message: 'Subscriptions fetched successfully',
      subscriptions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============ CANCEL SUBSCRIPTION ============ */
export const cancelB2BSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await B2BSubscription.findById(subscriptionId);

    if (!subscription || subscription.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    if (!subscription.razorpaySubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay subscription ID missing',
      });
    }

    const razorpayResponse = await razorpay.subscriptions.cancel(
      subscription.razorpaySubscriptionId
    );

    subscription.status = 'cancelled';
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription cancel initiated',
      razorpay: razorpayResponse,
    });
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const razorpaySignature = req.headers['x-razorpay-signature'];

    // Convert req.body to Buffer if it's an object
    const bodyBuffer =
      Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    // Verify HMAC
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyBuffer)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    // Parse JSON after verifying signature
    const event = JSON.parse(bodyBuffer.toString('utf-8'));
    const eventType = event.event;

    console.log('🔔 Razorpay Event:', eventType);

    const razorpaySubId = event.payload.subscription?.entity?.id;

    if (!razorpaySubId) return res.status(200).json({ success: true });

    // Find subscription
    let subscription = await Subscription.findOne({
      razorpaySubscriptionId: razorpaySubId,
    });

    let modelType = 'B2C';

    if (!subscription) {
      subscription = await B2BSubscription.findOne({
        razorpaySubscriptionId: razorpaySubId,
      });
      modelType = 'B2B';
    }

    if (!subscription) {
      console.log('⚠️ Subscription not found');
      return res.status(200).json({ success: true });
    }

    const SubscriptionModel = modelType === 'B2C' ? Subscription : B2BSubscription;

    // Event handling
    switch (eventType) {
      case 'subscription.activated':
        await SubscriptionModel.updateMany(
          { vendorId: subscription.vendorId, _id: { $ne: subscription._id }, status: 'active' },
          { status: 'expired' }
        );
        subscription.status = 'active';
        subscription.subscriptionDetails = event.payload.subscription.entity;
        subscription.paymentDetails = event.payload.payment?.entity || null;
        await subscription.save();
        break;

      case 'subscription.cancelled':
      case 'payment.failed':
        subscription.status = 'cancelled';
        await subscription.save();
        break;

      case 'subscription.charged':
      case 'payment.captured':
        await SubscriptionModel.updateMany(
          { vendorId: subscription.vendorId, _id: { $ne: subscription._id }, status: 'active' },
          { status: 'expired' }
        );
        subscription.status = 'active';
        subscription.subscriptionDetails = event.payload.subscription?.entity;
        subscription.paymentDetails = event.payload.payment?.entity;
        await subscription.save();
        break;

      default:
        console.log('Unhandled event type:', eventType);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

