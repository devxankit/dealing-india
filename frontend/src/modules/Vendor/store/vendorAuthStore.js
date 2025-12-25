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
          set({ isLoading: false });
          throw error;
        }
      },

      // Vendor registration action
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
          });

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
              isEmailVerified: vendor.isEmailVerified || false,
              role: vendor.role || 'vendor',
              address: vendor.address || {},
              documents: vendor.documents || {},
              bankDetails: vendor.bankDetails || {},
            };

            set({
              vendor: vendorDataFormatted,
              token: token,
              isAuthenticated: false, // Not authenticated until approved
              isLoading: false,
            });

            localStorage.setItem("vendor-token", token);

            return {
              success: true,
              vendor: vendorDataFormatted,
              message: response.message || "Registration successful! Your account is pending admin approval.",
            };
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Vendor logout action
      logout: async () => {
        try {
          // Call backend logout endpoint if token exists
          const token = get().token;
          if (token) {
            try {
              await api.post('/auth/vendor/logout');
            } catch (error) {
              // Ignore logout errors, still clear local state
              console.error('Logout API error:', error);
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
      verifyEmail: async (email, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/vendor/verify-email', { email, otp });

          if (response.success) {
            // Update vendor's email verification status
            const currentVendor = get().vendor;
            if (currentVendor && currentVendor.email === email) {
              set({
                vendor: { ...currentVendor, isEmailVerified: true },
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
                get().logout();
              }
            } else {
              // Invalid token, clear storage
              get().logout();
            }
          } catch (error) {
            // Token invalid or expired, clear storage
            get().logout();
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
