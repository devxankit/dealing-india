/**
 * B2C Vendor Subscription Service
 * Handles subscription API calls for B2C vendors
 */

import api from '../../../shared/utils/api';

/**
 * Get subscription tiers/plans
 * @returns {Promise<Array>} List of subscription tiers
 */
export const getTiers = async () => {
    try {
        const response = await api.get('/vendor/subscriptions/tiers');
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'Failed to fetch tiers');
    } catch (error) {
        console.error('Error fetching subscription tiers:', error);
        throw error;
    }
};

/**
 * Get current vendor subscription
 * @returns {Promise<Object|null>} Current subscription or null
 */
export const getCurrentSubscription = async () => {
    try {
        const response = await api.get('/subscription/getB2CSubscription');
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
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};

/**
 * Create a new subscription using Razorpay subscription
 * @param {String} planId - Plan ID to subscribe to
 * @returns {Promise<Object>} Subscription details with Razorpay URL
 */
export const createSubscription = async (planId) => {
    try {
        const response = await api.post('/subscription/createB2CSubscription', { planId });
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
        const response = await api.get('/subscription/getB2CSubscription');
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
        const response = await api.patch(`/subscription/cancelB2CSubscription/${subscriptionId}`);
        if (response.success) {
            return response;
        }
        throw new Error(response.message || 'Failed to cancel subscription');
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        throw error;
    }
};

export default {
    getTiers,
    getCurrentSubscription,
    createSubscription,
    getAllSubscriptions,
    cancelSubscription,
};
