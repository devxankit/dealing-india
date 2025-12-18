import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Login action
      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          // For now, using mock authentication
          // Replace with actual API call when backend is ready
          // const response = await api.post('/auth/login', { email, password });
          
          // Mock response for development
          const mockUser = {
            id: '1',
            name: 'John Doe',
            email: email,
            phone: '+1234567890',
            avatar: null,
          };
          const mockToken = 'mock-jwt-token-' + Date.now();

          set({
            user: mockUser,
            token: mockToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Store token in localStorage for API interceptor
          localStorage.setItem('token', mockToken);
          
          return { success: true, user: mockUser };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Register action
      register: async (name, email, password, phone) => {
        set({ isLoading: true });
        try {
          // For now, using mock registration
          // Replace with actual API call when backend is ready
          // const response = await api.post('/auth/register', { name, email, password, phone });
          
          // Mock response for development
          const mockUser = {
            id: '1',
            name: name,
            email: email,
            phone: phone || '',
            avatar: null,
          };
          const mockToken = 'mock-jwt-token-' + Date.now();

          set({
            user: mockUser,
            token: mockToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Store token in localStorage for API interceptor
          localStorage.setItem('token', mockToken);
          
          return { success: true, user: mockUser };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('token');
      },

      // Update user profile
      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          // Mock update - replace with actual API call
          // const response = await api.put('/auth/profile', profileData);
          
          const currentUser = get().user;
          const updatedUser = { ...currentUser, ...profileData };
          
          set({
            user: updatedUser,
            isLoading: false,
          });
          
          return { success: true, user: updatedUser };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Change password
      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true });
        try {
          // Mock change password - replace with actual API call
          // await api.put('/auth/change-password', { currentPassword, newPassword });
          
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Initialize auth state from localStorage
      initialize: () => {
        const token = localStorage.getItem('token');
        if (token) {
          // In a real app, verify token with backend
          const storedState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          if (storedState.state?.user && storedState.state?.token) {
            set({
              user: storedState.state.user,
              token: storedState.state.token,
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

