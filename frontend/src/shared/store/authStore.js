import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';
import { registerFCMToken } from '../../services/pushNotificationService';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      userType: 'b2b', // Only 'b2b' is supported now

      // Login action
      login: async (identifier, password, rememberMe = false, userType = 'b2b') => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/login', {
            identifier,
            password,
            userType
          });

          if (response.success && response.data) {
            const { user, token } = response.data;

            // Transform backend user object to frontend format
            const userData = {
              id: user._id || user.id,
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || null,
              isEmailVerified: user.isEmailVerified || false,
              role: user.role || 'user',
              currentMarketplace: user.currentMarketplace || 'b2b',
              businessInfo: user.businessInfo || null,
            };

            set({
              user: userData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
              userType: user.currentMarketplace || 'b2b',
            });

            localStorage.setItem('token', token);
            try { await registerFCMToken(true); } catch (e) {}

            return { success: true, user: userData };
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error) {
          set({ isLoading: false });
          let errorMessage = error?.message;
          if (!errorMessage && error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          if (!errorMessage && typeof error?.response?.data === 'string') {
            errorMessage = error.response.data;
          }
          if (!errorMessage) {
            errorMessage = 'Invalid email/phone or password. Please check your credentials and try again.';
          }
          throw new Error(errorMessage);
        }
      },

      // Register action
      register: async (name, email, password, phone, userType = 'b2b', businessInfo = null, referralCode = '') => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/register', {
            name,
            email,
            password,
            phone,
            userType,
            businessInfo,
            referralCode
          });

          if (response.success && response.data) {
            set({ isLoading: false });
            return {
              success: true,
              email: response.data.email,
              message: response.message || 'Registration initiated. Please verify your email.'
            };
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error?.message ||
            error?.response?.data?.message ||
            'Registration failed. Please check your internet connection and try again.';
          throw new Error(errorMessage);
        }
      },

      // Logout action
      logout: async () => {
        try {
          const token = get().token;
          if (token) {
            try {
              const tokenParts = token.split('.');
              if (tokenParts.length === 3) {
                try {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  const exp = payload.exp;
                  const now = Math.floor(Date.now() / 1000);
                  if (exp && exp > now) {
                    await api.post('/auth/user/logout');
                  }
                } catch (e) { }
              }
            } catch (error) { }
          }
        } catch (error) {
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            userType: 'b2b',
          });
          localStorage.removeItem('token');
        }
      },

      // Update user profile
      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          const response = await api.put('/auth/user/profile', profileData);

          if (response.success && response.data) {
            const user = response.data.user;
            const updatedUser = {
              id: user._id || user.id,
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || null,
              isEmailVerified: user.isEmailVerified || false,
              role: user.role || 'user',
              currentMarketplace: user.currentMarketplace || 'b2b',
              businessInfo: user.businessInfo || null,
            };

            set({
              user: updatedUser,
              isLoading: false,
              userType: updatedUser.currentMarketplace || 'b2b',
            });

            return { success: true, user: updatedUser };
          } else {
            throw new Error(response.message || 'Profile update failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Change password
      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true });
        try {
          const response = await api.put('/auth/user/change-password', {
            currentPassword,
            newPassword
          });
          if (response.success) {
            set({ isLoading: false });
            return { success: true };
          } else {
            throw new Error(response.message || 'Password change failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Verify email
      verifyEmail: async (email, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/verify-email', { email, otp });
          if (response.success && response.data) {
            const { user, token } = response.data;
            const userData = {
              id: user._id || user.id,
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || null,
              isEmailVerified: user.isEmailVerified || true,
              role: user.role || 'user',
              currentMarketplace: user.currentMarketplace || 'b2b',
              businessInfo: user.businessInfo || null,
            };
            set({
              user: userData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
              userType: userData.currentMarketplace || 'b2b',
            });
            localStorage.setItem('token', token);
            return { success: true, user: userData, message: response.message };
          } else {
            throw new Error(response.message || 'Email verification failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Resend OTP
      resendOTP: async (email) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/resend-otp', { email });
          if (response.success) {
            set({ isLoading: false });
            return { success: true, message: response.message };
          } else {
            throw new Error(response.message || 'Failed to resend OTP');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Forgot password
      forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/forgot-password', { email });
          if (response.success) {
            set({ isLoading: false });
            return { success: true, message: response.message };
          } else {
            throw new Error(response.message || 'Failed to send password reset OTP');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Reset password with OTP
      resetPassword: async (email, otp, newPassword) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/reset-password', {
            email,
            otp,
            newPassword
          });
          if (response.success) {
            set({ isLoading: false });
            return { success: true, message: response.message };
          } else {
            throw new Error(response.message || 'Password reset failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Initialize
      initialize: async () => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const exp = payload.exp;
              const now = Math.floor(Date.now() / 1000);
              if (exp && exp <= now) {
                set({ user: null, token: null, isAuthenticated: false, userType: 'b2b' });
                localStorage.removeItem('token');
                return;
              }
            }
          } catch (e) { }

          try {
            const response = await api.get('/auth/user/me');
            if (response.success && response.data) {
              const user = response.data.user;
              const userData = {
                id: user._id || user.id,
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                avatar: user.avatar || null,
                isEmailVerified: user.isEmailVerified || false,
                role: user.role || 'user',
                currentMarketplace: user.currentMarketplace || 'b2b',
                businessInfo: user.businessInfo || null,
              };
              set({
                user: userData,
                token: token,
                isAuthenticated: true,
                userType: userData.currentMarketplace || 'b2b',
              });
            } else {
              set({ user: null, token: null, isAuthenticated: false, userType: 'b2b' });
              localStorage.removeItem('token');
            }
          } catch (error) {
            set({ user: null, token: null, isAuthenticated: false, userType: 'b2b' });
            localStorage.removeItem('token');
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        userType: state.userType,
      }),
    }
  )
);
