import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { vendors, getVendorById, getApprovedVendors } from '../../../data/vendors';
import { products } from '../../../data/products';

export const useVendorStore = create(
  persist(
    (set, get) => ({
      vendors: vendors,
      selectedVendor: null,
      isLoading: false,

      // Initialize vendors - merge initial vendors with stored ones
      initialize: () => {
        const stored = localStorage.getItem('vendor-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.state?.vendors) {
            // Merge initial vendors with stored vendors (avoid duplicates)
            const initialIds = new Set(vendors.map(v => v.id));
            const storedVendors = parsed.state.vendors;
            const newVendors = storedVendors.filter(v => !initialIds.has(v.id));
            set({ vendors: [...vendors, ...newVendors] });
            return;
          }
        }
        // If no stored data, use initial vendors
        set({ vendors: vendors });
      },

      // Get all vendors
      getAllVendors: () => {
        const state = get();
        if (state.vendors.length === 0) {
          state.initialize();
        }
        return get().vendors;
      },

      // Get vendor by ID
      getVendor: (id) => {
        return getVendorById(id);
      },

      // Get approved vendors only
      getApprovedVendors: () => {
        return getApprovedVendors();
      },

      // Get vendors by status
      getVendorsByStatus: (status) => {
        return get().vendors.filter((v) => v.status === status);
      },

      // Get vendor products
      getVendorProducts: (vendorId) => {
        return products.filter((p) => p.vendorId === parseInt(vendorId));
      },

      // Get vendor statistics
      getVendorStats: (vendorId) => {
        const vendor = getVendorById(vendorId);
        if (!vendor) return null;

        const vendorProducts = products.filter((p) => p.vendorId === parseInt(vendorId));
        const totalProducts = vendorProducts.length;
        const inStockProducts = vendorProducts.filter((p) => p.stock === 'in_stock').length;
        const lowStockProducts = vendorProducts.filter((p) => p.stock === 'low_stock').length;
        const outOfStockProducts = vendorProducts.filter((p) => p.stock === 'out_of_stock').length;

        return {
          totalProducts,
          inStockProducts,
          lowStockProducts,
          outOfStockProducts,
          totalSales: vendor.totalSales || 0,
          totalEarnings: vendor.totalEarnings || 0,
          rating: vendor.rating || 0,
          reviewCount: vendor.reviewCount || 0,
        };
      },

      // Update vendor status (admin only)
      updateVendorStatus: (vendorId, status, reason = null) => {
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === parseInt(vendorId)
              ? {
                  ...v,
                  status,
                  ...(reason && { suspensionReason: reason }),
                }
              : v
          ),
        }));
      },

      // Update vendor commission rate (admin only)
      updateCommissionRate: (vendorId, commissionRate) => {
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === parseInt(vendorId) ? { ...v, commissionRate } : v
          ),
        }));
      },

      // Add new vendor (admin only)
      addVendor: (vendorData) => {
        const newId = Math.max(...get().vendors.map((v) => v.id), 0) + 1;
        const newVendor = {
          id: newId,
          ...vendorData,
          status: 'pending',
          rating: 0,
          reviewCount: 0,
          totalProducts: 0,
          totalSales: 0,
          totalEarnings: 0,
          isVerified: false,
          joinDate: new Date().toISOString().split('T')[0],
        };

        set((state) => ({
          vendors: [...state.vendors, newVendor],
        }));

        return newVendor;
      },

      // Update vendor profile
      updateVendorProfile: (vendorId, profileData) => {
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === parseInt(vendorId) ? { ...v, ...profileData } : v
          ),
        }));
      },

      // Set selected vendor
      setSelectedVendor: (vendorId) => {
        const vendor = getVendorById(vendorId);
        set({ selectedVendor: vendor });
      },

      // Clear selected vendor
      clearSelectedVendor: () => {
        set({ selectedVendor: null });
      },
    }),
    {
      name: 'vendor-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

