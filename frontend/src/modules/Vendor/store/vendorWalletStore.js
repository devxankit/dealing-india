import { create } from "zustand";
import api from "../../../shared/utils/api";

export const useVendorWalletStore = create((set, get) => ({
    wallet: null,
    withdrawals: [],
    transactions: [],
    isLoading: false,
    error: null,

    // Fetch wallet balance and stats
    fetchWallet: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/vendor/wallet');
            if (response.success) {
                set({ wallet: response.data, isLoading: false });
            } else {
                throw new Error(response.message || 'Failed to fetch wallet');
            }
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Request withdrawal (full balance)
    requestWithdrawal: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/vendor/wallet/withdraw');
            if (response.success) {
                set({ isLoading: false });
                // Refresh wallet and withdrawals after successful request
                get().fetchWallet();
                get().fetchWithdrawals();
                return { success: true, message: response.message };
            } else {
                throw new Error(response.message || 'Failed to submit withdrawal request');
            }
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, message: error.message };
        }
    },

    // Fetch withdrawal history
    fetchWithdrawals: async (status = null) => {
        set({ isLoading: true, error: null });
        try {
            const url = status
                ? `/vendor/wallet/withdrawals?status=${status}`
                : '/vendor/wallet/withdrawals';
            const response = await api.get(url);
            if (response.success) {
                set({ withdrawals: response.data, isLoading: false });
            } else {
                throw new Error(response.message || 'Failed to fetch withdrawals');
            }
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Fetch transaction history
    fetchTransactions: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/vendor/wallet/transactions');
            if (response.success) {
                set({ transactions: response.data, isLoading: false });
            } else {
                throw new Error(response.message || 'Failed to fetch transactions');
            }
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    // Clear errors
    clearError: () => set({ error: null })
}));
