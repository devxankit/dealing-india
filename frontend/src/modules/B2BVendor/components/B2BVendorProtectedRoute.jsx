import { Navigate, useLocation } from 'react-router-dom';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';

const B2BVendorProtectedRoute = ({ children }) => {
    const { isAuthenticated, logout } = useB2BVendorAuthStore();
    const location = useLocation();
    const token = localStorage.getItem('b2b-vendor-token');

    if (!isAuthenticated || !token) {
        if (isAuthenticated && !token) {
            // Sync store state if token is missing
            logout();
        }
        return <Navigate to="/b2b-vendor/login" state={{ from: location }} replace />;
    }

    return children;
};

export default B2BVendorProtectedRoute;
