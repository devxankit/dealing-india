import { create } from "zustand";

// Re-export cart store from separate file
export { useCartStore } from "./cartStore";

// UI Store (for modals, loading states, etc.)
export const useUIStore = create((set) => ({
  isMenuOpen: false,
  isCartOpen: false,
  isLoading: false,
  cartAnimationTrigger: 0,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  setLoading: (loading) => set({ isLoading: loading }),
  triggerCartAnimation: () =>
    set((state) => ({ cartAnimationTrigger: state.cartAnimationTrigger + 1 })),
}));
