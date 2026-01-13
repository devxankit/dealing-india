import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWholesalerAuthStore = create(
    persist(
        (set) => ({
            wholesaler: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,

            setAuth: (wholesaler, token) => set({
                wholesaler,
                token,
                isAuthenticated: !!token,
                error: null
            }),

            logout: () => set({
                wholesaler: null,
                token: null,
                isAuthenticated: false,
                error: null
            }),

            setError: (error) => set({ error }),
            setLoading: (loading) => set({ loading }),
        }),
        {
            name: 'wholesaler-auth-storage',
        }
    )
);
