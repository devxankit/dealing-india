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

// Cache for plans (keyed by 'all' or businessType slug)
let plansCache = {};
let cacheTimestamps = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all B2B subscription plans from API
 * @param {Boolean} forceRefresh - Force refresh from API
 * @returns {Promise<Array>} Array of plans
 */
export const getB2BPlans = async (forceRefresh = false, options = {}) => {
    try {
        const { businessType } = options;
        const cacheKey = businessType || 'all';

        // Return cached data if available and not expired
        if (!forceRefresh && plansCache[cacheKey] && cacheTimestamps[cacheKey] && (Date.now() - cacheTimestamps[cacheKey]) < CACHE_DURATION) {
            return plansCache[cacheKey];
        }

        let url = '/public/b2b-subscription-plans/active'; // Default to active endpoint
        // NOTE: The backend endpoint might be different depending on auth/role, but public active seems right for catalog/subscription page

        if (businessType) {
            // Check if backend supports filter on this endpoint or separate endpoint
            // Usually valid endpoint is /public/b2b-subscription-plans or similar
            url += `?businessType=${businessType}`;
        }

        const response = await api.get(url);
        if (response.success && response.data) {
            plansCache[cacheKey] = response.data;
            cacheTimestamps[cacheKey] = Date.now();
            return response.data;
        }

        // Fallback to default if API fails
        console.warn('Failed to fetch plans from API, using defaults');
        return DEFAULT_PLANS;
    } catch (error) {
        console.error('Error getting B2B plans from API:', error);
        // Return cached data if available, otherwise defaults
        const cacheKey = businessType || 'all';
        return plansCache[cacheKey] || DEFAULT_PLANS;
    }
};

/**
 * Get active plans only (synchronous version using cache)
 * @returns {Array} Array of active plans
 */
/**
 * Get active plans only (synchronous version using cache)
 * @returns {Array} Array of active plans
 */
export const getActiveB2BPlansSync = (businessType = null) => {
    const cacheKey = businessType || 'all';
    if (plansCache[cacheKey]) {
        return plansCache[cacheKey].filter(plan => plan.isActive !== false);
    }
    // Try to find in any cache entry if not found directly
    const allCached = Object.values(plansCache).flat();
    if (allCached.length > 0) {
        return allCached.filter(plan => plan.isActive !== false);
    }
    return DEFAULT_PLANS.filter(plan => plan.isActive !== false);
};

// ... (getActiveB2BPlans remains same as it calls getB2BPlans)

/**
 * Get plan by ID (from cache or API)
 * @param {String} planId - Plan ID
 * @returns {Promise<Object|null>} Plan object or null
 */
export const getB2BPlanById = async (planId) => {
    try {
        // Try cache first (search all Cached lists)
        const allCached = Object.values(plansCache).flat();
        const plan = allCached.find(p => p._id === planId || p.id === planId);
        if (plan) return plan;

        // Fetch from API
        const response = await api.get(`/public/b2b-subscription-plans/${planId}`);
        if (response.success && response.data) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error getting plan by ID:', error);
        // Try cache as fallback
        const allCached = Object.values(plansCache).flat();
        return allCached.find(p => p._id === planId || p.id === planId) || null;
    }
};

/**
 * Get plan by ID synchronously (from cache)
 * @param {String} planId - Plan ID
 * @returns {Object|null} Plan object or null
 */
// ... (getActiveB2BPlans was removed in previous step but needed if not included in ... )
export const getActiveB2BPlans = async (options = {}) => {
    const plans = await getB2BPlans(false, options);
    return plans.filter(plan => plan.isActive !== false);
};

/**
 * Get plan by ID synchronously (from cache)
 * @param {String} planId - Plan ID
 * @returns {Object|null} Plan object or null
 */
export const getB2BPlanByIdSync = (planId) => {
    const allCached = Object.values(plansCache).flat();
    if (allCached.length > 0) {
        return allCached.find(p => p._id === planId || p.id === planId) || null;
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
            plansCache = {};
            cacheTimestamps = {};
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
            plansCache = {};
            cacheTimestamps = {};
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
            plansCache = {};
            cacheTimestamps = {};
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
            plansCache = {};
            cacheTimestamps = {};
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
    plansCache = {};
    cacheTimestamps = {};
};
