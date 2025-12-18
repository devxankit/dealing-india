import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],

      // Add item to wishlist
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem) {
            return state; // Item already in wishlist
          }
          return {
            items: [...state.items, { ...item }],
          };
        }),

      // Remove item from wishlist
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      // Check if item is in wishlist
      isInWishlist: (id) => {
        const state = get();
        return state.items.some((item) => item.id === id);
      },

      // Clear wishlist
      clearWishlist: () => set({ items: [] }),

      // Get wishlist count
      getItemCount: () => {
        const state = get();
        return state.items.length;
      },

      // Move item from wishlist to cart (returns item for cart)
      moveToCart: (id) => {
        const state = get();
        const item = state.items.find((i) => i.id === id);
        if (item) {
          set({
            items: state.items.filter((i) => i.id !== id),
          });
          return item;
        }
        return null;
      },
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

