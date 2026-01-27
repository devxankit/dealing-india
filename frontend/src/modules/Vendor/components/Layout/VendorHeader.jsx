import { useState, useRef, useEffect } from "react";
import { FiMenu, FiBell, FiLogOut, FiShoppingBag, FiUser, FiSettings, FiChevronDown, FiCreditCard, FiBriefcase } from "react-icons/fi";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { useAuthStore } from "../../../../shared/store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Button from "../../../Admin/components/Button";
import NotificationWindow from "../../../Admin/components/Layout/NotificationWindow";


const VendorHeader = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { vendor, logout } = useVendorAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/vendor/login");
  };

  const handleSwitch = async (path) => {
    setShowUserMenu(false);
    try {
      // Clear both buyer and vendor sessions
      await useAuthStore.getState().logout();
      await logout();
      // Use window.location.href to ensure a full clean state and avoid any route guard interference
      window.location.href = path;
    } catch (error) {
      console.error("Error during switch:", error);
      navigate(path);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Get page name from pathname
  const getPageName = (pathname) => {
    const path = pathname.split("/").pop() || "dashboard";
    const pageNames = {
      dashboard: "Dashboard",
      products: "Products",
      orders: "Orders",
      analytics: "Analytics",
      earnings: "Earnings",
      "return-requests": "Returns",
      settings: "Settings",
      profile: "Profile",
    };
    return pageNames[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  const pageName = getPageName(location.pathname);
  const storeName = vendor?.storeName || vendor?.name || "Vendor Store";

  return (
    <header
      className="bg-white border-b border-gray-200 fixed top-0 left-0 lg:left-64 right-0 z-30"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}>
      <div className="flex items-center justify-between px-4 lg:px-6 py-4">
        {/* Left: Menu Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onMenuClick}
            variant="icon"
            className="lg:hidden text-gray-700"
            icon={FiMenu}
          />

          {/* Page Heading - Desktop Only */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {pageName}
            </h1>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <FiShoppingBag className="text-primary-500" />
              {storeName}
            </p>
          </div>
        </div>

        {/* Right: Notifications & User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <div className="relative">
            <Button
              data-notification-button
              onClick={toggleNotifications}
              variant="icon"
              className="text-gray-700 hover:bg-gray-100"
              icon={FiBell}
            />
            <NotificationWindow
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              position="right"
            />
          </div>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 sm:p-1.5 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-200">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm text-white font-bold text-sm sm:text-base">
                {vendor?.storeName?.charAt(0).toUpperCase() || vendor?.name?.charAt(0).toUpperCase() || "V"}
              </div>
              <div className="hidden sm:block text-left mr-1">
                <p className="text-sm font-bold text-gray-800 leading-none mb-0.5">
                  {vendor?.storeName || vendor?.name || "Vendor"}
                </p>
                <p className="text-[10px] text-gray-500 font-medium leading-none">
                  Vendor Account
                </p>
              </div>
              <FiChevronDown className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-50 mb-1">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {vendor?.name || "Vendor User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {vendor?.email || "vendor@example.com"}
                    </p>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    <Link
                      to="/vendor/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors">
                      <FiUser className="text-lg" />
                      <span className="font-medium">My Profile</span>
                    </Link>

                    <div className="h-px bg-gray-50 my-1 mx-4"></div>
                    <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buyer Panels</p>

                    <button
                      onClick={() => handleSwitch('/app/login')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors">
                      <FiShoppingBag className="text-lg text-blue-500" />
                      <span className="font-medium">Switch to B2C Buyer</span>
                    </button>

                    <button
                      onClick={() => handleSwitch('/b2b/login')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors">
                      <FiBriefcase className="text-lg text-purple-500" />
                      <span className="font-medium">Switch to B2B Buyer</span>
                    </button>

                    <div className="h-px bg-gray-50 my-1 mx-4"></div>
                    <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Store Settings</p>

                    <Link
                      to="/vendor/settings/store"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors">
                      <FiSettings className="text-lg" />
                      <span className="font-medium">General Settings</span>
                    </Link>

                    <Link
                      to="/vendor/settings/payment"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors">
                      <FiCreditCard className="text-lg" />
                      <span className="font-medium">Payment Settings</span>
                    </Link>

                    <Link
                      to="/vendor/settings/shipping"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors">
                      <FiShoppingBag className="text-lg" />
                      <span className="font-medium">Shipping Settings</span>
                    </Link>
                  </div>

                  <div className="h-px bg-gray-50 my-1"></div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <FiLogOut className="text-lg" />
                    <span className="font-medium">Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default VendorHeader;
