import { Navigate, useLocation } from 'react-router-dom';
import { useDeliveryAuthStore } from '../store/deliveryStore';

const DeliveryProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useDeliveryAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to delivery login page with return URL
    return <Navigate to="/delivery/login" state={{ from: location }} replace />;
  }

  return children;
};

export default DeliveryProtectedRoute;

