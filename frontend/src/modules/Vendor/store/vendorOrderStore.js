import { create } from 'zustand';
import { getVendorOrders, getVendorOrderStats } from '../../../shared/services/orderService';
import toast from 'react-hot-toast';

export const useVendorOrderStore = create((set, get) => ({
    orders: [],
    stats: null,
    loading: false,
    error: null,

    fetchVendorOrders: async (filters = {}) => {
        set({ loading: true, error: null });
        try {
            // Default to fetching all if no filters provided or just vendorId
            const queryFilters = {
                limit: 1000,
                ...filters
            };

            const response = await getVendorOrders(queryFilters);
            const data = response.data || response;
            const orders = data.orders || response.orders || [];

            set({ orders, loading: false });
            return orders;
        } catch (error) {
            console.error('Error fetching vendor orders:', error);
            set({ error: error.message, loading: false });
            // toast.error('Failed to load orders');
        }
    },

    fetchVendorOrderStats: async () => {
        try {
            const stats = await getVendorOrderStats();
            set({ stats });
            return stats;
        } catch (error) {
            console.error('Error fetching order stats:', error);
        }
    }
}));
