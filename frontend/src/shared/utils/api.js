import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from './constants';
import { backendStatus } from './backendStatus';

// Log API base URL for debugging (only in development or if URL seems wrong)
if (typeof window !== 'undefined') {
  const isLocalhost = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
  const isProduction = window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('onrender.com') ||
    window.location.hostname.includes('dealingindia.com') ||
    window.location.hostname.includes('dealingindia.in');

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
    window.location.hostname.includes('onrender.com') ||
    window.location.hostname.includes('dealingindia.com') ||
    window.location.hostname.includes('dealingindia.in'));

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // Increased to 120s for all environments to handle large image uploads
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

    // Get current path to determine context
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    // Check for admin routes first (including admin vendor management)
    // Admin routes: /auth/admin, /admin/* (config.url is relative, so no /api prefix)
    // This includes /admin/vendors, /admin/customers, etc.
    if (url.startsWith('/auth/admin') || url.startsWith('/admin/')) {
      token = localStorage.getItem('admin-token');
    }
    // Check for B2B vendor routes first (separate from regular vendor routes)
    // OR if current path is B2B vendor page, use b2b-vendor-token for vendor routes
    else if (url.startsWith('/b2b-vendor/') ||
      (currentPath.startsWith('/b2b-vendor') && (url.startsWith('/auth/vendor') || url.startsWith('/vendor/') || url.startsWith('/subscription/')))) {
      token = localStorage.getItem('b2b-vendor-token');
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] Using b2b-vendor-token for URL:', url, 'Current path:', currentPath);
      }
    }
    // Check for subscription routes - use vendor token based on current path
    else if (url.startsWith('/subscription/')) {
      // If on B2B vendor pages, use b2b-vendor-token
      if (currentPath.startsWith('/b2b-vendor')) {
        token = localStorage.getItem('b2b-vendor-token');
        if (process.env.NODE_ENV === 'development') {
          console.log('[API] Using b2b-vendor-token for subscription URL:', url);
        }
      }
      // If on vendor pages, use vendor-token
      else if (currentPath.startsWith('/vendor')) {
        token = localStorage.getItem('vendor-token');
        if (process.env.NODE_ENV === 'development') {
          console.log('[API] Using vendor-token for subscription URL:', url);
        }
      }
      // If on admin pages, use admin-token
      else if (currentPath.startsWith('/admin')) {
        token = localStorage.getItem('admin-token');
        if (process.env.NODE_ENV === 'development') {
          console.log('[API] Using admin-token for subscription URL:', url);
        }
      }
      // Default fallback to vendor-token for subscription routes
      else {
        token = localStorage.getItem('vendor-token');
      }
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
    // Mark backend as up on successful response
    backendStatus.markBackendUp();
    return response.data;
  },
  (error) => {
    // Handle timeout and network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      // Check if this is a connection refused error (backend not running)
      const isConnectionRefused = error.code === 'ERR_NETWORK' ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Failed to fetch');

      // Mark backend as down
      const isNewlyDown = backendStatus.markBackendDown();

      // Don't show toast for login/register pages - let components handle it
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('/login') ||
        currentPath.includes('/register') ||
        currentPath.includes('/forgot-password') ||
        currentPath.includes('/reset-password');

      // Show notification only if:
      // 1. Not on auth page
      // 2. Backend is newly down OR notification should be shown
      // 3. This prevents multiple toasts for simultaneous requests
      if (!isAuthPage && (isNewlyDown || backendStatus.shouldShowErrorNotification())) {
        const message = isConnectionRefused
          ? 'Backend server is not running. Please start the server and refresh the page.'
          : error.code === 'ECONNABORTED'
            ? 'Request timeout. Please check your internet connection and try again.'
            : 'Network error. Please check your internet connection and try again.';

        toast.error(message, {
          id: 'backend-down-error',
          duration: 6000, // Show for 6 seconds
        });
      }

      // Create a proper error object
      const networkError = new Error(
        isConnectionRefused
          ? 'Backend server is not running'
          : error.code === 'ECONNABORTED'
            ? 'Request timeout'
            : 'Network error'
      );
      networkError.isNetworkError = true;
      networkError.isConnectionRefused = isConnectionRefused;
      return Promise.reject(networkError);
    }

    // Extract error message - prioritize backend message
    let message = error.response?.data?.message;

    // If no backend message, use axios error message but clean it up
    if (!message) {
      if (error.response?.status === 500) {
        message = 'Server error. Please try again later.';
      } else if (error.response?.status === 400) {
        message = 'Invalid request. Please check your input.';
      } else if (error.response?.status === 401) {
        message = 'Invalid credentials. Please check your email/phone and password.';
      } else if (error.response?.status === 403) {
        message = 'Access denied.';
      } else if (error.response?.status === 404) {
        message = 'Resource not found.';
      } else {
        // Clean up axios error messages
        const axiosMessage = error.message || '';
        if (axiosMessage.includes('Request failed with status code')) {
          // Don't show generic axios error messages
          message = 'Something went wrong. Please try again.';
        } else {
          message = axiosMessage || 'Something went wrong';
        }
      }
    }

    // Update error message if we have a better one from backend
    // Do this early so all logic below uses the updated message
    if (message && error.message !== message) {
      try {
        // Try to update the message property (might be read-only in some cases)
        Object.defineProperty(error, 'message', {
          value: message,
          writable: true,
          configurable: true
        });
      } catch (e) {
        // Fallback to simple assignment
        error.message = message;
      }
    }

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

        if (currentPath.startsWith('/b2b-vendor')) {
          console.warn('[API Interceptor] 401 on B2B vendor route:', url, 'Current path:', currentPath);
          console.warn('[API Interceptor] Token before removal:', localStorage.getItem('b2b-vendor-token') ? 'exists' : 'missing');
          localStorage.removeItem('b2b-vendor-token');
          // Only redirect if on b2b vendor pages and not already on login
          if (!currentPath.includes('/login')) {
            shouldRedirect = true;
            redirectPath = '/b2b-vendor/login';
          }
        } else {
          localStorage.removeItem('vendor-token');
          // Only redirect if on vendor pages and not already on login
          if (currentPath.startsWith('/vendor') && !currentPath.includes('/login')) {
            shouldRedirect = true;
            redirectPath = '/vendor/login';
          }
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

      // Check if this is a login request - don't show toast for login errors (component will handle it)
      const isLoginRequest = url.includes('/auth/user/login') ||
        url.includes('/auth/vendor/login') ||
        url.includes('/auth/admin/login');

      // Only show toast for unexpected 401s (user-initiated actions), but NOT for login requests
      if (!isLoginRequest && !isBackgroundOperation && !isDashboardOperation && !currentPath.includes('/login')) {
        // Show a user-friendly message
        if (message.includes('expired') || message.includes('Token has expired')) {
          toast.error('Your session has expired. Please login again.', { id: 'auth-error' });
        } else if (message.includes('Authentication required')) {
          toast.error('Please login to continue.', { id: 'auth-error' });
        } else {
          toast.error(message, { id: 'auth-error' });
        }
      }

      // Prevent immediate redirects right after login (within 2 seconds)
      const loginTimestamp = sessionStorage.getItem('b2b-vendor-login-timestamp');
      const timeSinceLogin = loginTimestamp ? Date.now() - parseInt(loginTimestamp) : Infinity;
      const isRecentLogin = timeSinceLogin < 2000; // 2 seconds

      // Redirect if needed (for dashboard operations, redirect even if it's a background operation)
      // But don't redirect if it's a recent login (might be a temporary auth check issue)
      if (shouldRedirect && (!isBackgroundOperation || isDashboardOperation) && !isRecentLogin) {
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
      } else if (isRecentLogin) {
        console.warn('[API Interceptor] Suppressing redirect due to recent login (within 2s)');
      }

      // For background operations, silently reject
      return Promise.reject(error);
    }

    // Check if this is a login/register request - don't show toast (component will handle it)
    const url = error.config?.url || '';
    const isAuthRequest = url.includes('/auth/user/login') ||
      url.includes('/auth/vendor/login') ||
      url.includes('/auth/admin/login') ||
      url.includes('/auth/user/register') ||
      url.includes('/auth/vendor/register') ||
      url.includes('/auth/vendor/b2b-vendor/register') ||
      url.includes('/auth/vendor/b2b-vendor/login');

    const currentPath = window.location.pathname;
    const isB2BRoute = currentPath.includes('/b2b-vendor');
    
    const isAuthPage = (currentPath.includes('/login') ||
      currentPath.includes('/register') ||
      currentPath.includes('/forgot-password') ||
      currentPath.includes('/reset-password')) && 
      !isB2BRoute;

    // Show toast for non-auth requests or if explicitly requested via status (like 409 Conflict)
    // For B2B routes, we generally allow the local component to handle toasts, 
    // but 409 is special as it's often a duplicate field error
    if ((!isAuthRequest && !isAuthPage) || error.response?.status === 409) {
      toast.error(message, { id: 'api-error' });
    } else if (isB2BRoute && (error.response?.status === 403 || error.response?.status === 401)) {
      // For B2B, let the local handler deal with 403 (Pending) and 401 (Invalid)
      // We don't show toast here to avoid duplicates
    }

    return Promise.reject(error);
  }
);

export default api;

