import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "../../../shared/utils/api";

export const useVendorAuthStore = create(
  persist(
    (set, get) => ({
      vendor: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Vendor login action
      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
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
              phone: vendor.phone || '',
              storeName: vendor.storeName,
              storeDescription: vendor.storeDescription || '',
              storeLogo: vendor.storeLogo || null,
              status: vendor.status,
              isEmailVerified: vendor.isEmailVerified || false,
              role: vendor.role || 'vendor',
              address: vendor.address || {},
              documents: vendor.documents || {},
              bankDetails: vendor.bankDetails || {},
              commissionRate: vendor.commissionRate ?? 0.1,
            };

            set({
              vendor: vendorData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
            });

            localStorage.setItem("vendor-token", token);

            return { success: true, vendor: vendorData };
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error) {
          // Always reset loading state, even on error
          set({ isLoading: false });
          
          // Ensure error has a message
          const errorMessage = error?.message || 
                               error?.response?.data?.message || 
                               'Login failed. Please check your internet connection and try again.';
          throw new Error(errorMessage);
        }
      },

      // Vendor registration action (now only initiates registration, doesn't create vendor)
      register: async (vendorData) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/vendor/register', {
            name: vendorData.name,
            email: vendorData.email,
            phone: vendorData.phone,
            password: vendorData.password,
            storeName: vendorData.storeName,
            storeDescription: vendorData.storeDescription || '',
            address: vendorData.address || {},
            documents: vendorData.documents || [], // Include documents array
          });

          if (response.success && response.data) {
            // Registration only returns email now - vendor will be created after email verification
            set({ isLoading: false });

            return {
              success: true,
              email: response.data.email,
              message: response.message || 'Registration initiated. Please verify your email to complete registration.',
            };
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error) {
          // Always reset loading state, even on error
          set({ isLoading: false });
          
          // Ensure error has a message
          const errorMessage = error?.message || 
                               error?.response?.data?.message || 
                               'Registration failed. Please check your internet connection and try again.';
          throw new Error(errorMessage);
        }
      },

      // Vendor logout action
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
                    await api.post('/auth/vendor/logout');
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
            vendor: null,
            token: null,
            isAuthenticated: false,
          });
          localStorage.removeItem("vendor-token");
        }
      },

      // Update vendor profile
      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          const response = await api.put('/auth/vendor/profile', profileData);

          if (response.success && response.data) {
            const vendor = response.data.vendor;

            // Transform backend vendor object to frontend format
            const updatedVendor = {
              id: vendor._id || vendor.id,
              _id: vendor._id,
              name: vendor.name,
              email: vendor.email,
              phone: vendor.phone || '',
              storeName: vendor.storeName,
              storeDescription: vendor.storeDescription || '',
              storeLogo: vendor.storeLogo || null,
              status: vendor.status,
              isEmailVerified: vendor.isEmailVerified || false,
              role: vendor.role || 'vendor',
              address: vendor.address || {},
              documents: vendor.documents || {},
              bankDetails: vendor.bankDetails || {},
              commissionRate: vendor.commissionRate ?? 0.1,
            };

            set({
              vendor: updatedVendor,
              isLoading: false,
            });

            return { success: true, vendor: updatedVendor };
          } else {
            throw new Error(response.message || 'Profile update failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Verify vendor email with OTP
      // Verify email with OTP (now creates vendor account)
      verifyEmail: async (email, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/vendor/verify-email', { email, otp });

          if (response.success && response.data) {
            const { vendor, token } = response.data;
            
            // Transform backend vendor object to frontend format
            const vendorDataFormatted = {
              id: vendor._id || vendor.id,
              _id: vendor._id,
              name: vendor.name,
              email: vendor.email,
              phone: vendor.phone || '',
              storeName: vendor.storeName,
              storeDescription: vendor.storeDescription || '',
              storeLogo: vendor.storeLogo || null,
              status: vendor.status,
              isEmailVerified: vendor.isEmailVerified || true, // Should be true after verification
              role: vendor.role || 'vendor',
              address: vendor.address || {},
              documents: vendor.documents || [],
              bankDetails: vendor.bankDetails || {},
              commissionRate: vendor.commissionRate ?? 0.1,
            };

              set({
              vendor: vendorDataFormatted,
              token: token,
              isAuthenticated: false, // Not authenticated until admin approval
                isLoading: false,
              });

            localStorage.setItem("vendor-token", token);
            
            return { 
              success: true, 
              vendor: vendorDataFormatted, 
              message: response.message 
            };
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
          const response = await api.post('/auth/vendor/resend-otp', { email });

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
          const response = await api.post('/auth/vendor/forgot-password', { email });

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
          const response = await api.post('/auth/vendor/reset-password', {
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

      // Initialize vendor auth state from localStorage and validate token
      initialize: async () => {
        const token = localStorage.getItem("vendor-token");
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
                  vendor: null,
                  token: null,
                  isAuthenticated: false,
                });
                localStorage.removeItem("vendor-token");
                return;
              }
            }
          } catch (e) {
            // Token parsing failed, might be invalid format
            // Continue to API validation
          }
          
          try {
            // Validate token with backend
            const response = await api.get('/auth/vendor/me');

            if (response.success && response.data) {
              const vendor = response.data.vendor;

              // Transform backend vendor object to frontend format
              const vendorData = {
                id: vendor._id || vendor.id,
                _id: vendor._id,
                name: vendor.name,
                email: vendor.email,
                phone: vendor.phone || '',
                storeName: vendor.storeName,
                storeDescription: vendor.storeDescription || '',
                storeLogo: vendor.storeLogo || null,
                status: vendor.status,
                isEmailVerified: vendor.isEmailVerified || false,
                role: vendor.role || 'vendor',
                address: vendor.address || {},
                documents: vendor.documents || {},
                bankDetails: vendor.bankDetails || {},
                commissionRate: vendor.commissionRate ?? 0.1,
              };

              // Only set authenticated if vendor is approved
              if (vendorData.status === 'approved') {
                set({
                  vendor: vendorData,
                  token: token,
                  isAuthenticated: true,
                });
              } else {
                // Vendor not approved, clear storage
                set({
                  vendor: null,
                  token: null,
                  isAuthenticated: false,
                });
                localStorage.removeItem("vendor-token");
              }
            } else {
              // Invalid token, clear storage
              set({
                vendor: null,
                token: null,
                isAuthenticated: false,
              });
              localStorage.removeItem("vendor-token");
            }
          } catch (error) {
            // Token invalid or expired, clear storage silently
            set({
              vendor: null,
              token: null,
              isAuthenticated: false,
            });
            localStorage.removeItem("vendor-token");
          }
        }
      },
    }),
    {
      name: "vendor-auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
