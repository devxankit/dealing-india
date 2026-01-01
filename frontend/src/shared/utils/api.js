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
    // If FormData, let axios set Content-Type automatically (multipart/form-data)
    if (config.data instanceof FormData) {
      // Remove Content-Type header to let browser set it with boundary
      delete config.headers['Content-Type'];
    }
    
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
    
    // Handle 401 (Unauthorized) - clear appropriate token and redirect
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const currentPath = window.location.pathname;
      
      // Determine which token to clear based on URL
      let shouldRedirect = false;
      let redirectPath = '';
      
      // Check for admin routes first (including admin vendor management)
      if (url.startsWith('/auth/admin') || url.startsWith('/admin/')) {
        localStorage.removeItem('admin-token');
        // Only redirect if on admin pages and not already on login
        if (currentPath.startsWith('/admin') && !currentPath.includes('/login')) {
          shouldRedirect = true;
          redirectPath = '/admin/login';
        }
      } 
      // Check for vendor routes (but NOT admin vendor management)
      else if (url.startsWith('/auth/vendor') || 
               (url.startsWith('/vendor/') && !url.startsWith('/admin/vendors'))) {
        localStorage.removeItem('vendor-token');
        // Only redirect if on vendor pages and not already on login
        if (currentPath.startsWith('/vendor') && !currentPath.includes('/login')) {
          shouldRedirect = true;
          redirectPath = '/vendor/login';
        }
      } 
      // Default to user token
      else {
        localStorage.removeItem('token');
        // Only redirect if not on vendor or admin pages and not already on login
        if (!currentPath.startsWith('/vendor') && !currentPath.startsWith('/admin') && !currentPath.includes('/login')) {
          shouldRedirect = true;
          redirectPath = '/login';
        }
      }
      
      // Suppress toast for certain expected 401 scenarios
      const isBackgroundOperation = 
        url.includes('/cart') || 
        url.includes('/wishlist') || 
        url.includes('/auth/user/logout') ||
        url.includes('/auth/admin/logout') ||
        url.includes('/auth/vendor/logout') ||
        url.includes('/auth/user/me') ||
        url.includes('/auth/admin/me') ||
        url.includes('/auth/vendor/me');
      
      // Only show toast for unexpected 401s (user-initiated actions)
      if (!isBackgroundOperation && !currentPath.includes('/login')) {
        // Show a user-friendly message
        if (message.includes('expired') || message.includes('Token has expired')) {
          toast.error('Your session has expired. Please login again.');
        } else if (message.includes('Authentication required')) {
          toast.error('Please login to continue.');
        } else {
          toast.error(message);
        }
      }
      
      // Redirect if needed (only for user-initiated actions or when on protected routes)
      if (shouldRedirect && !isBackgroundOperation) {
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      }
      
      // For background operations, silently reject
      return Promise.reject(error);
    }
    
    // Show error toast for non-401 errors
    toast.error(message);
    
    return Promise.reject(error);
  }
);

export default api;

