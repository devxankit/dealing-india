import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api.js';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes - auto-refresh after this

export const useB2BLocationStore = create(
    persist(
        (set, get) => ({
            states: [],
            areas: [],
            markets: [],
            isLoading: false,
            lastFetched: null, // Track when data was last fetched

            initialize: async (forceRefresh = false, options = {}) => {
                const currentState = get();

                if (currentState.isLoading) return;

                // Check if cache is stale (older than 15 minutes)
                const isCacheStale = !currentState.lastFetched ||
                    (Date.now() - currentState.lastFetched) > CACHE_TTL_MS;

                // Only skip fetch if NOT forceRefresh, data exists, AND cache is NOT stale
                if (!forceRefresh && !isCacheStale && currentState.states.length > 0) return;

                set({ isLoading: true });

                try {
                    const params = {};
                    if (options.businessTypeFilter && options.businessTypes) {
                        params.businessTypeFilter = options.businessTypeFilter;
                        params.businessTypes = options.businessTypes;
                    }

                    const response = await api.get('/public/b2b-locations', { params });
                    if (response.success && response.data) {
                        const states = (response.data.states || []).map(state => ({
                            ...state,
                            name: (state.name || '').trim()
                        }));
                        const areas = response.data.areas || [];
                        const markets = response.data.markets || [];
                        set({ states, areas, markets, isLoading: false, lastFetched: Date.now() });
                    } else {
                        set({ isLoading: false });
                    }
                } catch (error) {
                    console.error('Failed to fetch B2B locations:', error);
                    set({ isLoading: false });
                }
            },

            getStates: () => get().states,
        }),
        {
            name: 'b2b-location-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
