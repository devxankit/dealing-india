import { Navigate, useLocation } from 'react-router-dom';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';

const B2BVendorProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useB2BVendorAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/b2b-vendor/login" state={{ from: location }} replace />;
    }

    return children;
};

export default B2BVendorProtectedRoute;
