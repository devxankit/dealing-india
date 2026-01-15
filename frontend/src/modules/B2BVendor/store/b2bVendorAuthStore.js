import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../../../shared/utils/api';

export const useB2BVendorAuthStore = create(
    persist(
        (set) => ({
            vendor: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,

            login: async (email, password) => {
                set({ loading: true });
                try {
                    const response = await api.post('/auth/vendor/login', { email, password });

                    if (response.success && response.data) {
                        const { vendor, token } = response.data;

                        // Transform backend vendor object to frontend format
                        const vendorData = {
                            id: vendor._id || vendor.id,
                            _id: vendor._id,
                            name: vendor.name,
                            email: vendor.email,
                            storeName: vendor.storeName,
                            role: vendor.role || 'vendor',
                            vendorType: vendor.vendorType
                        };

                        localStorage.setItem('b2b-vendor-token', token);
                        set({ vendor: vendorData, token, isAuthenticated: true, loading: false });
                        return { success: true };
                    } else {
                        set({ loading: false });
                        return { success: false, message: response.message || 'Login failed' };
                    }
                } catch (error) {
                    set({ loading: true });
                    const message = error.response?.data?.message || 'Login failed';
                    return { success: false, message };
                } finally {
                    set({ loading: false });
                }
            },

            setAuth: (vendor, token) => set({
                vendor,
                token,
                isAuthenticated: !!token,
                error: null
            }),

            logout: () => {
                localStorage.removeItem('b2b-vendor-token');
                set({
                    vendor: null,
                    token: null,
                    isAuthenticated: false,
                    error: null
                });
            },

            setError: (error) => set({ error }),
            setLoading: (loading) => set({ loading }),
        }),
        {
            name: 'b2b-vendor-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
