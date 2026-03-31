import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(false);

  // Check if screen is desktop (≥1024px)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    // Initial check
    checkDesktop();

    // Listen for resize events
    window.addEventListener('resize', checkDesktop);

    return () => {
      window.removeEventListener('resize', checkDesktop);
    };
  }, []);

  // Wait for hydration before making any redirect decisions
  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    const isAppRoute = location.pathname.startsWith('/app');
    const isB2BRoute = location.pathname.startsWith('/b2b');

    console.warn(`[ProtectedRoute] User not authenticated. Accessing ${location.pathname}. Redirecting...`);

    if (isAppRoute && isDesktop) {
      console.log('[ProtectedRoute] Redirecting to /login (Desktop App)');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isAppRoute) {
      console.log('[ProtectedRoute] Redirecting to /app/login (Mobile App)');
      return <Navigate to="/app/login" state={{ from: location }} replace />;
    }

    if (isB2BRoute) {
      console.log('[ProtectedRoute] Redirecting to /b2b/login (B2B App)');
      return <Navigate to="/b2b/login" state={{ from: location }} replace />;
    }

    console.log('[ProtectedRoute] Redirecting to /login (Default)');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log(`[ProtectedRoute] Authorized access to ${location.pathname}`);
  return children;
};

export default ProtectedRoute;

