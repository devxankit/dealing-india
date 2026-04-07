import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiBriefcase, FiVideo, FiUser } from 'react-icons/fi';
import { useAuthStore } from '../../../../shared/store/authStore';

const B2BBottomNav = () => {
    const { isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { icon: FiHome, label: 'Home', path: '/b2b/landing', requireAuth: false },
        { icon: FiVideo, label: 'Reels', path: '/b2b/reels', requireAuth: true },
        { icon: FiGrid, label: 'Browse', path: '/b2b/catalog?open=categories', requireAuth: true },
        { icon: FiBriefcase, label: 'Business', path: '/b2b/catalog?open=business', requireAuth: true },
        { icon: FiUser, label: 'Profile', path: '/b2b/profile', requireAuth: true },
    ];

    const handleNavClick = (e, item) => {
        if (item.requireAuth && !isAuthenticated) {
            e.preventDefault();
            navigate('/b2b/login', { state: { from: { pathname: item.path } } });
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-[100] md:hidden pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/b2b/landing'}
                        onClick={(e) => handleNavClick(e, item)}
                        className={({ isActive }) => `
                            flex flex-col items-center gap-1 transition-all flex-1 py-2
                            ${isActive ? 'text-primary-600' : 'text-gray-400'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`text-xl transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                                <span className="text-[10px] font-black uppercase tracking-tight text-center">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default B2BBottomNav;
