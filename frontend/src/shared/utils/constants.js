// API Configuration
// Auto-detect if running on Vercel
const isVercel = typeof window !== 'undefined' && 
  (window.location.hostname.includes('vercel.app') || 
   window.location.hostname === 'dealing-india.vercel.app');

// Get backend URL - prioritize environment variable, then check for Vercel, then localhost
const getBackendURL = () => {
  // Highest priority: environment variable (set in Vercel dashboard)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // If on Vercel but no env var, user must set VITE_API_BASE_URL in Vercel environment variables
  // For development, use localhost
  return 'http://localhost:5000/api';
};

const getSocketURL = () => {
  // Highest priority: environment variable (set in Vercel dashboard)
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  // If on Vercel but no env var, user must set VITE_SOCKET_URL in Vercel environment variables
  // For development, use localhost
  return 'http://localhost:5000';
};

export const API_BASE_URL = getBackendURL();
export const SOCKET_URL = getSocketURL();

// App Constants
export const APP_NAME = 'Appzeto multi vendor E-commerce';
export const APP_DESCRIPTION = 'Multi Vendor E-commerce Platform';

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 0.3,
  NORMAL: 0.5,
  SLOW: 0.8,
};

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

