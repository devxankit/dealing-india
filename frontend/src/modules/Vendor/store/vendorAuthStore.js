import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { vendors, getVendorById } from "../../../data/vendors";
import { useVendorStore } from "./vendorStore";
import logoImage from "../../../../data/logos/ChatGPT Image Dec 2, 2025, 03_01_19 PM.png";

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
          // Mock vendor authentication
          // In a real app, this would be an API call
          // const response = await api.post('/vendor/auth/login', { email, password });

          // Find vendor by email in vendor store
          const allVendors = useVendorStore.getState().getAllVendors();
          const vendor = allVendors.find((v) => v.email === email);

          // Mock credentials: use vendor email and password "vendor123"
          if (vendor && password === "vendor123") {
            // Check if vendor is approved
            if (vendor.status !== "approved") {
              throw new Error(
                `Vendor account is ${vendor.status}. Please contact admin for approval.`
              );
            }

            const mockToken = "vendor-jwt-token-" + Date.now();

            set({
              vendor: vendor,
              token: mockToken,
              isAuthenticated: true,
              isLoading: false,
            });

            // Store token in localStorage for API interceptor
            localStorage.setItem("vendor-token", mockToken);

            return { success: true, vendor: vendor };
          } else {
            throw new Error("Invalid credentials");
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
          // Mock vendor registration
          // In a real app, this would be an API call
          // const response = await api.post('/vendor/auth/register', vendorData);

          // Check if email already exists in vendor store
          const allVendors = useVendorStore.getState().getAllVendors();
          const existingVendor = allVendors.find(
            (v) => v.email === vendorData.email
          );
          if (existingVendor) {
            throw new Error("Email already registered");
          }

          // Create new vendor (will be pending approval)
          const newVendorData = {
            name: vendorData.name,
            email: vendorData.email,
            phone: vendorData.phone || "",
            storeName: vendorData.storeName,
            storeLogo: vendorData.storeLogo || logoImage,
            storeDescription: vendorData.storeDescription || "",
            commissionRate: 10, // Default commission rate
            address: vendorData.address || {},
            documents: vendorData.documents || {},
            bankDetails: vendorData.bankDetails || {},
          };

          // Add vendor to vendor store (this makes it visible to admin)
          const newVendor = useVendorStore.getState().addVendor(newVendorData);

          // In a real app, this would be saved to backend
          // For now, we'll just return success
          const mockToken = "vendor-jwt-token-" + Date.now();

          set({
            vendor: newVendor,
            token: mockToken,
            isAuthenticated: false, // Not authenticated until approved
            isLoading: false,
          });

          localStorage.setItem("vendor-token", mockToken);

          return {
            success: true,
            vendor: newVendor,
            message:
              "Registration successful! Your account is pending admin approval.",
          };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Vendor logout action
      logout: () => {
        set({
          vendor: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem("vendor-token");
      },

      // Update vendor profile
      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          // Mock update - replace with actual API call
          // const response = await api.put('/vendor/profile', profileData);

          const currentVendor = get().vendor;
          if (!currentVendor) {
            throw new Error("No vendor logged in");
          }

          const updatedVendor = { ...currentVendor, ...profileData };

          set({
            vendor: updatedVendor,
            isLoading: false,
          });

          return { success: true, vendor: updatedVendor };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Initialize vendor auth state from localStorage
      initialize: () => {
        const token = localStorage.getItem("vendor-token");
        if (token) {
          const storedState = JSON.parse(
            localStorage.getItem("vendor-auth-storage") || "{}"
          );
          if (storedState.state?.vendor && storedState.state?.token) {
            const vendor = storedState.state.vendor;
            // Verify vendor is still approved
            const currentVendor = getVendorById(vendor.id);
            if (currentVendor && currentVendor.status === "approved") {
              set({
                vendor: currentVendor,
                token: storedState.state.token,
                isAuthenticated: true,
              });
            } else {
              // Vendor status changed, logout
              get().logout();
            }
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
