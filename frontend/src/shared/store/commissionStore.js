import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getVendorById } from '../../data/vendors';
import api from '../utils/api';
import { getVendorEarningsStats } from '../services/orderService';

export const useCommissionStore = create(
  persist(
    (set, get) => ({
      commissions: [],
      settlements: [],
      // Stats
      stats: {
        totalEarnings: 0,
        pendingEarnings: 0,
        deliveredEarnings: 0,
        paidEarnings: 0,
        outstandingAmount: 0,
        totalOrders: 0
      },
      isLoading: false,
      error: null,

      // Fetch earnings stats from backend
      fetchEarningsStats: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await getVendorEarningsStats();

          if (data) {
            set({
              stats: {
                ...get().stats,
                pendingEarnings: data.pendingEarnings || 0,
                totalEarnings: data.totalOrderEarnings || 0,
                deliveredEarnings: data.deliveredEarnings || 0,
                paidEarnings: data.paidEarnings || 0,
                outstandingAmount: data.outstandingAmount || 0,
                totalOrders: data.totalOrders || 0
              }
            });
          }
        } catch (error) {
          console.error('Error in fetchEarningsStats:', error);
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

      // Fetch vendor settlements (approved withdrawals)
      fetchSettlements: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get('/vendor/wallet/withdrawals?status=approved');
          if (response.success) {
            set({ settlements: response.data });
          }
        } catch (error) {
          console.error(error);
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Get vendor settlements
      getVendorSettlements: (vendorId) => {
        // We now fetch from backend, but keeping this for filtered access if needed
        return get().settlements || [];
      },

      // Get vendor earnings summary
      getVendorEarningsSummary: (vendorId) => {
        return get().stats;
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

