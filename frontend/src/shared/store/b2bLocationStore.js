import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api.js';

export const useB2BLocationStore = create(
    persist(
        (set, get) => ({
            states: [],
            isLoading: false,

            initialize: async (forceRefresh = false) => {
                const currentState = get();

                if (currentState.isLoading) return;
                if (!forceRefresh && currentState.states.length > 0) return;

                set({ isLoading: true });

                try {
                    const response = await api.get('/public/b2b-locations');
                    if (response.success && response.data) {
                        const states = (response.data.states || []).map(state => ({
                            ...state,
                            name: (state.name || '').trim()
                        }));
                        set({ states, isLoading: false });
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
