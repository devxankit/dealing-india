// B2B Subscription Plan Manager
// Manages subscription plans for B2B vendors via API

import api from './api';

// Default plans if none exist
const DEFAULT_PLANS = [
    {
        id: 'plan_3_months',
        name: '3 Months Plan',
        duration: 3,
        price: 9999,
        features: [
            'Unlimited Product Listings',
            'Inquiry Management',
            'Chat Support',
            'Basic Analytics',
            'Standard Visibility'
        ],
        isActive: true
    },
    {
        id: 'plan_6_months',
        name: '6 Months Plan',
        duration: 6,
        price: 18999,
        features: [
            'Unlimited Product Listings',
            'Priority Inquiry Display',
            'Advanced Analytics',
            'Featured Store Badge',
            '24/7 Dedicated Support',
            'Bulk Order Management'
        ],
        isActive: true
    },
    {
        id: 'plan_12_months',
        name: '12 Months Plan',
        duration: 12,
        price: 34999,
        features: [
            'Unlimited Product Listings',
            'Priority Inquiry Display',
            'Advanced Analytics',
            'Featured Store Badge',
            '24/7 Dedicated Support',
            'Bulk Order Management',
            'Custom API Integration',
            'Personal Account Manager'
        ],
        isActive: true
    }
];

// Cache for plans (to avoid multiple API calls)
let plansCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all B2B subscription plans from API
 * @param {Boolean} forceRefresh - Force refresh from API
 * @returns {Promise<Array>} Array of plans
 */
export const getB2BPlans = async (forceRefresh = false) => {
    try {
        // Return cached data if available and not expired
        if (!forceRefresh && plansCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
            return plansCache;
        }

        const response = await api.get('/admin/b2b-subscription-plans/active');
        if (response.success && response.data) {
            plansCache = response.data;
            cacheTimestamp = Date.now();
            return response.data;
        }
        
        // Fallback to default if API fails
        console.warn('Failed to fetch plans from API, using defaults');
        return DEFAULT_PLANS;
    } catch (error) {
        console.error('Error getting B2B plans from API:', error);
        // Return cached data if available, otherwise defaults
        return plansCache || DEFAULT_PLANS;
    }
};

/**
 * Get active plans only (synchronous version using cache)
 * @returns {Array} Array of active plans
 */
export const getActiveB2BPlansSync = () => {
    if (plansCache) {
        return plansCache.filter(plan => plan.isActive !== false);
    }
    return DEFAULT_PLANS.filter(plan => plan.isActive !== false);
};

/**
 * Get active plans from API (async)
 * @returns {Promise<Array>} Array of active plans
 */
export const getActiveB2BPlans = async () => {
    const plans = await getB2BPlans();
    return plans.filter(plan => plan.isActive !== false);
};

/**
 * Get plan by ID (from cache or API)
 * @param {String} planId - Plan ID
 * @returns {Promise<Object|null>} Plan object or null
 */
export const getB2BPlanById = async (planId) => {
    try {
        // Try cache first
        if (plansCache) {
            const plan = plansCache.find(p => p._id === planId || p.id === planId);
            if (plan) return plan;
        }

        // Fetch from API
        const response = await api.get(`/admin/b2b-subscription-plans/${planId}`);
        if (response.success && response.data) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error getting plan by ID:', error);
        // Try cache as fallback
        if (plansCache) {
            return plansCache.find(p => p._id === planId || p.id === planId) || null;
        }
        return null;
    }
};

/**
 * Get plan by ID synchronously (from cache)
 * @param {String} planId - Plan ID
 * @returns {Object|null} Plan object or null
 */
export const getB2BPlanByIdSync = (planId) => {
    if (plansCache) {
        return plansCache.find(p => p._id === planId || p.id === planId) || null;
    }
    return DEFAULT_PLANS.find(p => p._id === planId || p.id === planId) || null;
};

/**
 * Update a plan via API
 * @param {String} planId - Plan ID
 * @param {Object} updates - Update data
 * @returns {Promise<Object>} Updated plan
 */
export const updateB2BPlan = async (planId, updates) => {
    try {
        const response = await api.put(`/admin/b2b-subscription-plans/${planId}`, updates);
        if (response.success && response.data) {
            // Clear cache to force refresh
            plansCache = null;
            cacheTimestamp = null;
            return response.data;
        }
        throw new Error(response.message || 'Failed to update plan');
    } catch (error) {
        console.error('Error updating plan:', error);
        throw error;
    }
};

/**
 * Create a new plan via API
 * @param {Object} planData - Plan data
 * @returns {Promise<Object>} Created plan
 */
export const createB2BPlan = async (planData) => {
    try {
        const response = await api.post('/admin/b2b-subscription-plans', planData);
        if (response.success && response.data) {
            // Clear cache to force refresh
            plansCache = null;
            cacheTimestamp = null;
            return response.data;
        }
        throw new Error(response.message || 'Failed to create plan');
    } catch (error) {
        console.error('Error creating plan:', error);
        throw error;
    }
};

/**
 * Delete a plan (soft delete) via API
 * @param {String} planId - Plan ID
 * @returns {Promise<Object>} Deleted plan
 */
export const deleteB2BPlan = async (planId) => {
    try {
        const response = await api.delete(`/admin/b2b-subscription-plans/${planId}`);
        if (response.success && response.data) {
            // Clear cache to force refresh
            plansCache = null;
            cacheTimestamp = null;
            return response.data;
        }
        throw new Error(response.message || 'Failed to delete plan');
    } catch (error) {
        console.error('Error deleting plan:', error);
        throw error;
    }
};

/**
 * Initialize default plans via API
 * @returns {Promise<Array>} Array of plans
 */
export const initializeDefaultPlans = async () => {
    try {
        const response = await api.post('/admin/b2b-subscription-plans/initialize');
        if (response.success && response.data) {
            // Clear cache to force refresh
            plansCache = null;
            cacheTimestamp = null;
            return response.data;
        }
        throw new Error(response.message || 'Failed to initialize plans');
    } catch (error) {
        console.error('Error initializing plans:', error);
        throw error;
    }
};

/**
 * Clear plans cache (useful after updates)
 */
export const clearPlansCache = () => {
    plansCache = null;
    cacheTimestamp = null;
};
