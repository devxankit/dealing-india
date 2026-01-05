import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from './constants';

// Log API base URL for debugging (only in development or if URL seems wrong)
if (typeof window !== 'undefined') {
  const isLocalhost = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
  const isProduction = window.location.hostname.includes('vercel.app') || 
                       window.location.hostname.includes('onrender.com');
  
  if (isProduction && isLocalhost) {
    console.error('❌ CRITICAL: API_BASE_URL is localhost in production!');
    console.error('Current API_BASE_URL:', API_BASE_URL);
    console.error('Please set VITE_API_BASE_URL in Vercel environment variables.');
  } else if (process.env.NODE_ENV === 'development') {
    console.log('🔗 API Base URL:', API_BASE_URL);
  }
}

// Create axios instance with timeout
// Increased timeout for production (email sending can take up to 60s)
const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname.includes('vercel.app') || 
   window.location.hostname.includes('onrender.com'));

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: isProduction ? 90000 : 30000, // 90s in production (for email), 30s in dev
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
    let url = config.url || '';
    
    // If the URL is absolute (starts with http), strip the base URL to get the relative path
    // for token logic below
    if (url.startsWith('http')) {
      if (url.startsWith(API_BASE_URL)) {
        url = url.substring(API_BASE_URL.length);
      }
    }
    
    // Ensure URL starts with / for consistent prefix checking
    if (url && !url.startsWith('/')) {
      url = '/' + url;
    }
    
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
    // Handle timeout and network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      const message = error.code === 'ECONNABORTED' 
        ? 'Request timeout. Please check your internet connection and try again.'
        : 'Network error. Please check your internet connection and try again.';
      
      // Don't show toast for login/register pages - let components handle it
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('/login') || 
                         currentPath.includes('/register') ||
                         currentPath.includes('/forgot-password') ||
                         currentPath.includes('/reset-password');
      
      if (!isAuthPage) {
        toast.error(message, { id: 'network-error' });
      }
      
      // Create a proper error object
      const networkError = new Error(message);
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }
    
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
      
      // Suppress toast for certain expected 401 scenarios (but still allow redirect)
      const isBackgroundOperation = 
        url.includes('/cart') || 
        url.includes('/wishlist') || 
        url.includes('/auth/user/logout') ||
        url.includes('/auth/admin/logout') ||
        url.includes('/auth/vendor/logout') ||
        url.includes('/auth/user/me') ||
        url.includes('/auth/admin/me') ||
        url.includes('/auth/vendor/me');
      
      // For dashboard/analytics, suppress toast but allow redirect
      const isDashboardOperation = url.includes('/dashboard-summary') || url.includes('/analytics');
      
      // Only show toast for unexpected 401s (user-initiated actions)
      if (!isBackgroundOperation && !isDashboardOperation && !currentPath.includes('/login')) {
        // Show a user-friendly message
        if (message.includes('expired') || message.includes('Token has expired')) {
          toast.error('Your session has expired. Please login again.', { id: 'auth-error' });
        } else if (message.includes('Authentication required')) {
          toast.error('Please login to continue.', { id: 'auth-error' });
        } else {
          toast.error(message, { id: 'auth-error' });
        }
      }
      
      // Redirect if needed (for dashboard operations, redirect even if it's a background operation)
      if (shouldRedirect && (!isBackgroundOperation || isDashboardOperation)) {
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      }
      
      // For background operations, silently reject
      return Promise.reject(error);
    }
    
    // Show error toast for non-401 errors, but not on auth pages (to avoid duplicates)
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.includes('/login') || 
                       currentPath.includes('/register') ||
                       currentPath.includes('/forgot-password') ||
                       currentPath.includes('/reset-password');
    
    if (!isAuthPage) {
      toast.error(message, { id: 'api-error' });
    }
    
    return Promise.reject(error);
  }
);

export default api;

