import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiGrid, FiBriefcase, FiVideo, FiUser } from 'react-icons/fi';

const B2BBottomNav = () => {
    const navItems = [
        { icon: FiHome, label: 'Home', path: '/b2b/landing' },
        { icon: FiVideo, label: 'Reels', path: '/b2b/reels' },
        { icon: FiGrid, label: 'Browse', path: '/b2b/catalog?open=categories' },
        { icon: FiBriefcase, label: 'Business', path: '/b2b/catalog?open=business' },
        { icon: FiUser, label: 'Profile', path: '/b2b/profile' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 md:hidden pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/b2b/landing'}
                        className={({ isActive }) => `
                            flex flex-col items-center gap-0.5 transition-all
                            ${isActive ? 'text-primary-600' : 'text-gray-400'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`text-xl ${isActive ? 'scale-110' : ''}`} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default B2BBottomNav;
