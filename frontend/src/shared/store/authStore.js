import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Login action
      login: async (identifier, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/login', { 
            identifier, 
            password 
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
            };

            set({
              user: userData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
            });

            localStorage.setItem('token', token);
            
            return { success: true, user: userData };
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Register action
      register: async (name, email, password, phone) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/register', { 
            name, 
            email, 
            password, 
            phone 
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
            };

            set({
              user: userData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
            });

            localStorage.setItem('token', token);
            
            return { success: true, user: userData };
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        try {
          // Call backend logout endpoint if token exists and is valid
          const token = get().token;
          if (token) {
            try {
              // Check if token is expired before making API call
              const tokenParts = token.split('.');
              if (tokenParts.length === 3) {
                try {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  const exp = payload.exp;
                  const now = Math.floor(Date.now() / 1000);
                  
                  // Only call logout API if token is not expired
                  if (exp && exp > now) {
                    await api.post('/auth/user/logout');
                  }
                } catch (e) {
                  // Token parsing failed, skip API call
                }
              }
            } catch (error) {
              // Silently ignore logout API errors (token might be expired)
              // Still proceed with local logout
            }
          }
        } catch (error) {
          // Ignore errors, proceed with local logout
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
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
            
            // Transform backend user object to frontend format
            const updatedUser = {
              id: user._id || user.id,
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || null,
              isEmailVerified: user.isEmailVerified || false,
              role: user.role || 'user',
            };
            
            set({
              user: updatedUser,
              isLoading: false,
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

      // Verify email with OTP
      verifyEmail: async (email, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/verify-email', { email, otp });

          if (response.success) {
            // Update user's email verification status
            const currentUser = get().user;
            if (currentUser && currentUser.email === email) {
              set({
                user: { ...currentUser, isEmailVerified: true },
                isLoading: false,
              });
            } else {
              set({ isLoading: false });
            }
            return { success: true, message: response.message };
          } else {
            throw new Error(response.message || 'Email verification failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Resend verification OTP
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

      // Initialize auth state from localStorage and validate token
      initialize: async () => {
        const token = localStorage.getItem('token');
        if (token) {
          // First check if token is expired locally before making API call
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const exp = payload.exp;
              const now = Math.floor(Date.now() / 1000);
              
              // If token is expired, clear storage immediately
              if (exp && exp <= now) {
                set({
                  user: null,
                  token: null,
                  isAuthenticated: false,
                });
                localStorage.removeItem('token');
                return;
              }
            }
          } catch (e) {
            // Token parsing failed, might be invalid format
            // Continue to API validation
          }
          
          try {
            // Validate token with backend
            const response = await api.get('/auth/user/me');
            
            if (response.success && response.data) {
              const user = response.data.user;
              
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
              };

              set({
                user: userData,
                token: token,
                isAuthenticated: true,
              });
            } else {
              // Invalid token, clear storage
              set({
                user: null,
                token: null,
                isAuthenticated: false,
              });
              localStorage.removeItem('token');
            }
          } catch (error) {
            // Token invalid or expired, clear storage silently
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
            localStorage.removeItem('token');
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

