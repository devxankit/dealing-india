import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useDeliveryAuthStore = create(
  persist(
    (set, get) => ({
      deliveryBoy: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Delivery boy login action
      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          // Mock delivery boy authentication
          // In a real app, this would be an API call
          // const response = await api.post('/delivery/auth/login', { email, password });
          
          // Mock credentials: delivery@delivery.com / delivery123
          if (email === 'delivery@delivery.com' && password === 'delivery123') {
            const mockDeliveryBoy = {
              id: 'delivery-1',
              name: 'Delivery Boy',
              email: email,
              phone: '+1234567890',
              vehicleType: 'Bike',
              vehicleNumber: 'DL-01-AB-1234',
              avatar: null,
              status: 'available', // available, busy, offline
            };
            const mockToken = 'delivery-jwt-token-' + Date.now();

            set({
              deliveryBoy: mockDeliveryBoy,
              token: mockToken,
              isAuthenticated: true,
              isLoading: false,
            });

            // Store token in localStorage for API interceptor
            localStorage.setItem('delivery-token', mockToken);
            
            return { success: true, deliveryBoy: mockDeliveryBoy };
          } else {
            throw new Error('Invalid credentials');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Delivery boy logout action
      logout: () => {
        set({
          deliveryBoy: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('delivery-token');
      },

      // Update delivery boy status
      updateStatus: (status) => {
        const current = get();
        if (current.deliveryBoy) {
          set({
            deliveryBoy: {
              ...current.deliveryBoy,
              status: status,
            },
          });
        }
      },

      // Initialize delivery auth state from localStorage
      initialize: () => {
        const token = localStorage.getItem('delivery-token');
        if (token) {
          const storedState = JSON.parse(localStorage.getItem('delivery-auth-storage') || '{}');
          if (storedState.state?.deliveryBoy && storedState.state?.token) {
            set({
              deliveryBoy: storedState.state.deliveryBoy,
              token: storedState.state.token,
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    {
      name: 'delivery-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

