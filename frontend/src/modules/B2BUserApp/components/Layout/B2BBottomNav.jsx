import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiGrid, FiMessageSquare, FiUser } from 'react-icons/fi';

const B2BBottomNav = () => {
    const navItems = [
        { icon: FiHome, label: 'Home', path: '/b2b' },
        { icon: FiGrid, label: 'Browse', path: '/b2b/catalog' },
        { icon: FiMessageSquare, label: 'Inquiries', path: '/b2b/inquiries' },
        { icon: FiUser, label: 'Profile', path: '/b2b/profile' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 md:hidden">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end
                        className={({ isActive }) => `
                            flex flex-col items-center gap-1 transition-all
                            ${isActive ? 'text-primary-600' : 'text-gray-400'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`text-xl ${isActive ? 'scale-110' : ''}`} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
            {/* Safe area offset for mobile browsers */}
            <div className="h-safe-area bg-white"></div>
        </nav>
    );
};

export default B2BBottomNav;
