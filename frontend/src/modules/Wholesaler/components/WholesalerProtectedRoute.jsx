import { Navigate, useLocation } from 'react-router-dom';
import { useWholesalerAuthStore } from '../store/wholesalerAuthStore';

const WholesalerProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useWholesalerAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/wholesaler/login" state={{ from: location }} replace />;
    }

    return children;
};

export default WholesalerProtectedRoute;
