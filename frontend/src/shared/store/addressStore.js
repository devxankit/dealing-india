import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as addressService from '../services/addressService';

export const useAddressStore = create(
  persist(
    (set, get) => ({
      addresses: [],
      isLoading: false,

      // Fetch addresses from API
      fetchAddresses: async () => {
        try {
          set({ isLoading: true });
          const addresses = await addressService.getAddresses();
          set({ addresses: Array.isArray(addresses) ? addresses : [], isLoading: false });
          return addresses;
        } catch (error) {
          set({ isLoading: false });
          console.error('Error fetching addresses:', error);
          throw error;
        }
      },

      // Add a new address via API
      addAddress: async (address) => {
        try {
          set({ isLoading: true });
          const newAddress = await addressService.createAddress(address);
          
          set((state) => ({
            addresses: [...state.addresses, newAddress],
            isLoading: false,
          }));
          
          return newAddress;
        } catch (error) {
          set({ isLoading: false });
          console.error('Error creating address:', error);
          throw error;
        }
      },

      // Update an existing address via API
      updateAddress: async (id, updatedAddress) => {
        try {
          set({ isLoading: true });
          const updated = await addressService.updateAddress(id, updatedAddress);
          
          set((state) => ({
            addresses: state.addresses.map((addr) =>
              addr.id === id || addr._id === id ? updated : addr
            ),
            isLoading: false,
          }));
          
          return updated;
        } catch (error) {
          set({ isLoading: false });
          console.error('Error updating address:', error);
          throw error;
        }
      },

      // Delete an address via API
      deleteAddress: async (id) => {
        try {
          set({ isLoading: true });
          await addressService.deleteAddress(id);
          
          set((state) => ({
            addresses: state.addresses.filter((addr) => addr.id !== id && addr._id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({ isLoading: false });
          console.error('Error deleting address:', error);
          throw error;
        }
      },

      // Set default address via API
      setDefaultAddress: async (id) => {
        try {
          set({ isLoading: true });
          const updated = await addressService.setDefaultAddress(id);
          
          set((state) => ({
            addresses: state.addresses.map((addr) => ({
              ...addr,
              isDefault: addr.id === id || addr._id === id,
            })),
            isLoading: false,
          }));
          
          return updated;
        } catch (error) {
          set({ isLoading: false });
          console.error('Error setting default address:', error);
          throw error;
        }
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

