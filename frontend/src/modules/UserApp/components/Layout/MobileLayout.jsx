import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileCartBar from './MobileCartBar';
import CartDrawer from '../../../../shared/components/Cart/CartDrawer';
import useMobileHeaderHeight from '../../hooks/useMobileHeaderHeight';

const MobileLayout = ({ children, showBottomNav = true, showCartBar = true, fullScreen = false }) => {
  const location = useLocation();
  const headerHeight = useMobileHeaderHeight();
  // Hide header and bottom nav on login, register, and verification pages
  const isAuthPage = location.pathname === '/app/login' ||
    location.pathname === '/app/register' ||
    location.pathname === '/app/verification';

  // Always show bottom nav on /app routes, except auth pages, unless explicitly disabled
  const shouldShowBottomNav = location.pathname.startsWith('/app') && !isAuthPage ? showBottomNav : (showBottomNav && !isAuthPage);
  // Hide header on categories, search, wishlist, profile, checkout, and auth pages
  const shouldShowHeader = !isAuthPage &&
    location.pathname !== '/app/categories' &&
    location.pathname !== '/app/search' &&
    location.pathname !== '/app/wishlist' &&
    location.pathname !== '/app/profile' &&
    location.pathname !== '/app/reels' &&
    location.pathname !== '/app/mega-reward' &&
    location.pathname !== '/app/flash-sale' &&
    location.pathname !== '/app/checkout' &&
    location.pathname !== '/app/become-seller' &&
    location.pathname !== '/app/help' &&
    location.pathname !== '/app/settings' &&
    !location.pathname.startsWith('/app/change-password') &&
    !location.pathname.startsWith('/app/terms') &&
    !location.pathname.startsWith('/app/privacy') &&
    !location.pathname.startsWith('/app/about') &&
    !location.pathname.startsWith('/app/notifications') &&
    !location.pathname.startsWith('/app/category/') &&
    !location.pathname.startsWith('/app/product/') &&
    !location.pathname.startsWith('/app/wallet') &&
    // Hide header for Orders and Order Details
    location.pathname !== '/app/orders' &&
    location.pathname !== '/orders' &&
    !location.pathname.startsWith('/app/orders/') &&
    !location.pathname.startsWith('/orders/') &&
    !location.pathname.startsWith('/app/track-order') &&
    // Hide header for Support Tickets
    !location.pathname.startsWith('/app/support-tickets') &&
    // Hide header for Vendor Store
    !location.pathname.startsWith('/app/vendor/') &&
    !location.pathname.startsWith('/app/chat') &&
    !location.pathname.startsWith('/b2b') &&
    !location.pathname.startsWith('/app/track-order') &&
    !location.pathname.startsWith('/app/return-request') &&
    !location.pathname.startsWith('/app/returns') &&
    !location.pathname.startsWith('/app/order-confirmation');

  // Ensure body scroll is restored when component mounts
  useEffect(() => {
    if (fullScreen) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflowY = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [fullScreen]);

  return (
    <div className={fullScreen ? "h-screen overflow-hidden flex flex-col fixed inset-0 z-50 bg-white" : ""}>
      {shouldShowHeader && <MobileHeader />}
      <main
        className={`${fullScreen ? "flex-1 h-full overflow-hidden relative" : "min-h-screen w-full overflow-x-hidden"} transition-all duration-300 ease-in-out ${!fullScreen && shouldShowBottomNav ? 'pb-20' : ''} ${!fullScreen && showCartBar ? 'pb-24' : ''}`}
        style={{ paddingTop: shouldShowHeader ? `${headerHeight}px` : '0px' }}
      >
        {children}
      </main>
      {!fullScreen && showCartBar && <MobileCartBar />}
      {!fullScreen && shouldShowBottomNav && <MobileBottomNav />}
      {!fullScreen && <CartDrawer />}
    </div>
  );
};

export default MobileLayout;
