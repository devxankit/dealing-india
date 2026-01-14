import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../../../shared/utils/api';

export const useB2BUserAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: localStorage.getItem('token') || null,
            isAuthenticated: !!localStorage.getItem('token'),
            loading: false,

            login: async (email, password) => {
                set({ loading: true });
                try {
                    // MOCK LOGIN FOR TESTING
                    if (email === 'mockb2buser@example.com' && password === 'password123') {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const mockUser = {
                            id: 'mock_b2b_u1',
                            name: 'Mock B2B Buyer',
                            email: 'mockb2buser@example.com',
                            role: 'b2b_user',
                            businessName: 'Mock Enterprises'
                        };
                        const mockToken = 'mock_token_b2b_user_123';
                        localStorage.setItem('token', mockToken);
                        set({ user: mockUser, token: mockToken, isAuthenticated: true, loading: false });
                        return { success: true };
                    }

                    // B2B login might use a different endpoint or same with userType
                    const response = await api.post('/auth/login', { email, password, userType: 'b2b' });
                    if (response.success) {
                        const { user, token } = response.data;
                        localStorage.setItem('token', token);
                        set({ user, token, isAuthenticated: true, loading: false });
                        return { success: true };
                    }
                    return { success: false, message: response.message };
                } catch (error) {
                    set({ loading: false });
                    return { success: false, message: error.response?.data?.message || 'Login failed' };
                }
            },

            register: async (formData) => {
                set({ loading: true });
                try {
                    const response = await api.post('/auth/register', { ...formData, userType: 'b2b' });
                    if (response.success) {
                        set({ loading: false });
                        return { success: true, email: formData.email };
                    }
                    return { success: false, message: response.message };
                } catch (error) {
                    set({ loading: false });
                    return { success: false, message: error.response?.data?.message || 'Registration failed' };
                }
            },

            logout: () => {
                localStorage.removeItem('token');
                set({ user: null, token: null, isAuthenticated: false });
            },

            updateProfile: async (data) => {
                try {
                    const response = await api.put('/user/profile', data);
                    if (response.success) {
                        set({ user: response.data });
                        return { success: true };
                    }
                    return { success: false };
                } catch (error) {
                    return { success: false };
                }
            },
        }),
        {
            name: 'b2b-user-auth',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
