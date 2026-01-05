import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getVendorById } from '../../data/vendors';

export const useCommissionStore = create(
  persist(
    (set, get) => ({
      commissions: [],
      settlements: [],
      // Stats
      stats: {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        totalOrders: 0
      },
      isLoading: false,
      error: null,

      // Fetch earnings stats from backend
      fetchEarningsStats: async () => {
        set({ isLoading: true, error: null });
        try {
          const { getVendorEarningsStats } = await import('../services/orderService');
          const response = await getVendorEarningsStats();
          if (response.success) {
            // We start with backend data
            set({
              stats: {
                ...get().stats,
                pendingEarnings: response.data.pendingEarnings,
                // "Total Earnings" in UI usually means Realized + Pending? Or just Realized?
                // The backend returns totalOrderEarnings (sum of all valid orders)
                totalEarnings: response.data.totalOrderEarnings
              }
            });
          }
        } catch (error) {
          console.error(error);
          set({ error: error.message, isLoading: false });
        } finally {
          set({ isLoading: false });
        }
      },

      // Get vendor commissions (now derived or fetched, but keeping for compatibility)
      getVendorCommissions: (vendorId) => {
        // This might return the local commissions state, or empty if we are using the derived approach in Earnings.jsx
        // For now, let's just return what's in the store commissions array
        return get().commissions.filter(c => c.vendorId === vendorId || c.vendorId === parseInt(vendorId));
      },

      // Get vendor settlements
      getVendorSettlements: (vendorId) => {
        // Currently fetching valid settlements or empty
        return get().settlements?.filter(s => s.vendorId === vendorId || s.vendorId === parseInt(vendorId)) || [];
      },

      // Record commission (legacy/local)
      recordCommission: (orderId, vendorItems) => {
        // ... implementation if needed, but we are moving to backend
      },

      // Mark commission as paid (settlement)
      markCommissionAsPaid: (commissionId, settlementData = {}) => {
        // ... implementation if needed
      },

      calculateCommission: (vendorId, itemPrice, quantity) => {
        const vendor = getVendorById(vendorId);
        if (!vendor) return { subtotal: 0, commission: 0, vendorEarnings: 0 };
        const subtotal = itemPrice * quantity;
        const commissionRate = vendor.commissionRate || 10;
        const commission = (subtotal * commissionRate) / 100;
        return {
          subtotal,
          commissionRate,
          commission,
          vendorEarnings: subtotal - commission,
        };
      },
    }),
    {
      name: 'commission-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

