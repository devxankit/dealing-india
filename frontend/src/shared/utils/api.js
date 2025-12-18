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
    // Add auth token if available
    const token = localStorage.getItem('token');
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
    
    // Handle 401 (Unauthorized) - redirect to login
    if (error.response?.status === 401) {
      // Handle logout logic here if needed
      localStorage.removeItem('token');
    }
    
    return Promise.reject(error);
  }
);

export default api;

