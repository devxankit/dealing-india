import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      isInitialized: false,

      // Initialize wishlist from backend
      initialize: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          set({ items: [], isInitialized: true });
          return;
        }

        try {
          set({ isLoading: true });
          const response = await api.get('/user/wishlist');
          
          if (response.success && response.data?.products) {
            const products = response.data.products || [];
            set({
              items: products,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({ items: [], isLoading: false, isInitialized: true });
          }
        } catch (error) {
          console.error('Error initializing wishlist:', error);
          set({ items: [], isLoading: false, isInitialized: true });
        }
      },

      // Add item to wishlist
      addItem: async (item) => {
        const { isAuthenticated } = useAuthStore.getState();
        
        // Optimistic update for better UX
        const existingItem = get().items.find((i) => i.id === item.id);
        if (existingItem) {
          return; // Item already in wishlist
        }

        // Add to local state immediately
        set((state) => ({
          items: [...state.items, { ...item }],
        }));

        // Sync with backend if authenticated
        if (isAuthenticated) {
          try {
            await api.post('/user/wishlist', { productId: item.id });
            toast.success('Added to wishlist');
          } catch (error) {
            // Revert on error
            set((state) => ({
              items: state.items.filter((i) => i.id !== item.id),
            }));
            toast.error('Failed to add to wishlist');
            console.error('Error adding to wishlist:', error);
          }
        } else {
          toast.success('Added to wishlist');
        }
      },

      // Remove item from wishlist
      removeItem: async (id) => {
        const { isAuthenticated } = useAuthStore.getState();
        
        // Optimistic update
        const itemToRemove = get().items.find((i) => i.id === id);
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        // Sync with backend if authenticated
        if (isAuthenticated) {
          try {
            await api.delete(`/user/wishlist/${id}`);
            toast.success('Removed from wishlist');
          } catch (error) {
            // Revert on error
            if (itemToRemove) {
              set((state) => ({
                items: [...state.items, itemToRemove],
              }));
            }
            toast.error('Failed to remove from wishlist');
            console.error('Error removing from wishlist:', error);
          }
        } else {
          toast.success('Removed from wishlist');
        }
      },

      // Check if item is in wishlist
      isInWishlist: (id) => {
        const state = get();
        return state.items.some((item) => item.id === id?.toString());
      },

      // Clear wishlist
      clearWishlist: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        
        // Optimistic update
        const previousItems = get().items;
        set({ items: [] });

        // Sync with backend if authenticated
        if (isAuthenticated) {
          try {
            await api.delete('/user/wishlist');
            toast.success('Wishlist cleared');
          } catch (error) {
            // Revert on error
            set({ items: previousItems });
            toast.error('Failed to clear wishlist');
            console.error('Error clearing wishlist:', error);
          }
        } else {
          toast.success('Wishlist cleared');
        }
      },

      // Get wishlist count
      getItemCount: () => {
        const state = get();
        return state.items.length;
      },

      // Move item from wishlist to cart (returns item for cart)
      moveToCart: async (id) => {
        const state = get();
        const item = state.items.find((i) => i.id === id);
        if (item) {
          // Remove from wishlist (will sync with backend if authenticated)
          await get().removeItem(id);
          return item;
        }
        return null;
      },

      // Reset store (logout)
      reset: () => {
        set({
          items: [],
          isLoading: false,
          isInitialized: false,
        });
      },
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
