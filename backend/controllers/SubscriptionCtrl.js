import SubscriptionService from '../services/subscription.service.js';

/**
 * B2B-Only Subscription Controller
 */

export const getAllB2BPlans = async (req, res, next) => {
    try {
        const plans = await SubscriptionService.getAllTiers(); // Map B2B plans to Tiers in service
        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        next(error);
    }
};

export const createB2BSubscription = async (req, res, next) => {
    try {
        const { planId } = req.body;
        const vendorId = req.user?.vendorId || req.user?.id;
        const result = await SubscriptionService.initializeSubscription(vendorId, planId, req.app.get('io'));
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getB2BSubscription = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.user?.id;
        const subscription = await SubscriptionService.getVendorSubscription(vendorId);
        res.status(200).json({ success: true, data: subscription });
    } catch (error) {
        next(error);
    }
};

export const getAllB2BSubscriptions = async (req, res, next) => {
    try {
        // Basic placeholder for admin
        res.status(200).json({ success: true, data: [] });
    } catch (error) {
        next(error);
    }
};

export const getB2BSubscriptionDetails = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        // Basic implementation
        res.status(200).json({ success: true, data: { id: subscriptionId } });
    } catch (error) {
        next(error);
    }
};

export const cancelB2BSubscription = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        res.status(200).json({ success: true, message: 'Subscription cancelled (placeholder)' });
    } catch (error) {
        next(error);
    }
};

export const razorpayWebhook = async (req, res, next) => {
    try {
        console.log('Razorpay Webhook received');
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        next(error);
    }
};

// Legacy B2C stubs to prevent crashes
export const getAllPlans = (req, res) => res.status(403).json({ success: false, message: 'B2C not supported' });
export const createSubscription = (req, res) => res.status(403).json({ success: false, message: 'B2C not supported' });
export const getSubscriptionByAdmin = (req, res) => res.status(403).json({ success: false, message: 'B2C not supported' });
export const getAllSubscriptions = (req, res) => res.status(403).json({ success: false, message: 'B2C not supported' });
export const getSubscriptionDetails = (req, res) => res.status(403).json({ success: false, message: 'B2C not supported' });
export const cancelSubscription = (req, res) => res.status(403).json({ success: false, message: 'B2C not supported' });
