import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
                    // MOCK LOGIN FOR TESTING
                    if (
                        (email.toLowerCase() === 'mockb2bvendor@example.com' || email.toLowerCase() === 'mockb2b@example.com') &&
                        password === 'password123'
                    ) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const mockVendor = {
                            id: 'mock_b2b_v1',
                            name: 'Mock B2B Vendor',
                            email: email.toLowerCase(),
                            storeName: 'Mock Wholesale Store',
                            role: 'b2b_vendor'
                        };
                        const mockToken = 'mock_token_b2b_vendor_123';
                        localStorage.setItem('token', mockToken);
                        set({ vendor: mockVendor, token: mockToken, isAuthenticated: true, loading: false });
                        return { success: true };
                    }

                    // Actual API call placeholder
                    // const response = await api.post('/b2b-vendor/login', { email, password });
                    return { success: false, message: 'Invalid credentials' };
                } catch (error) {
                    set({ loading: false });
                    return { success: false, message: 'Login failed' };
                }
            },

            setAuth: (vendor, token) => set({
                vendor,
                token,
                isAuthenticated: !!token,
                error: null
            }),

            logout: () => {
                localStorage.removeItem('token');
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
