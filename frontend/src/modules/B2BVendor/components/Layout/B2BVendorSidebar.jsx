import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiHome,
    FiPackage,
    FiShoppingBag,
    FiBarChart2,
    FiSettings,
    FiUser,
    FiChevronDown,
    FiX,
    FiMessageCircle,
    FiBriefcase,
    FiImage,
    FiCreditCard
} from "react-icons/fi";
import b2bVendorMenu from "../../config/b2bVendorMenu.json";
import { useB2BVendorAuthStore } from "../../store/b2bVendorAuthStore";

const iconMap = {
    Dashboard: FiHome,
    "Product Listings": FiPackage,
    "Manage Products": FiPackage,
    "Add Product": FiPackage,
    "B2B Inquiries": FiMessageCircle,
    Analytics: FiBarChart2,
    Subscription: FiCreditCard,
    "Banner Booking": FiImage,
    "Account Settings": FiSettings,
    Profile: FiUser,
    "Business Details": FiBriefcase,
    Security: FiBriefcase,
};

const getChildRoute = (parentRoute, childName) => {
    const routeMap = {
        "/b2b-vendor/products": {
            "Manage Products": "/b2b-vendor/products/manage-products",
            "Add Product": "/b2b-vendor/products/add-product",
        },
        "/b2b-vendor/settings": {
            "Profile": "/b2b-vendor/settings/profile",
            "Business Details": "/b2b-vendor/settings/business",
            "Security": "/b2b-vendor/settings/security",
        },
    };
    return routeMap[parentRoute]?.[childName] || parentRoute;
};

const B2BVendorSidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { vendor } = useB2BVendorAuthStore();
    const [expandedItems, setExpandedItems] = useState({});

    const displayVendorName = vendor?.name || "B2B Vendor";

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

    const renderMenuItem = (item) => {
        const Icon = iconMap[item.title] || FiPackage;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems[item.title];
        const active = isActive(item.route);

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
                                {item.children.map((child, index) => {
                                    const childRoute = getChildRoute(item.route, child);
                                    const isChildActive = location.pathname === childRoute;
                                    return (
                                        <div
                                            key={index}
                                            onClick={() => handleMenuItemClick(childRoute, item.title)}
                                            className={`px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${isChildActive ? "bg-primary-500/20 text-white font-medium" : "text-gray-400 hover:bg-slate-700"
                                                }`}
                                        >
                                            {child}
                                        </div>
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
        <div className="h-full flex flex-col bg-slate-800 shadow-xl">
            <div className="p-4 border-b border-slate-700 bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                            <FiBriefcase className="text-white text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-semibold text-white text-sm truncate">{displayVendorName}</h2>
                            <p className="text-xs text-gray-400 truncate">{vendor?.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg lg:hidden">
                        <FiX className="text-xl text-gray-300" />
                    </button>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 scrollbar-admin">
                {b2bVendorMenu.map(renderMenuItem)}
            </nav>
        </div>
    );

    return (
        <>
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
                        className="fixed left-0 top-0 bottom-0 w-64 z-[10000] lg:hidden"
                    >
                        {sidebarContent}
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 z-30">
                {sidebarContent}
            </div>
        </>
    );
};

export default B2BVendorSidebar;
