import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FiSearch,
  FiHeart,
  FiUser,
  FiShoppingBag,
  FiLogOut,
  FiPackage,
  FiMapPin,
} from "react-icons/fi";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCartStore, useUIStore } from "../../../../shared/store/useStore";
import { useAuthStore } from "../../../../shared/store/authStore";
import { useWishlistStore } from "../../../../shared/store/wishlistStore";
import SearchBar from "../../../../shared/components/SearchBar";
import { appLogo } from "../../../../data/logos";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion } from "framer-motion";

// Category gradient mapping - Very subtle pastel colors
const categoryGradients = {
  1: "from-pink-50 via-rose-50 to-pink-100", // Clothing - Pinkish
  2: "from-amber-50 via-amber-100 to-yellow-50", // Footwear - Brownish
  3: "from-orange-50 via-orange-100 to-orange-50", // Bags - Orangeish
  4: "from-green-50 via-emerald-50 to-teal-50", // Jewelry - Greenish
  5: "from-purple-50 via-purple-100 to-indigo-50", // Accessories - Purple
  6: "from-blue-50 via-cyan-50 to-teal-50", // Athletic
};

const Header = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCartAnimation, setShowCartAnimation] = useState(false);
  const [positionsReady, setPositionsReady] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [animationPositions, setAnimationPositions] = useState({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });
  const userMenuRef = useRef(null);
  const logoRef = useRef(null);
  const cartRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const itemCount = useCartStore((state) => state.getItemCount());
  const wishlistCount = useWishlistStore((state) => state.getItemCount());
  const toggleCart = useUIStore((state) => state.toggleCart);
  const { user, isAuthenticated, logout } = useAuthStore();

  // Get current category from URL
  const getCurrentCategoryId = () => {
    const match = location.pathname.match(/\/category\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const currentCategoryId = getCurrentCategoryId();

  // Get gradient background style - More intense at top, fading to white at bottom (fully opaque, moderate intensity)
  const getHeaderBackgroundStyle = () => {
    if (currentCategoryId) {
      const gradientMap = {
        1: {
          background:
            "linear-gradient(to bottom, rgb(252, 231, 243) 0%, rgb(255, 240, 245) 50%, rgb(255, 255, 255) 100%)",
        }, // Pink - moderate
        2: {
          background:
            "linear-gradient(to bottom, rgb(254, 243, 199) 0%, rgb(255, 248, 220) 50%, rgb(255, 255, 255) 100%)",
        }, // Brown/Amber - moderate
        3: {
          background:
            "linear-gradient(to bottom, rgb(255, 237, 213) 0%, rgb(255, 245, 230) 50%, rgb(255, 255, 255) 100%)",
        }, // Orange - moderate
        4: {
          background:
            "linear-gradient(to bottom, rgb(209, 250, 229) 0%, rgb(236, 253, 245) 50%, rgb(255, 255, 255) 100%)",
        }, // Green - moderate
        5: {
          background:
            "linear-gradient(to bottom, rgb(243, 232, 255) 0%, rgb(250, 245, 255) 50%, rgb(255, 255, 255) 100%)",
        }, // Purple - moderate
        6: {
          background:
            "linear-gradient(to bottom, rgb(219, 234, 254) 0%, rgb(239, 246, 255) 50%, rgb(255, 255, 255) 100%)",
        }, // Blue - moderate
      };
      return gradientMap[currentCategoryId] || {};
    }
    return {};
  };

  const headerBackgroundStyle = getHeaderBackgroundStyle();
  // Set default background when no category is active
  if (!currentCategoryId && !headerBackgroundStyle.background) {
    headerBackgroundStyle.background =
      "linear-gradient(to bottom, #D1E1FD 0%, #F5F8FF 50%, #FFFFFF 100%)";
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate animation positions after component mounts
  useEffect(() => {
    const calculatePositions = () => {
      if (logoRef.current && cartRef.current) {
        const logoRect = logoRef.current.getBoundingClientRect();
        const cartRect = cartRef.current.getBoundingClientRect();

        const positions = {
          startX: logoRect.left + logoRect.width / 2,
          startY: logoRect.top + logoRect.height / 2,
          endX: cartRect.left + cartRect.width / 2,
          endY: cartRect.top + cartRect.height / 2,
        };

        // Only set positions if they're valid and animation hasn't played yet
        if (
          positions.startX > 0 &&
          positions.endX > 0 &&
          positions.startY > 0 &&
          positions.endY > 0 &&
          !hasPlayed
        ) {
          setAnimationPositions(positions);
          setPositionsReady(true);
          // Start animation once positions are ready
          setShowCartAnimation(true);
          setHasPlayed(true);
        }
      }
    };

    // Calculate positions after a short delay to ensure elements are rendered
    const timer1 = setTimeout(calculatePositions, 100);
    const timer2 = setTimeout(calculatePositions, 500);
    const timer3 = setTimeout(calculatePositions, 1000);

    // Recalculate on resize
    window.addEventListener("resize", calculatePositions);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener("resize", calculatePositions);
    };
  }, []);

  // Hide animation after it completes
  useEffect(() => {
    if (showCartAnimation) {
      const timer = setTimeout(() => {
        setShowCartAnimation(false);
      }, 2500); // Hide after 2.5 seconds (2s animation + 0.5s buffer)
      return () => clearTimeout(timer);
    }
  }, [showCartAnimation]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate("/");
  };

  // Animation content
  const shouldShowAnimation =
    showCartAnimation &&
    positionsReady &&
    animationPositions.startX > 0 &&
    animationPositions.endX > 0;

  const animationContent = shouldShowAnimation ? (
    <motion.div
      className="fixed pointer-events-none"
      style={{
        left: 0,
        top: 0,
        zIndex: 10001,
        willChange: "transform, opacity",
        transform: "translateZ(0)",
      }}
      initial={{
        x: animationPositions.startX - 40,
        y: animationPositions.startY - 40,
        scale: 1,
        opacity: 1,
      }}
      animate={{
        x: animationPositions.endX - 40,
        y: animationPositions.endY - 40,
        scale: [1, 1.2, 0.8],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 2,
        ease: [0.25, 0.46, 0.45, 0.94],
        times: [0, 0.7, 1],
      }}
      onAnimationComplete={() => {
        setShowCartAnimation(false);
      }}>
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center relative">
        <DotLottieReact
          src="https://lottie.host/083a2680-e854-4006-a50b-674276be82cd/oQMRcuZUkS.lottie"
          autoplay
          loop={false}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </motion.div>
  ) : null;

  return (
    <header
      className="sticky top-0 z-50 shadow-lg overflow-visible transition-all duration-500"
      style={headerBackgroundStyle}>
      {/* Cart Animation - Rendered via Portal */}
      {typeof document !== "undefined" &&
        createPortal(animationContent, document.body)}

      {/* Top Bar */}
      <div
        className={`border-b ${
          currentCategoryId ? "border-white/30" : "border-white/20"
        } overflow-visible`}>
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 md:py-4 overflow-visible">
          <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 overflow-visible">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center flex-shrink-0 group cursor-pointer min-w-0 overflow-visible relative z-10">
              <div ref={logoRef} className="overflow-visible">
                {appLogo.src ? (
                  <img
                    src={appLogo.src}
                    alt={appLogo.alt}
                    className="h-6 sm:h-8 md:h-10 w-auto object-contain group-hover:scale-110 transition-all duration-300 origin-left"
                    onError={(e) => {
                      // Hide image if logo doesn't exist
                      e.target.style.display = "none";
                      // Show text fallback
                      const parent = e.target.parentElement;
                      if (
                        parent &&
                        !parent.querySelector(".logo-text-fallback")
                      ) {
                        const fallback = document.createElement("span");
                        fallback.className =
                          "logo-text-fallback text-primary-600 font-bold text-sm sm:text-base md:text-lg";
                        fallback.textContent = "LOGO";
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <span className="logo-text-fallback text-primary-600 font-bold text-sm sm:text-base md:text-lg">
                    LOGO
                  </span>
                )}
              </div>
            </Link>

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-4">
              <SearchBar />
            </div>

            {/* Right Side Utilities */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
              {/* Wishlist Button */}
              <Link
                to="/wishlist"
                className="p-1.5 sm:p-2 md:p-2.5 hover:bg-white/50 rounded-full transition-all duration-300 hover:scale-110 relative group">
                <FiHeart className="text-primary-500 text-base sm:text-lg md:text-xl group-hover:text-accent-500 transition-colors" />
                {wishlistCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold"
                    style={{ backgroundColor: "#ffc101" }}>
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Account / Auth Buttons */}
              {isAuthenticated ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="p-1.5 sm:p-2 md:p-2.5 hover:bg-white/50 rounded-full transition-all duration-300 hover:scale-110 group relative">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full gradient-green flex items-center justify-center text-white text-xs sm:text-sm font-semibold">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 z-50 min-w-[200px]">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="font-semibold text-gray-800">
                          {user?.name || "User"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {user?.email || ""}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left w-full">
                        <FiUser className="text-gray-600" />
                        <span className="font-medium text-gray-700">
                          Profile
                        </span>
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left w-full">
                        <FiPackage className="text-gray-600" />
                        <span className="font-medium text-gray-700">
                          Orders
                        </span>
                      </Link>
                      <Link
                        to="/addresses"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left w-full">
                        <FiMapPin className="text-gray-600" />
                        <span className="font-medium text-gray-700">
                          Addresses
                        </span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-left w-full text-red-600">
                        <FiLogOut className="text-red-600" />
                        <span className="font-medium">Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Link
                    to="/login"
                    className="px-2 sm:px-3 py-1.5 sm:py-2 text-text-dark hover:text-primary-600 font-semibold transition-colors text-xs sm:text-sm">
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-2 sm:px-3 py-1.5 sm:py-2 gradient-green text-white rounded-lg font-semibold hover:shadow-glow-green transition-all duration-300 text-xs sm:text-sm">
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Cart Button */}
              <button
                ref={cartRef}
                onClick={toggleCart}
                className="flex items-center gap-1 sm:gap-2 gradient-green text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg hover:shadow-glow-green transition-all duration-300 font-semibold text-xs sm:text-sm md:text-base hover:scale-105">
                <FiShoppingBag className="text-base sm:text-lg" />
                <span className="hidden sm:inline">My Cart</span>
                <span className="bg-white/30 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold">
                  ({itemCount})
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div
        className={`md:hidden border-b ${
          currentCategoryId ? "border-white/30" : "border-white/20"
        } px-2 sm:px-4 py-3 ${
          currentCategoryId ? "bg-white/20" : "bg-white/30"
        }`}>
        <SearchBar />
      </div>
    </header>
  );
};

export default Header;
