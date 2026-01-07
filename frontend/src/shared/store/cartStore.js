import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "../utils/api";
import { useAuthStore } from "./authStore";
import { getProductById } from "../services/productService";
import toast from "react-hot-toast";

// Import useUIStore to avoid circular dependency - must be after useStore is defined
let useUIStore;
try {
  useUIStore = require("./useStore").useUIStore;
} catch (e) {
  // Fallback if circular dependency issue
  useUIStore = { getState: () => ({ triggerCartAnimation: () => { } }) };
}

// Cart Store
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      isInitialized: false,

      // Initialize cart from backend
      initialize: async () => {
        // Get fresh auth state
        const authState = useAuthStore.getState();
        const { isAuthenticated, token } = authState;

        // Check if user is authenticated
        if (!isAuthenticated) {
          set({ items: [], isInitialized: true, isLoading: false });
          return;
        }

        // Check if token exists in localStorage as well (double check)
        const tokenFromStorage = localStorage.getItem('token');
        if (!token || !tokenFromStorage || token !== tokenFromStorage) {
          set({ items: [], isInitialized: true, isLoading: false });
          return;
        }

        // Check if token is expired before making API call
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const exp = payload.exp;
            const now = Math.floor(Date.now() / 1000);

            // If token is expired, don't make API call
            if (exp && exp <= now) {
              set({ items: [], isLoading: false, isInitialized: true });
              return;
            }
          } else {
            // Invalid token format
            set({ items: [], isLoading: false, isInitialized: true });
            return;
          }
        } catch (e) {
          // Token parsing failed, might be invalid - skip API call
          set({ items: [], isLoading: false, isInitialized: true });
          return;
        }

        try {
          set({ isLoading: true });
          const response = await api.get('/user/cart');

          if (response.success && response.data?.items) {
            const items = response.data.items || [];
            set({
              items: items,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({ items: [], isLoading: false, isInitialized: true });
          }
        } catch (error) {
          // Handle 401 errors silently (user not authenticated)
          // Handle network errors silently - they're already handled by API interceptor
          const isUnauthorized = error?.response?.status === 401 ||
            error?.response?.statusCode === 401 ||
            error?.message?.includes('401') ||
            error?.message?.includes('Unauthorized');

          const isNetworkError = error?.isNetworkError || error?.isConnectionRefused;

          if (isUnauthorized) {
            // User is not authenticated - clear cart and mark as initialized
            set({ items: [], isLoading: false, isInitialized: true });
          } else if (!isNetworkError) {
            // Only log non-network errors
            console.error('Error initializing cart:', error);
            set({ items: [], isLoading: false, isInitialized: true });
          } else {
            // Network errors - silently mark as initialized to prevent retry loops
            set({ items: [], isLoading: false, isInitialized: true });
          }
        }
      },

      addItem: async (item) => {
        const { isAuthenticated } = useAuthStore.getState();

        // Normalize product ID for comparison
        const productId = item.id?.toString() || item._id?.toString();
        if (!productId) {
          toast.error("Product ID is required");
          return;
        }

        // Optimistic update for better UX
        const existingItem = get().items.find((i) =>
          i.id?.toString() === productId || i._id?.toString() === productId
        );
        const quantityToAdd = item.quantity || 1;
        const newQuantity = existingItem
          ? existingItem.quantity + quantityToAdd
          : quantityToAdd;

        // Always fetch product data from API to ensure we have latest stock and pricing info
        let product = null;
        try {
          product = await getProductById(productId);
          // Merge with provided item data to ensure we have all fields
          if (item) {
            product = {
              ...product,
              ...item,
              id: product.id || product._id || productId,
              _id: product._id || product.id || productId,
            };
          }
        } catch (error) {
          console.error('Error fetching product:', error);
          // If API fetch fails and we have item data, use it as fallback
          if (item.name && item.price) {
            product = {
              ...item,
              id: productId,
              stock: item.stock || 'in_stock',
              stockQuantity: item.stockQuantity || 999,
            };
          } else {
            toast.error("Product not found");
            return;
          }
        }

        if (!product) {
          toast.error("Product not found");
          return;
        }

        if (product.stock === "out_of_stock") {
          toast.error("Product is out of stock");
          return;
        }

        // Check stock limit
        if (newQuantity > (product.stockQuantity || 0)) {
          toast.error(`Only ${product.stockQuantity} items available in stock`);
          return;
        }

        if (newQuantity <= 0) {
          return;
        }

        // Prepare item with all necessary data
        const itemWithData = {
          id: product.id || product._id,
          name: product.name,
          price: product.price,
          image: product.image || product.images?.[0] || null,
          quantity: Math.min(newQuantity, product.stockQuantity || newQuantity),
          vendorId: product.vendorId || product.vendor?.id || product.vendor?._id || null,
          vendorName: product.vendorName || product.vendor?.storeName || product.vendor?.businessName || "Unknown Vendor",
          vendor: product.vendor || null,
          stock: product.stock || 'in_stock',
          stockQuantity: product.stockQuantity || 0,
          taxRate: product.taxRate || 0,
          taxIncluded: product.taxIncluded || false,
        };

        // Update local state immediately
        set((state) => {
          const normalizedProductId = productId.toString();
          if (existingItem) {
            return {
              items: state.items.map((i) => {
                const itemId = i.id?.toString() || i._id?.toString();
                if (itemId === normalizedProductId) {
                  return {
                    ...i,
                    ...itemWithData,
                    quantity: Math.min(newQuantity, product.stockQuantity || newQuantity),
                  };
                }
                return i;
              }),
            };
          }
          return {
            items: [...state.items, itemWithData],
          };
        });

        // Sync with backend if authenticated
        if (isAuthenticated) {
          try {
            await api.post('/user/cart', {
              productId: productId,
              quantity: quantityToAdd,
            });
            toast.success("Added to cart!");
          } catch (error) {
            // Revert on error
            const normalizedProductId = productId.toString();
            if (existingItem) {
              set((state) => ({
                items: state.items.map((i) => {
                  const itemId = i.id?.toString() || i._id?.toString();
                  if (itemId === normalizedProductId) {
                    return { ...i, quantity: existingItem.quantity };
                  }
                  return i;
                }),
              }));
            } else {
              set((state) => ({
                items: state.items.filter((i) => {
                  const itemId = i.id?.toString() || i._id?.toString();
                  return itemId !== normalizedProductId;
                }),
              }));
            }
            const errorMessage = error.response?.data?.message || error.message || 'Failed to add to cart';
            toast.error(errorMessage);
            console.error('Error adding to cart:', error);
          }
        } else {
          toast.success("Added to cart!");
        }

        // Trigger cart animation - use dynamic import to avoid circular dependency
        setTimeout(() => {
          import("./useStore").then((module) => {
            try {
              const { triggerCartAnimation } = module.useUIStore.getState();
              triggerCartAnimation();
            } catch (e) {
              // Ignore if UI store not available
            }
          }).catch(() => {
            // Ignore if import fails
          });
        }, 0);

        // Show low stock warning
        if (
          product.stock === "low_stock" &&
          newQuantity >= (product.stockQuantity || 0) * 0.8
        ) {
          toast.warning(`Only ${product.stockQuantity} left in stock!`);
        }
      },

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
            await api.delete(`/user/cart/${id}`);
          } catch (error) {
            // Revert on error
            if (itemToRemove) {
              set((state) => ({
                items: [...state.items, itemToRemove],
              }));
            }
            console.error('Error removing from cart:', error);
          }
        }
      },

      updateQuantity: async (id, quantity) => {
        const { isAuthenticated } = useAuthStore.getState();

        if (quantity <= 0) {
          await get().removeItem(id);
          return;
        }

        // Optimistic update
        const previousQuantity = get().items.find((i) => i.id === id)?.quantity;
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));

        // Sync with backend if authenticated
        if (isAuthenticated) {
          try {
            await api.put(`/user/cart/${id}`, { quantity });
          } catch (error) {
            // Revert on error
            set((state) => ({
              items: state.items.map((item) =>
                item.id === id ? { ...item, quantity: previousQuantity } : item
              ),
            }));
            const errorMessage = error.response?.data?.message || error.message || 'Failed to update quantity';
            toast.error(errorMessage);
            console.error('Error updating quantity:', error);
          }
        }
      },

      clearCart: async () => {
        const { isAuthenticated } = useAuthStore.getState();

        // Optimistic update
        const previousItems = get().items;
        set({ items: [] });

        // Sync with backend if authenticated
        if (isAuthenticated) {
          try {
            await api.delete('/user/cart');
          } catch (error) {
            // Revert on error
            set({ items: previousItems });
            console.error('Error clearing cart:', error);
          }
        }
      },

      getTotal: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + (item.price || 0) * (item.quantity || 0),
          0
        );
      },

      getItemCount: () => {
        const state = get();
        return state.items.reduce((count, item) => count + (item.quantity || 0), 0);
      },

      // Group items by vendor
      getItemsByVendor: () => {
        const state = get();
        const vendorGroups = {};

        state.items.forEach((item) => {
          const vendorId = item.vendorId || 'unknown';
          const vendorName = item.vendorName || "Unknown Vendor";

          if (!vendorGroups[vendorId]) {
            vendorGroups[vendorId] = {
              vendorId,
              vendorName,
              items: [],
              subtotal: 0,
            };
          }

          const itemSubtotal = (item.price || 0) * (item.quantity || 0);
          vendorGroups[vendorId].items.push(item);
          vendorGroups[vendorId].subtotal += itemSubtotal;
        });

        return Object.values(vendorGroups);
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
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

