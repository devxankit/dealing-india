import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiSettings, FiBell, FiHelpCircle, FiLogOut, FiBriefcase, FiArrowRight, FiShoppingBag, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { useAuthStore } from '../../../shared/store/authStore';
import { useVendorAuthStore } from '../../Vendor/store/vendorAuthStore';
import { useB2BVendorAuthStore } from '../../B2BVendor/store/b2bVendorAuthStore';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout, switchMarketplace } = useAuthStore();
    const [isSwitching, setIsSwitching] = useState(false);

    const menuItems = [
        { icon: FiBriefcase, label: 'Company Profile', desc: 'Manage your business details & GST', path: '/b2b/company' },
        { icon: FiBell, label: 'Notifications', desc: 'Manage inquiry alerts', path: '/b2b/notifications' },
        { icon: FiHelpCircle, label: 'Support & FAQs', desc: 'Get help with your bulk orders', path: '/b2b/support' },
    ];

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/app/login');
    };

    const handleSwitchMarketplace = async () => {
        setIsSwitching(true);
        try {
            const result = await switchMarketplace('b2c');
            if (result.success) {
                toast.success('Switched to Retail Marketplace');

                // Use hard navigation to ensure store is fully updated and prevent race conditions
                // This forces a full page reload with the new marketplace setting
                setTimeout(() => {
                    window.location.href = '/app';
                }, 300);
            }
        } catch (error) {
            toast.error('Failed to switch marketplace');
            setIsSwitching(false);
        }
    };



    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="My Business Account" showBack={true} />

            <main className="max-w-2xl mx-auto px-4 py-8">
                {/* Profile Header */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                    <div 
                        className="relative flex flex-col items-center cursor-pointer group"
                        onClick={() => navigate('/b2b/personal-profile')}
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-[2rem] flex items-center justify-center mb-4 shadow-xl shadow-primary-100 group-hover:scale-105 transition-transform">
                            <span className="text-3xl font-extrabold text-white">
                                {user?.name?.charAt(0) || 'U'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-800 group-hover:text-primary-600 transition-colors">
                            {user?.name || 'User Name'}
                        </h2>
                        <p className="text-gray-500 font-medium mb-4">{user?.email || 'user@example.com'}</p>
                        <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-widest">
                            Verified Buyer
                        </span>
                    </div>
                </div>

                {/* Marketplace Switcher Card */}
                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSwitchMarketplace}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-xl mb-4 relative overflow-hidden cursor-pointer"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 blur-2xl" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 text-white">
                                <FiShoppingBag size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">
                                    {isSwitching ? "Switching..." : "Switch to Retail"}
                                </h3>
                                <p className="text-xs text-blue-100 font-medium opacity-80">
                                    Buy for yourself at Retail Marketplace
                                </p>
                            </div>
                        </div>
                        <FiArrowRight size={20} className="text-blue-200" />
                    </div>
                </motion.div>

                {/* Become a Seller Card */}
                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/b2b/seller-selection')}
                    className="w-full bg-gradient-to-r from-primary-600 to-primary-800 rounded-3xl p-6 text-white shadow-xl mb-8 relative overflow-hidden cursor-pointer"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 blur-2xl" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 text-white">
                                <FiBriefcase size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">
                                    Become a Seller
                                </h3>
                                <p className="text-xs text-primary-100 font-medium opacity-80">
                                    Start selling on our platform
                                </p>
                            </div>
                        </div>
                        <FiArrowRight size={20} className="text-primary-200" />
                    </div>
                </motion.div>

                {/* Account Menu */}
                <div className="space-y-4">
                    {menuItems.map((item, idx) => (
                        <motion.button
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => navigate(item.path)}
                            className="w-full bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary-200 transition-all hover:shadow-md"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                    <item.icon size={22} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-800 leading-none mb-1">{item.label}</p>
                                    <p className="text-xs text-gray-400 font-medium">{item.desc}</p>
                                </div>
                            </div>
                            <FiArrowRight className="text-gray-300 group-hover:text-primary-500 transition-all group-hover:translate-x-1" />
                        </motion.button>
                    ))}

                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        onClick={handleLogout}
                        className="w-full bg-red-50 p-5 rounded-3xl border border-red-100 shadow-sm flex items-center justify-between group hover:bg-red-100 transition-all"
                    >
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm group-hover:scale-105 transition-transform">
                                <FiLogOut size={22} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-red-600 leading-none">Log Out</p>
                                <p className="text-xs text-red-400 font-medium mt-1">Exit account</p>
                            </div>
                        </div>
                        <FiArrowRight className="text-red-200 group-hover:translate-x-1 transition-all" />
                    </motion.button>
                </div>

                {/* Footer Section */}
                <div className="mt-12 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">
                        Dealing India B2B v1.0.4<br />
                        © 2026 All Rights Reserved
                    </p>
                </div>
            </main>

            <B2BBottomNav />

            {/* Vendor Type Selection Modal */}

        </div>
    );
};

export default Profile;
