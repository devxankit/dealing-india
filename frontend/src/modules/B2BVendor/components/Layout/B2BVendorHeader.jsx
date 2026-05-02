import { useState, useRef, useEffect } from "react";
import { FiMenu, FiBell, FiLogOut, FiBriefcase, FiUser, FiSettings, FiChevronDown, FiShoppingBag } from "react-icons/fi";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Button from "../../../Admin/components/Button";
import NotificationWindow from "../../../Admin/components/Layout/NotificationWindow";
import { useNotifications } from "../../../../shared/hooks/useNotifications";
import { useNotificationStore } from "../../../../shared/store/notificationStore";

import { useB2BVendorAuthStore } from "../../store/b2bVendorAuthStore";
import { useAuthStore } from "../../../../shared/store/authStore";
import { appLogo } from "../../../../data/logos";
import ConfirmModal from "../../../Admin/components/ConfirmModal";

const B2BVendorHeader = ({ onMenuClick }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { vendor, logout } = useB2BVendorAuthStore();

    const [showNotifications, setShowNotifications] = useState(false);
    const unreadCount = useNotificationStore(state => state.unreadCount);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [customTitle, setCustomTitle] = useState(null);
    const userMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        // Listen for openNotifications query parameter
        const params = new URLSearchParams(location.search);
        if (params.get('openNotifications') === 'true') {
            setShowNotifications(true);
            // Clean up the URL by removing the param without refreshing
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [location.search]);

    useEffect(() => {
        setCustomTitle(null);
    }, [location.pathname]);

    useEffect(() => {
        const handleTitleChange = (e) => {
            setCustomTitle(e.detail);
        };
        window.addEventListener('vendor-page-title', handleTitleChange);
        return () => window.removeEventListener('vendor-page-title', handleTitleChange);
    }, []);

    const handleLogout = () => {
        setShowLogoutModal(true);
        setShowUserMenu(false);
    };

    const confirmLogout = () => {
        logout();
        toast.success("Logged out successfully");
        navigate("/b2b-vendor/login");
    };

    const handleSwitch = (path) => {
        setShowUserMenu(false);

        // 1. Logout from Buyer session (Fire and forget)
        useAuthStore.getState().logout().catch(console.error);

        // 2. Manually clear Vendor session data from storage
        // We do this manually instead of calling logout() to avoid triggering 
        // the ProtectedRoute's immediate redirect before our navigation happens.
        localStorage.removeItem('b2b-vendor-token');
        localStorage.removeItem('b2b-vendor-auth-storage');
        sessionStorage.removeItem('b2b-vendor-login-timestamp');

        // 3. Hard redirect to the target page
        window.location.href = path;
    };

    const getPageName = (pathname) => {
        const path = pathname.split("/").pop() || "dashboard";
        const pageNames = {
            dashboard: "Dashboard",
            "manage-products": "Manage Products",
            "add-product": "Add New Listing",

            "manage-properties": "Manage Properties",
            "add-commercial": "Add Commercial",
            "add-villa": "Add Row house / Villa",
            "add-plot": "Add Row house / Villa",
            "manage-lots": "Manage Lots",
            "add-lotslot": "Add Lot/Slot",
            subscription: "Subscription Plans",
            notifications: "Notifications",
            profile: "My Profile",
            settings: "Settings",
        };

        if (pageNames[path]) return pageNames[path];

        // Default formatting: add-product -> Add Product
        return path
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const pageName = customTitle || getPageName(location.pathname);

    // Fallback if vendor name is not available
    const displayVendorName = vendor?.name || "B2B Vendor";
    const isDashboard = location.pathname === "/b2b-vendor/dashboard";

    return (
        <header className="bg-white border-b border-gray-200 fixed top-0 left-0 lg:left-64 right-0 z-40"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div className="flex items-center justify-between px-4 lg:px-6 py-4 gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
                    <Button onClick={onMenuClick} variant="icon" className="lg:hidden text-gray-700 flex-shrink-0" icon={FiMenu} />
                    <div className="lg:block min-w-0 flex-1 overflow-hidden">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-0.5 truncate">{pageName}</h1>
                        <p className="text-xs text-gray-600 flex items-center gap-2 min-w-0 overflow-hidden font-medium">
                            <FiBriefcase className="text-primary-500 flex-shrink-0" />
                            <span className="truncate block min-w-0">{displayVendorName} {isDashboard && vendor?.storeName && <span className="text-primary-600 font-black ml-1">({vendor.storeName})</span>}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="relative flex-shrink-0">
                        <Button onClick={() => setShowNotifications(!showNotifications)} variant="icon" className="text-gray-700 hover:bg-gray-100" icon={FiBell} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                        )}
                        <NotificationWindow isOpen={showNotifications} onClose={() => setShowNotifications(false)} position="right" />
                    </div>

                    <div className="relative flex-shrink-0" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 p-1 sm:p-1.5 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-200 max-w-[180px] sm:max-w-[220px]"
                        >
                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm text-white font-bold text-sm sm:text-base flex-shrink-0">
                                {displayVendorName.charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden sm:block text-left mr-1 min-w-0 overflow-hidden">
                                <p className="text-sm font-bold text-gray-800 leading-none mb-0.5 truncate">{displayVendorName}</p>
                                <p className="text-[10px] text-gray-500 font-medium leading-none truncate">B2B Vendor Account</p>
                            </div>
                            <FiChevronDown className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
                                >
                                    <div className="px-4 py-3 border-b border-gray-50 mb-1">
                                        <p className="text-sm font-bold text-gray-900 truncate">{displayVendorName}</p>
                                        <p className="text-xs text-gray-500 truncate break-all mt-0.5" title={vendor?.email}>{vendor?.email}</p>
                                    </div>
                                    <Link to="/b2b-vendor/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors">
                                        <FiUser className="text-lg" />
                                        <span className="font-medium">My Profile</span>
                                    </Link>
                                    <div className="h-px bg-gray-50 my-1"></div>


                                    <button
                                        onClick={() => handleSwitch('/b2b/login')}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors">
                                        <FiBriefcase className="text-lg text-purple-500" />
                                        <span className="font-medium">Switch to B2B Buyer</span>
                                    </button>

                                    <div className="h-px bg-gray-50 my-1"></div>
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                        <FiLogOut className="text-lg" />
                                        <span className="font-medium">Logout</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
                title="Logout Confirmation"
                message="Are you sure you want to logout? You will need to login again to access your dashboard."
                confirmText="Logout"
                cancelText="Stay Logged In"
                type="danger"
            />
        </header>
    );
};

export default B2BVendorHeader;
