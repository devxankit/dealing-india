import { useState, useEffect } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiHome,
    FiPackage,
    FiSettings,
    FiUser,
    FiChevronDown,
    FiX,
    FiMessageCircle,
    FiBriefcase,
    FiImage,
    FiCreditCard,
    FiLogOut,
    FiPlus,
    FiBell,
    FiShield
} from "react-icons/fi";
import b2bVendorMenu from "../../config/b2bVendorMenu.json";
import { useB2BVendorAuthStore } from "../../store/b2bVendorAuthStore";
import { useVendorSettings } from "../../hooks/useVendorSettings";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const iconMap = {
    Dashboard: FiHome,
    "Product Listings": FiPackage,
    "Manage Products": FiPackage,
    "Add Product": FiPackage,
    "Secure Deals": FiShield,
    "Shop Listing": FiPackage,
    "Property Management": FiHome,
    "Manage Properties": FiHome,
    "Add Commercial": FiPlus,
    "Add Flat": FiPlus,
    "Add Villa": FiPlus,
    "Lot/Slot Listings": FiPlus,
    Subscription: FiCreditCard,
    "Banner Booking": FiImage,
    "Notifications": FiBell,
    "Account Settings": FiSettings,
    Profile: FiUser,
    Security: FiBriefcase,
};

const getChildRoute = (parentRoute, childName) => {
    const routeMap = {
        "/b2b-vendor/products": {
            "Manage Products": "/b2b-vendor/products/manage-products",
            "Add Product": "/b2b-vendor/products/add-product"
        },
        "/b2b-vendor/properties": {
            "Manage Properties": "/b2b-vendor/properties/manage-properties",
            "Add Commercial": "/b2b-vendor/properties/add-commercial",
            "Add Flat": "/b2b-vendor/properties/add-flat",
            "Add Villa": "/b2b-vendor/properties/add-villa"
        },
        "/b2b-vendor/lotslot": {
            "Manage Lots": "/b2b-vendor/lotslot/manage-lots",
            "Add Lot/Slot": "/b2b-vendor/lotslot/add-lotslot",
        },
        "/b2b-vendor/settings": {
            "Profile": "/b2b-vendor/settings/profile",
        },
    };
    return routeMap[parentRoute]?.[childName] || parentRoute;
};

let lastUnreadFetchTime = 0;

const B2BVendorSidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { vendor } = useB2BVendorAuthStore();
    const { settings } = useVendorSettings();
    const [expandedItems, setExpandedItems] = useState({});
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

    const displayVendorName = vendor?.name || "B2B Vendor";
    const vendorInitial = displayVendorName.charAt(0).toUpperCase();

    useEffect(() => {
        const fetchUnreadCount = async () => {
            const now = Date.now();
            if (now - lastUnreadFetchTime < 2000) return;

            lastUnreadFetchTime = now;
            try {
                const response = await api.get('/vendor/notifications/unread-count');
                if (response.success) {
                    setUnreadNotificationCount(response.data.unreadCount || 0);
                }
            } catch (error) {
                // Silently fail
            }
        };
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, []);

    const filteredMenu = b2bVendorMenu.filter(item => {
        if (item.title === "Dashboard" || item.title === "Secure Deals") return true;

        const alwaysVisible = ["Subscription", "Banner Booking", "Notifications", "Account Settings"];
        if (alwaysVisible.includes(item.title)) return true;

        if (!settings || !settings.enabledModules) return false;

        const moduleMap = {
            "Product Listings": "product",
            "Property Management": "property",
            "Lot/Slot Listings": "lotslot",
            "Shop Listing": "shop-listing",
        };
        const moduleKey = moduleMap[item.title];
        if (!moduleKey) return true;
        return settings.enabledModules.includes(moduleKey);
    });

    const getFilteredChildren = (item) => {
        if (!item.children || item.children.length === 0) return [];
        if (item.title !== 'Property Management') return item.children;

        const allowedForms = Array.isArray(settings?.propertyForms)
            ? settings.propertyForms.map((f) => String(f).toLowerCase().trim())
            : [];

        const childFormMap = {
            'Add Commercial': 'property',
            'Add Flat': 'flat',
            'Add Villa': 'villa'
        };

        return item.children.filter((child) => {
            const formKey = childFormMap[child];
            if (!formKey) return true;
            return allowedForms.includes(formKey);
        });
    };

    useEffect(() => {
        const activeItem = b2bVendorMenu.find((item) => {
            if (item.route === "/b2b-vendor/dashboard") {
                return location.pathname === "/b2b-vendor/dashboard";
            }
            return location.pathname.startsWith(item.route) && location.pathname !== item.route;
        });
        if (activeItem && activeItem.children && activeItem.children.length > 0) {
            setExpandedItems({ [activeItem.title]: true });
        }
    }, [location.pathname]);

    const isActive = (route) => {
        if (route === "/b2b-vendor/dashboard") return location.pathname === "/b2b-vendor/dashboard";
        return location.pathname.startsWith(route);
    };

    const toggleExpand = (title) => {
        setExpandedItems(prev => ({ [title]: !prev[title] }));
    };

    const handleMenuItemClick = (route, parentTitle = null) => {
        if (parentTitle) setExpandedItems({ [parentTitle]: true });
        navigate(route);
        if (window.innerWidth < 1024) onClose();
    };

    const handleLogout = () => {
        useB2BVendorAuthStore.getState().logout();
        toast.success("Logged out successfully");
        navigate("/b2b-vendor/login");
        if (window.innerWidth < 1024) onClose();
    };

    const renderMenuItem = (item) => {
        const Icon = iconMap[item.title] || FiPackage;
        const filteredChildren = getFilteredChildren(item);
        const hasChildren = filteredChildren.length > 0;
        const isExpanded = expandedItems[item.title];
        const active = isActive(item.route);
        const showNotificationBadge = item.title === "Notifications" && unreadNotificationCount > 0;

        return (
            <div key={item.route} className="mb-1">
                <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${active ? "bg-primary-600 text-white shadow-sm" : "text-gray-300 hover:bg-slate-700"
                        }`}
                    onClick={() => {
                        if (hasChildren) {
                            toggleExpand(item.title);
                        } else {
                            handleMenuItemClick(item.route);
                        }
                    }}
                >
                    <Icon className={`text-xl flex-shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
                    <span className="font-medium flex-1 text-sm">{item.title}</span>
                    {showNotificationBadge && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                        </span>
                    )}
                    {hasChildren && (
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                            <FiChevronDown className="text-gray-400 text-sm" />
                        </motion.div>
                    )}
                </div>

                <AnimatePresence>
                    {hasChildren && isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-600 space-y-1">
                                {filteredChildren.map((child, index) => {
                                    const childRoute = getChildRoute(item.route, child);
                                    return (
                                        <NavLink
                                            key={index}
                                            to={childRoute}
                                            onClick={() => {
                                                if (window.innerWidth < 1024) onClose();
                                            }}
                                            className={({ isActive }) => `block px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${isActive ? "bg-primary-500/20 text-white font-medium" : "text-gray-400 hover:bg-slate-700"
                                                }`}
                                        >
                                            {child}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const sidebarContent = (
        <div className="h-full flex flex-col bg-slate-800 shadow-xl overflow-hidden text-left">
            <div className="p-4 border-b border-slate-700 bg-slate-900 overflow-hidden">
                <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden text-left">
                        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 text-white font-black text-xl border-2 border-primary-500">
                            {vendorInitial}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <h2 className="font-bold text-white text-xs sm:text-sm truncate mb-0.5">
                                {displayVendorName}
                            </h2>
                            <p className="text-[10px] sm:text-xs text-gray-400 truncate block opacity-70">
                                {vendor?.email || 'Vendor Account'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 pb-32 scrollbar-admin">
                {filteredMenu.map(renderMenuItem)}
                <div className="mt-8 pt-8 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 cursor-pointer text-left"
                    >
                        <FiLogOut className="text-xl flex-shrink-0" />
                        <span className="font-medium text-sm">Logout Account</span>
                    </button>
                </div>
            </nav>
        </div>
    );

    return (
        <div className="text-left">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[9998] lg:hidden"
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        className="fixed left-0 top-0 bottom-0 w-64 z-[10000] lg:hidden overflow-hidden"
                    >
                        {sidebarContent}
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 z-30 overflow-hidden">
                {sidebarContent}
            </div>
        </div>
    );
};

export default B2BVendorSidebar;
