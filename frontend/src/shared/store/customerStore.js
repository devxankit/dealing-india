import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const useCustomerStore = create((set, get) => ({
  customers: [],
  isLoading: false,
  currentCustomer: null,

  // Fetch all customers
  initialize: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const { search = '', status = 'all', page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
      
      const response = await api.get('/admin/customers', {
        params: { search, status, page, limit, sortBy, sortOrder },
      });

      if (response.success && response.data) {
        set({ customers: response.data.customers || [], isLoading: false });
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch customers');
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to initialize customers:', error);
      // Don't show toast here as it's handled by interceptor
      return { customers: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }
  },

  // Get all customers (for compatibility)
  getCustomers: () => {
    return get().customers;
  },

  // Get customer by ID
  getCustomerById: async (id) => {
    try {
      const response = await api.get(`/admin/customers/${id}`);
      if (response.success && response.data?.customer) {
        const customer = response.data.customer;
        set({ currentCustomer: customer });
        return customer;
      }
      throw new Error(response.message || 'Customer not found');
    } catch (error) {
      console.error('Failed to get customer:', error);
      throw error;
    }
  },

  // Update customer
  updateCustomer: async (id, customerData) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/admin/customers/${id}`, customerData);
      if (response.success && response.data?.customer) {
        const updatedCustomer = response.data.customer;
        
        // Update in local state
        const customers = get().customers;
        const updatedCustomers = customers.map((customer) =>
          customer.id === id || customer.id === updatedCustomer.id
            ? updatedCustomer
            : customer
        );
        set({ customers: updatedCustomers, currentCustomer: updatedCustomer, isLoading: false });
        
        toast.success('Customer updated successfully');
        return updatedCustomer;
      }
      throw new Error(response.message || 'Failed to update customer');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Toggle customer status
  toggleCustomerStatus: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/admin/customers/${id}/status`);
      if (response.success && response.data?.customer) {
        const updatedCustomer = response.data.customer;
        
        // Update in local state
        const customers = get().customers;
        const updatedCustomers = customers.map((customer) =>
          customer.id === id || customer.id === updatedCustomer.id
            ? updatedCustomer
            : customer
        );
        set({ customers: updatedCustomers, currentCustomer: updatedCustomer, isLoading: false });
        
        toast.success(`Customer status updated to ${updatedCustomer.status}`);
        return updatedCustomer;
      }
      throw new Error(response.message || 'Failed to update customer status');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Add activity to customer history (local only, backend doesn't track this yet)
  addActivity: (customerId, activity) => {
    // This is a local operation for now
    // In the future, this could be sent to backend
    const customers = get().customers;
    const updatedCustomers = customers.map((customer) =>
      customer.id === customerId || customer.id === parseInt(customerId)
        ? {
            ...customer,
            activityHistory: [
              {
                id: Date.now(),
                type: activity.type,
                description: activity.description,
                date: new Date().toISOString(),
              },
              ...(customer.activityHistory || []),
            ].slice(0, 50),
          }
        : customer
    );
    set({ customers: updatedCustomers });
  },
}));
