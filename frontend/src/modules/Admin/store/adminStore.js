import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAdminAuthStore = create(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Admin login action
      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          // Mock admin authentication
          // In a real app, this would be an API call
          // const response = await api.post('/admin/auth/login', { email, password });
          
          // Mock credentials: admin@admin.com / admin123
          if (email === 'admin@admin.com' && password === 'admin123') {
            const mockAdmin = {
              id: 'admin-1',
              name: 'Admin User',
              email: email,
              role: 'admin',
              avatar: null,
            };
            const mockToken = 'admin-jwt-token-' + Date.now();

            set({
              admin: mockAdmin,
              token: mockToken,
              isAuthenticated: true,
              isLoading: false,
            });

            // Store token in localStorage for API interceptor
            localStorage.setItem('admin-token', mockToken);
            
            return { success: true, admin: mockAdmin };
          } else {
            throw new Error('Invalid credentials');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Admin logout action
      logout: () => {
        set({
          admin: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('admin-token');
      },

      // Initialize admin auth state from localStorage
      initialize: () => {
        const token = localStorage.getItem('admin-token');
        if (token) {
          const storedState = JSON.parse(localStorage.getItem('admin-auth-storage') || '{}');
          if (storedState.state?.admin && storedState.state?.token) {
            set({
              admin: storedState.state.admin,
              token: storedState.state.token,
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

