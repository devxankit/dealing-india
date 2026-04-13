import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiSettings, FiBell, FiHelpCircle, FiLogOut, FiBriefcase, FiArrowRight, FiShoppingBag, FiX, FiCopy, FiShare2, FiInstagram, FiFacebook, FiYoutube, FiPlayCircle, FiShield } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { useAuthStore } from '../../../shared/store/authStore';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { getMyReferralSummary } from '../../../shared/services/referralService';
import { getSupportConfig } from '../../../shared/services/supportService';

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [referralData, setReferralData] = useState(null);
    const [referralLoading, setReferralLoading] = useState(false);
    const [referralError, setReferralError] = useState('');
    const [supportConfig, setSupportConfig] = useState(null);

    const menuItems = [
        { icon: FiBriefcase, label: 'Company Profile', desc: 'Manage your business details & GST', path: '/b2b/company' },
        { icon: FiBell, label: 'Notifications', desc: 'Manage inquiry alerts', path: '/b2b/notifications' },
        { icon: FiHelpCircle, label: 'Support & FAQs', desc: 'Get help with your bulk orders', path: '/b2b/support' },
        { icon: FiPlayCircle, label: 'How to Use', desc: 'Watch a guide to the platform', path: '/b2b/how-to-use' },
        { icon: FiShield, label: 'Terms & Conditions', desc: 'Platform legal guidelines', path: '/terms?type=user' },
    ];

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/app/login');
    };

    useEffect(() => {
        const fetchSupport = async () => {
            try {
                const res = await getSupportConfig();
                if (res.success) setSupportConfig(res.data);
            } catch (err) {}
        };
        fetchSupport();

        const loadReferral = async () => {
            setReferralLoading(true);
            setReferralError('');
            try {
                const data = await getMyReferralSummary();
                setReferralData(data);
            } catch (error) {
                console.error('Failed to load referral summary:', error);
                setReferralError(error?.response?.data?.message || error?.message || 'Unable to load referral details');
            } finally {
                setReferralLoading(false);
            }
        };

        if (user?._id) {
            loadReferral();
        }
    }, [user?._id]);

    const copyReferralLink = async () => {
        if (!referralData?.referralLink) return;
        try {
            await navigator.clipboard.writeText(referralData.referralLink);
            toast.success('Referral link copied');
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="My Business Account" showBack={false} />

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

                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl mb-8">
                    <p className="text-xs uppercase tracking-widest text-emerald-100 font-bold mb-2">Referral Program</p>
                    <p className="text-sm font-semibold">Code: {referralData?.referralCode || 'Not available'}</p>
                    <p className="text-sm text-emerald-100 mt-1">
                        Referrals: {referralData?.referralCount || 0} | Wallet Points: {referralData?.wallet?.pointsBalance || 0}
                    </p>
                    {referralLoading && <p className="text-xs text-emerald-100 mt-2">Loading referral details...</p>}
                    {referralError && (
                        <p className="text-xs text-amber-100 mt-2">
                            {referralError}. Restart backend and refresh this page.
                        </p>
                    )}
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={copyReferralLink}
                            disabled={!referralData?.referralLink}
                            className="px-3 py-2 rounded-xl bg-white text-emerald-700 text-xs font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FiCopy /> Copy Link
                        </button>
                        <a
                            href={referralData?.whatsappShareLink || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                if (!referralData?.whatsappShareLink) e.preventDefault();
                            }}
                            className="px-3 py-2 rounded-xl bg-emerald-900/30 text-white text-xs font-bold flex items-center gap-2 border border-white/20"
                        >
                            <FiShare2 /> WhatsApp
                        </a>
                    </div>
                </div>

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

                {/* Footer Section with Social Links */}
                <div className="mt-12 text-center pb-8 px-4">
                    {supportConfig && (
                        <div className="flex items-center justify-center gap-6 mb-8">
                            {supportConfig.instagram && (
                                <motion.a 
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    href={supportConfig.instagram} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-12 h-12 bg-white rounded-2xl shadow-sm text-pink-600 flex items-center justify-center border border-gray-100 hover:shadow-md transition-all"
                                >
                                    <FiInstagram size={24} />
                                </motion.a>
                            )}
                            {supportConfig.facebook && (
                                <motion.a 
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    href={supportConfig.facebook} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-12 h-12 bg-white rounded-2xl shadow-sm text-blue-600 flex items-center justify-center border border-gray-100 hover:shadow-md transition-all"
                                >
                                    <FiFacebook size={24} />
                                </motion.a>
                            )}
                            {supportConfig.youtube && (
                                <motion.a 
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    href={supportConfig.youtube} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-12 h-12 bg-white rounded-2xl shadow-sm text-red-600 flex items-center justify-center border border-gray-100 hover:shadow-md transition-all"
                                >
                                    <FiYoutube size={24} />
                                </motion.a>
                            )}
                        </div>
                    )}
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">
                        Dealing India B2B v1.0.4<br />
                        © 2026 All Rights Reserved
                    </p>
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default Profile;
