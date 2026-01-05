import { create } from "zustand";
import api from "../../../shared/utils/api";

export const useAdminVendorWalletStore = create((set, get) => ({
    requests: [],
    stats: {
        totalWithdrawn: 0,
        pendingCount: 0,
        processedToday: 0
    },
    isLoading: false,
    error: null,

    // Fetch pending requests and admin stats
    fetchPendingRequests: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/admin/vendor-wallets/pending-withdrawals');
            if (response.success) {
                set({
                    requests: response.data.requests,
                    stats: response.data.stats,
                    isLoading: false
                });
            } else {
                throw new Error(response.message || 'Failed to fetch pending requests');
            }
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Approve withdrawal
    approveWithdrawal: async (requestId, notes, transactionId) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post(`/admin/vendor-wallets/${requestId}/approve`, {
                notes,
                transactionId
            });
            if (response.success) {
                set({ isLoading: false });
                get().fetchPendingRequests();
                return { success: true, message: response.message };
            } else {
                throw new Error(response.message || 'Failed to approve withdrawal');
            }
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, message: error.message };
        }
    },

    // Reject withdrawal
    rejectWithdrawal: async (requestId, reason) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post(`/admin/vendor-wallets/${requestId}/reject`, {
                reason
            });
            if (response.success) {
                set({ isLoading: false });
                get().fetchPendingRequests();
                return { success: true, message: response.message };
            } else {
                throw new Error(response.message || 'Failed to reject withdrawal');
            }
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, message: error.message };
        }
    },

    // Clear errors
    clearError: () => set({ error: null })
}));
