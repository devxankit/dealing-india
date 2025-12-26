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
    
    // Check for admin routes first (including admin vendor management)
    // Admin routes: /auth/admin, /admin/* (config.url is relative, so no /api prefix)
    // This includes /admin/vendors, /admin/customers, etc.
    if (url.startsWith('/auth/admin') || url.startsWith('/admin/')) {
      token = localStorage.getItem('admin-token');
    } 
    // Check for vendor routes (vendor auth or vendor-specific routes, but NOT admin vendor management)
    // Vendor routes: /auth/vendor, or /vendor/* (but NOT /admin/vendors)
    else if (url.startsWith('/auth/vendor') || 
             (url.startsWith('/vendor/') && !url.startsWith('/admin/vendors'))) {
      token = localStorage.getItem('vendor-token');
    } 
    // Default to user token for all other requests
    else {
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
      const currentPath = window.location.pathname;
      
      // Don't redirect if already on login page
      if (currentPath.includes('/login')) {
        return Promise.reject(error);
      }
      
      // Check for admin routes first (including admin vendor management)
      // config.url is relative, so check for /auth/admin or /admin/
      if (url.startsWith('/auth/admin') || url.startsWith('/admin/')) {
        localStorage.removeItem('admin-token');
        // Trigger admin logout if on admin pages (but not already on login)
        if (currentPath.startsWith('/admin') && !currentPath.includes('/login')) {
          // Use setTimeout to avoid blocking and allow state updates
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 100);
        }
      } 
      // Check for vendor routes (but NOT admin vendor management)
      else if (url.startsWith('/auth/vendor') || 
               (url.startsWith('/vendor/') && !url.startsWith('/admin/vendors'))) {
        localStorage.removeItem('vendor-token');
        // Trigger vendor logout if on vendor pages (but not already on login)
        if (currentPath.startsWith('/vendor') && !currentPath.includes('/login')) {
          window.location.href = '/vendor/login';
        }
      } 
      // Default to user token
      else {
        localStorage.removeItem('token');
        // Trigger user logout if not on vendor or admin pages (but not already on login)
        if (!currentPath.startsWith('/vendor') && !currentPath.startsWith('/admin') && !currentPath.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

