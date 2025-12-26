import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../../../shared/utils/api';

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
          // Trim email and password to remove any whitespace
          const trimmedEmail = email?.trim();
          const trimmedPassword = password?.trim();
          
          if (!trimmedEmail || !trimmedPassword) {
            throw new Error('Email and password are required');
          }
          
          const response = await api.post('/auth/admin/login', { 
            email: trimmedEmail, 
            password: trimmedPassword 
          });

          if (response.success && response.data) {
            const { admin, token } = response.data;
            
            // Transform backend admin object to frontend format
            const adminData = {
              id: admin._id || admin.id,
              _id: admin._id,
              name: admin.name,
              email: admin.email,
              role: admin.role || 'admin',
              avatar: admin.avatar || null,
            };

            set({
              admin: adminData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
            });

            localStorage.setItem('admin-token', token);
            
            return { success: true, admin: adminData };
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Admin logout action
      logout: async () => {
        try {
          // Call backend logout endpoint if token exists
          const token = get().token;
          if (token) {
            try {
              await api.post('/auth/admin/logout');
            } catch (error) {
              // Ignore logout errors, still clear local state
              console.error('Logout API error:', error);
            }
          }
        } catch (error) {
          // Ignore errors, proceed with local logout
        } finally {
          set({
            admin: null,
            token: null,
            isAuthenticated: false,
          });
          localStorage.removeItem('admin-token');
        }
      },

      // Initialize admin auth state from localStorage and validate token
      initialize: async () => {
        const token = localStorage.getItem('admin-token');
        if (token) {
          try {
            // Validate token with backend
            const response = await api.get('/auth/admin/me');
            
            if (response.success && response.data) {
              const admin = response.data.admin;
              
              // Transform backend admin object to frontend format
              const adminData = {
                id: admin._id || admin.id,
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role || 'admin',
                avatar: admin.avatar || null,
              };

              set({
                admin: adminData,
                token: token,
                isAuthenticated: true,
                isLoading: false,
              });
              
              return true;
            } else {
              // Invalid token, clear storage without calling logout to avoid redirect loops
              set({
                admin: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
              });
              localStorage.removeItem('admin-token');
              return false;
            }
          } catch (error) {
            // Token invalid or expired, clear storage
            // Don't call logout here as it might cause redirect loops
            set({
              admin: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            localStorage.removeItem('admin-token');
            return false;
          }
        }
        return false;
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

