/**
 * B2B Vendor Subscription Service
 * Handles subscription API calls for B2B vendors
 */

import api from '../../../shared/utils/api';

/**
 * Get active subscription plans
 * @returns {Promise<Array>} List of active subscription plans
 */
export const getPlans = async () => {
    try {
        const response = await api.get('/public/b2b-subscription-plans/active');
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch plans');
    } catch (error) {
        console.error('Error fetching B2B plans:', error);
        throw error;
    }
};

/**
 * Get current vendor subscription
 * @returns {Promise<Object|null>} Current subscription or null
 */
export const getCurrentSubscription = async () => {
    try {
        const response = await api.get('/subscription/getB2BSubscription');
        if (response.success) {
            // Return the first active subscription if exists
            const activeSubscription = response.subscriptions?.find(
                (sub) => sub.status === 'active'
            );
            return activeSubscription || null;
        }
        return null;
    } catch (error) {
        console.error('Error fetching current subscription:', error);
        // If 404 or no subscription, return null
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};

/**
 * Create a new subscription
 * @param {String} planId - Plan ID to subscribe to
 * @returns {Promise<Object>} Subscription details with payment URL
 */
export const createSubscription = async (planId) => {
    try {
        const response = await api.post('/subscription/createB2BSubscription', { planId });
        if (response.success) {
            return response.subscription;
        }
        throw new Error(response.message || 'Failed to create subscription');
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
    }
};

/**
 * Get all vendor subscriptions (active and cancelled)
 * @returns {Promise<Array>} List of subscriptions
 */
export const getAllSubscriptions = async () => {
    try {
        const response = await api.get('/subscription/getB2BSubscription');
        if (response.success) {
            return response.subscriptions || [];
        }
        return [];
    } catch (error) {
        console.error('Error fetching all subscriptions:', error);
        return [];
    }
};

/**
 * Cancel a subscription
 * @param {String} subscriptionId - Subscription ID to cancel
 * @returns {Promise<Object>} Cancellation response
 */
export const cancelSubscription = async (subscriptionId) => {
    try {
        const response = await api.patch(`/subscription/cancelB2BSubscription/${subscriptionId}`);
        if (response.success) {
            return response;
        }
        throw new Error(response.message || 'Failed to cancel subscription');
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        throw error;
    }
};

/**
 * Get subscription details by ID
 * @param {String} subscriptionId - Subscription ID to fetch details for
 * @returns {Promise<Object>} Subscription details including Razorpay info
 */
export const getSubscriptionDetails = async (subscriptionId) => {
    try {
        const response = await api.get(`/subscription/getB2BSubscription/${subscriptionId}`);
        if (response.success) {
            return {
                subscription: response.subscription,
                razorpayDetails: response.razorpayDetails,
            };
        }
        throw new Error(response.message || 'Failed to fetch subscription details');
    } catch (error) {
        console.error('Error fetching subscription details:', error);
        throw error;
    }
};

export default {
    getPlans,
    getCurrentSubscription,
    createSubscription,
    getAllSubscriptions,
    cancelSubscription,
    getSubscriptionDetails,
};
