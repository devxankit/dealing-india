import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from './constants';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Determine which token to use based on request URL
    let token = null;
    const url = config.url || '';
    
    if (url.includes('/api/auth/vendor') || url.includes('/vendor/')) {
      token = localStorage.getItem('vendor-token');
    } else if (url.includes('/api/auth/admin') || url.includes('/admin/')) {
      token = localStorage.getItem('admin-token');
    } else {
      // Default to user token for all other requests
      token = localStorage.getItem('token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';
    
    // Show error toast
    toast.error(message);
    
    // Handle 401 (Unauthorized) - clear appropriate token and redirect
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // Clear the appropriate token based on request URL
      if (url.includes('/api/auth/vendor') || url.includes('/vendor/')) {
        localStorage.removeItem('vendor-token');
        // Trigger vendor logout if store is available
        if (window.location.pathname.startsWith('/vendor')) {
          window.location.href = '/vendor/login';
        }
      } else if (url.includes('/api/auth/admin') || url.includes('/admin/')) {
        localStorage.removeItem('admin-token');
        // Trigger admin logout if store is available
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login';
        }
      } else {
        localStorage.removeItem('token');
        // Trigger user logout if store is available
        if (!window.location.pathname.startsWith('/vendor') && 
            !window.location.pathname.startsWith('/admin')) {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

