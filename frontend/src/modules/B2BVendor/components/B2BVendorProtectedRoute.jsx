import { Navigate, useLocation } from 'react-router-dom';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import { useEffect, useState } from 'react';

const B2BVendorProtectedRoute = ({ children }) => {
    const { isAuthenticated, logout, vendor } = useB2BVendorAuthStore();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);

    // Wait for Zustand persist to hydrate on mount
    useEffect(() => {
        // Small delay to ensure Zustand persist has hydrated from localStorage
        const timer = setTimeout(() => {
            setIsChecking(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Get token from localStorage (source of truth)
    const token = localStorage.getItem('b2b-vendor-token');

    // If still checking, don't redirect yet
    if (isChecking) {
        return null; // or a loading spinner
    }

    // Check authentication - token is required
    if (!token) {
        // If store says authenticated but no token, logout to sync state
        if (isAuthenticated) {
            console.warn('[B2BVendorProtectedRoute] State mismatch: isAuthenticated but no token, logging out');
            logout();
        }
        return <Navigate to="/b2b-vendor/login" state={{ from: location }} replace />;
    }

    // If token exists but store says not authenticated, this might be a hydration issue
    // Allow access if token exists (it will be validated by backend)
    if (!isAuthenticated && token) {
        console.warn('[B2BVendorProtectedRoute] Token exists but store not authenticated - allowing access, backend will validate');
    }

    return children;
};

export default B2BVendorProtectedRoute;
