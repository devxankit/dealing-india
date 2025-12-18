import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mockCustomers } from '../../data/adminMockData';
import toast from 'react-hot-toast';

export const useCustomerStore = create(
  persist(
    (set, get) => ({
      customers: [],
      isLoading: false,

      // Initialize customers
      initialize: () => {
        const savedCustomers = localStorage.getItem('admin-customers');
        if (savedCustomers) {
          set({ customers: JSON.parse(savedCustomers) });
        } else {
          // Create mock customers with more details
          const initialCustomers = mockCustomers.map((customer, index) => ({
            ...customer,
            phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            status: 'active',
            createdAt: new Date(Date.now() - (index * 7 * 24 * 60 * 60 * 1000)).toISOString(),
            lastOrderDate: new Date(Date.now() - (index * 3 * 24 * 60 * 60 * 1000)).toISOString(),
            addresses: [],
            wishlist: [],
            activityHistory: [],
          }));
          set({ customers: initialCustomers });
          localStorage.setItem('admin-customers', JSON.stringify(initialCustomers));
        }
      },

      // Get all customers
      getCustomers: () => {
        const state = get();
        if (state.customers.length === 0) {
          state.initialize();
        }
        return get().customers;
      },

      // Get customer by ID
      getCustomerById: (id) => {
        return get().customers.find((customer) => customer.id === parseInt(id));
      },

      // Update customer
      updateCustomer: (id, customerData) => {
        set({ isLoading: true });
        try {
          const customers = get().customers;
          const updatedCustomers = customers.map((customer) =>
            customer.id === parseInt(id)
              ? { ...customer, ...customerData, updatedAt: new Date().toISOString() }
              : customer
          );
          set({ customers: updatedCustomers, isLoading: false });
          localStorage.setItem('admin-customers', JSON.stringify(updatedCustomers));
          toast.success('Customer updated successfully');
          return updatedCustomers.find((customer) => customer.id === parseInt(id));
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to update customer');
          throw error;
        }
      },

      // Toggle customer status
      toggleCustomerStatus: (id) => {
        const customer = get().getCustomerById(id);
        if (customer) {
          const newStatus = customer.status === 'active' ? 'blocked' : 'active';
          get().updateCustomer(id, { status: newStatus });
        }
      },

      // Add activity to customer history
      addActivity: (customerId, activity) => {
        const customers = get().customers;
        const updatedCustomers = customers.map((customer) =>
          customer.id === parseInt(customerId)
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
              ].slice(0, 50), // Keep last 50 activities
            }
            : customer
        );
        set({ customers: updatedCustomers });
        localStorage.setItem('admin-customers', JSON.stringify(updatedCustomers));
      },
    }),
    {
      name: 'customer-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

