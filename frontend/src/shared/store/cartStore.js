import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

export const useCartStore = create(
    persist(
        (set, get) => ({
            items: [],
            isLoading: false,

            // Add item to cart
            addItem: async (product) => {
                const items = get().items;
                const existingItem = items.find(
                    (item) => item.id === product.id &&
                        (!item.variant || !product.variant || item.variant.id === product.variant?.id)
                );

                if (existingItem) {
                    // Update quantity
                    set({
                        items: items.map((item) =>
                            item.id === product.id &&
                                (!item.variant || !product.variant || item.variant?.id === product.variant?.id)
                                ? { ...item, quantity: item.quantity + (product.quantity || 1) }
                                : item
                        ),
                    });
                    toast.success('Cart updated');
                } else {
                    // Add new item
                    set({ items: [...items, { ...product, quantity: product.quantity || 1 }] });
                    toast.success('Added to cart');
                }
            },

            // Remove item from cart
            removeItem: (productId, variantId = null) => {
                set({
                    items: get().items.filter(
                        (item) => !(item.id === productId && (!variantId || item.variant?.id === variantId))
                    ),
                });
                toast.success('Removed from cart');
            },

            // Update item quantity
            updateQuantity: (productId, quantity, variantId = null) => {
                if (quantity <= 0) {
                    get().removeItem(productId, variantId);
                    return;
                }

                set({
                    items: get().items.map((item) =>
                        item.id === productId && (!variantId || item.variant?.id === variantId)
                            ? { ...item, quantity }
                            : item
                    ),
                });
            },

            // Clear cart
            clearCart: () => {
                set({ items: [] });
            },

            // Get cart total
            getTotal: () => {
                return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
            },

            // Get cart count
            getItemCount: () => {
                return get().items.reduce((count, item) => count + item.quantity, 0);
            },

            // Get items by vendor
            getItemsByVendor: () => {
                const items = get().items;
                const vendors = {};

                items.forEach((item) => {
                    const vendorId = item.vendorId || 'unknown';
                    if (!vendors[vendorId]) {
                        vendors[vendorId] = {
                            vendorId,
                            vendorName: item.vendorName || 'Unknown Vendor',
                            items: [],
                        };
                    }
                    vendors[vendorId].items.push(item);
                });

                return Object.values(vendors);
            },
        }),
        {
            name: 'cart-storage',
        }
    )
);
