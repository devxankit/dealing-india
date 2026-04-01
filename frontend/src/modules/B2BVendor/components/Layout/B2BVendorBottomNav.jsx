import React from "react";
import { NavLink } from "react-router-dom";
import { FiHome, FiPackage, FiShoppingBag, FiSettings, FiUser, FiVideo, FiBell } from "react-icons/fi";
import { useVendorSettings } from "../../hooks/useVendorSettings";
import { useNotificationStore } from "../../../../shared/store/notificationStore";

const B2BVendorBottomNav = () => {
    const { settings, loading } = useVendorSettings();
    const unreadCount = useNotificationStore(state => state.unreadCount);

    if (loading) return null;

    const navItems = [
        { icon: FiHome, label: "Home", path: "/b2b-vendor/dashboard" },
    ];

    if (settings?.enabledModules?.includes("product")) {
        navItems.push({ icon: FiPackage, label: "Products", path: "/b2b-vendor/products/manage-products" });
    }
    
    if (settings?.enabledModules?.includes("property")) {
        navItems.push({ icon: FiHome, label: "Properties", path: "/b2b-vendor/properties/manage-properties" });
    }

    // Always show Notifications and Profile/Settings
    navItems.push({ icon: FiBell, label: "Alerts", path: "/b2b-vendor/notifications", badge: unreadCount });
    navItems.push({ icon: FiUser, label: "Profile", path: "/b2b-vendor/profile" });

    // Limit to 5 items max for mobile bottom nav
    const displayItems = navItems.slice(0, 5);

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-[9999] lg:hidden shadow-[0_-8px_20px_rgba(0,0,0,0.06)]" 
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex justify-around items-center h-16 sm:h-20">
                {displayItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all relative
                            ${isActive ? 'text-primary-600' : 'text-gray-400'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`text-xl sm:text-2xl ${isActive ? 'scale-110 stroke-[2.5px]' : ''}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-tight ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                                    {item.label}
                                </span>
                                {item.badge > 0 && (
                                    <span className="absolute top-2 right-[25%] sm:right-[30%] min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1 border border-white">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-1 bg-primary-600 rounded-b-full shadow-[0_2px_4px_rgba(40,116,240,0.3)]" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default B2BVendorBottomNav;
