import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAddressStore = create(
  persist(
    (set, get) => ({
      addresses: [
        {
          id: '1',
          name: 'Home',
          fullName: 'John Doe',
          phone: '1234567890',
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States',
          isDefault: true,
        },
        {
          id: '2',
          name: 'Work',
          fullName: 'John Doe',
          phone: '1234567890',
          address: '456 Business Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10002',
          country: 'United States',
          isDefault: false,
        },
      ],

      // Add a new address
      addAddress: (address) => {
        const state = get();
        const newAddress = {
          ...address,
          id: Date.now().toString(),
          isDefault: state.addresses.length === 0,
        };
        
        set((state) => ({
          addresses: [...state.addresses, newAddress],
        }));
        
        return newAddress;
      },

      // Update an existing address
      updateAddress: (id, updatedAddress) => {
        set((state) => ({
          addresses: state.addresses.map((addr) =>
            addr.id === id ? { ...addr, ...updatedAddress } : addr
          ),
        }));
      },

      // Delete an address
      deleteAddress: (id) => {
        set((state) => ({
          addresses: state.addresses.filter((addr) => addr.id !== id),
        }));
      },

      // Set default address
      setDefaultAddress: (id) => {
        set((state) => ({
          addresses: state.addresses.map((addr) => ({
            ...addr,
            isDefault: addr.id === id,
          })),
        }));
      },

      // Get default address
      getDefaultAddress: () => {
        const state = get();
        return state.addresses.find((addr) => addr.isDefault) || state.addresses[0] || null;
      },

      // Get all addresses
      getAddresses: () => {
        const state = get();
        return state.addresses;
      },
    }),
    {
      name: 'address-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

