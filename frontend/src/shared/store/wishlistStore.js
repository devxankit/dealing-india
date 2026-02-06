import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWishlistStore = create(
    persist(
        (set, get) => ({
            items: [],

            // Add item to wishlist
            addItem: (product) => {
                const items = get().items;
                const existingItem = items.find((item) => item.id === product.id);

                if (!existingItem) {
                    set({ items: [...items, product] });
                }
            },

            // Remove item from wishlist
            removeItem: (productId) => {
                set({ items: get().items.filter((item) => item.id !== productId) });
            },

            // Check if item is in wishlist
            isInWishlist: (productId) => {
                return get().items.some((item) => item.id === productId);
            },

            // Clear wishlist
            clearWishlist: () => {
                set({ items: [] });
            },

            // Get wishlist count
            getItemCount: () => {
                return get().items.length;
            },
        }),
        {
            name: 'wishlist-storage',
        }
    )
);
