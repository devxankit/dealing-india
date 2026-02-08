import { create } from 'zustand';
import api from '../../../shared/utils/api';

/**
 * Subscription Status Store
 * Centralized state management for subscription rules and limits
 * 
 * BUSINESS RULES:
 * - All plans valid for 1 year
 * - Without active subscription: No listings allowed
 * 
 * TEXTILE VENDOR PLANS:
 * - BASIC: Max 50 products, NO lot/slot
 * - SILVER: Max 100 products, NO lot/slot  
 * - DIAMOND: Unlimited products, Lot/Slot allowed
 * 
 * PROPERTY VENDOR PLANS:
 * - DEVELOPER PREMIUM: Unlimited properties, Max 50 images per property
 * - BROKER PREMIUM: Unlimited properties, Max 5 images per property
 */

export const useSubscriptionStore = create((set, get) => ({
    // State
    status: null,
    loading: false,
    error: null,
    lastFetched: null,

    // Fetch subscription status from API
    fetchStatus: async (force = false) => {
        const state = get();

        // Skip if already loading
        if (state.loading) return state.status;

        // Skip refresh if data was fetched recently (5 min cache)
        const CACHE_DURATION = 5 * 60 * 1000;
        if (!force && state.lastFetched && (Date.now() - state.lastFetched) < CACHE_DURATION) {
            return state.status;
        }

        set({ loading: true, error: null });

        try {
            const response = await api.get('/vendor/subscription/status');

            if (response.success && response.data) {
                set({
                    status: response.data,
                    loading: false,
                    lastFetched: Date.now()
                });
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to fetch subscription status');
            }
        } catch (error) {
            console.error('Error fetching subscription status:', error);
            set({
                loading: false,
                error: error.message || 'Failed to fetch subscription status'
            });
            return null;
        }
    },

    // Clear status (on logout)
    clearStatus: () => {
        set({ status: null, loading: false, error: null, lastFetched: null });
    },

    // Refresh status after actions (like creating a product)
    refreshStatus: async () => {
        const state = get();
        // Force refresh by clearing lastFetched
        set({ lastFetched: null });
        return state.fetchStatus(true);
    },

    // Helper getters
    hasActiveSubscription: () => {
        const state = get();
        return state.status?.hasSubscription === true;
    },

    canCreateProduct: () => {
        const state = get();
        if (!state.status?.hasSubscription) return { allowed: false, message: 'Please purchase a subscription plan to start listing.' };

        const limits = state.status?.limits?.products;
        if (!limits?.allowed) return { allowed: false, message: 'Your subscription does not allow product listings.' };

        // Check remaining limit
        if (limits.limit !== -1 && limits.remaining !== undefined && limits.remaining <= 0) {
            return {
                allowed: false,
                message: `Product limit reached (${limits.current}/${limits.limit}). Please upgrade your plan.`
            };
        }

        return {
            allowed: true,
            remaining: limits.remaining,
            current: limits.current,
            limit: limits.limit
        };
    },

    canCreateLotSlot: () => {
        const state = get();
        if (!state.status?.hasSubscription) return { allowed: false, message: 'Please purchase a subscription plan to start listing.' };

        const limits = state.status?.limits?.lotSlot;
        if (!limits?.allowed) {
            return {
                allowed: false,
                message: 'Lot/Slot listings require Diamond plan. Please upgrade your subscription.'
            };
        }

        return { allowed: true };
    },

    canCreateProperty: () => {
        const state = get();
        if (!state.status?.hasSubscription) return { allowed: false, message: 'Please purchase a subscription plan to start listing.' };

        const limits = state.status?.limits?.properties;
        if (!limits?.allowed) {
            return {
                allowed: false,
                message: 'Your subscription does not allow property listings.'
            };
        }

        return {
            allowed: true,
            maxImages: limits.maxImages
        };
    },

    // Get plan info
    getPlanInfo: () => {
        const state = get();
        return state.status?.plan || null;
    },

    getBusinessType: () => {
        const state = get();
        return state.status?.businessType || 'textile';
    },

    // Check if should show different listing sections based on business type
    isTextileVendor: () => {
        const state = get();
        return state.status?.businessType === 'textile';
    },

    isPropertyVendor: () => {
        const state = get();
        const bt = state.status?.businessType;
        return bt === 'developer' || bt === 'property-broker';
    }
}));

export default useSubscriptionStore;
