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
    const { login: loginVendor } = useVendorAuthStore();
    const { login: loginB2BVendor } = useB2BVendorAuthStore();
    const [isSwitching, setIsSwitching] = useState(false);
    const [showVendorTypeModal, setShowVendorTypeModal] = useState(false);
    const [isCheckingVendorStatus, setIsCheckingVendorStatus] = useState(false);

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

    // Check vendor status and handle navigation
    const handleVendorTypeSelection = async (vendorType) => {
        if (!user?.email) {
            toast.error('User email not found');
            setShowVendorTypeModal(false);
            return;
        }

        setIsCheckingVendorStatus(true);
        setShowVendorTypeModal(false);

        try {
            // Check if vendor exists and is approved
            const response = await api.get(`/auth/vendor/check-status/${user.email}`);

            if (response.success && response.data) {
                const { exists, isApproved, vendorType: existingVendorType, status } = response.data;

                // Normalize vendorType for comparison
                // Backend returns 'b2b' for B2B vendors and 'b2c' (or null/undefined) for regular vendors
                // Frontend uses 'b2b' for B2B and 'vendor' for regular vendors
                const normalizedSelectedType = vendorType === 'b2b' ? 'b2b' : 'b2c';
                const normalizedExistingType = existingVendorType === 'b2b' ? 'b2b' : 'b2c';

                // If vendor exists and is approved for the selected type
                if (exists && isApproved && normalizedExistingType === normalizedSelectedType) {
                    // Check if already logged in as this vendor type
                    if (vendorType === 'b2b') {
                        const b2bVendorStore = useB2BVendorAuthStore.getState();
                        if (b2bVendorStore.isAuthenticated) {
                            toast.success('Already logged in as B2B Vendor');
                            navigate('/b2b-vendor/dashboard');
                            setIsCheckingVendorStatus(false);
                            return;
                        }
                    } else {
                        const vendorStore = useVendorAuthStore.getState();
                        if (vendorStore.isAuthenticated) {
                            toast.success('Already logged in as Vendor');
                            navigate('/vendor/dashboard');
                            setIsCheckingVendorStatus(false);
                            return;
                        }
                    }

                    // Redirect to login with email prefilled
                    if (vendorType === 'b2b') {
                        navigate('/b2b-vendor/login', {
                            state: {
                                email: user.email,
                                autoFill: true,
                                message: 'Please login to access your B2B Vendor dashboard'
                            }
                        });
                    } else {
                        navigate('/vendor/login', {
                            state: {
                                email: user.email,
                                autoFill: true,
                                message: 'Please login to access your Vendor dashboard'
                            }
                        });
                    }
                    setIsCheckingVendorStatus(false);
                    return;
                }

                // If vendor exists but is pending approval
                if (exists && status === 'pending') {
                    toast.success('Your vendor account is pending admin approval. Please wait for approval.');
                    if (vendorType === 'b2b') {
                        navigate('/b2b-vendor/login', {
                            state: {
                                email: user.email,
                                autoFill: true,
                                message: 'Your account is pending approval. Please login to check status.'
                            }
                        });
                    } else {
                        navigate('/vendor/login', {
                            state: {
                                email: user.email,
                                autoFill: true,
                                message: 'Your account is pending approval. Please login to check status.'
                            }
                        });
                    }
                    setIsCheckingVendorStatus(false);
                    return;
                }

                // If vendor exists but is different type
                if (exists && normalizedExistingType !== normalizedSelectedType) {
                    toast.success(`You already have a ${normalizedExistingType === 'b2b' ? 'B2B Vendor' : 'Vendor'} account. Redirecting...`);
                    if (normalizedExistingType === 'b2b') {
                        navigate('/b2b-vendor/login', {
                            state: {
                                email: user.email,
                                autoFill: true
                            }
                        });
                    } else {
                        navigate('/vendor/login', {
                            state: {
                                email: user.email,
                                autoFill: true
                            }
                        });
                    }
                    setIsCheckingVendorStatus(false);
                    return;
                }
            }

            // No vendor account exists - redirect to registration with user data prefilled
            if (vendorType === 'b2b') {
                navigate('/b2b-vendor/register', {
                    state: {
                        preFilledData: {
                            name: user.name,
                            email: user.email,
                            phone: user.phone
                        },
                        isUpgrade: true
                    }
                });
            } else if (vendorType === 'vendor') {
                // Regular vendor registration
                navigate('/vendor/register', {
                    state: {
                        preFilledData: {
                            name: user.name,
                            email: user.email,
                            phone: user.phone
                        },
                        isUpgrade: true
                    }
                });
            } else {
                // Fallback - should not happen
                toast.error('Invalid vendor type selected');
                setIsCheckingVendorStatus(false);
            }
            setIsCheckingVendorStatus(false);
        } catch (error) {
            console.error('Error checking vendor status:', error);
            toast.error('Failed to check vendor status. Please try again.');
            setIsCheckingVendorStatus(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="My Business Account" showBack={true} />

            <main className="max-w-2xl mx-auto px-4 py-8">
                {/* Profile Header */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                    <div className="relative flex flex-col items-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-[2rem] flex items-center justify-center mb-4 shadow-xl shadow-primary-100">
                            <span className="text-3xl font-extrabold text-white">
                                {user?.name?.charAt(0) || 'U'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-800">{user?.name || 'User Name'}</h2>
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
                    onClick={() => setShowVendorTypeModal(true)}
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
            <AnimatePresence>
                {showVendorTypeModal && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowVendorTypeModal(false)}
                            className="fixed inset-0 bg-black/60 z-[99999] backdrop-blur-sm"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }}
                            animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }}
                            exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }}
                            className="fixed top-1/2 left-1/2 w-[90%] max-w-md bg-white rounded-2xl p-6 z-[100000] shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Become a Seller</h3>
                                <button
                                    onClick={() => setShowVendorTypeModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <FiX className="text-xl" />
                                </button>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-600 mb-6">
                                Choose the type of seller account you want to create:
                            </p>

                            {/* Options */}
                            <div className="space-y-3">
                                {/* B2B Vendor Option */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleVendorTypeSelection('b2b')}
                                    className="w-full p-4 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl text-white shadow-lg hover:shadow-xl transition-all text-left flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-colors">
                                        <FiBriefcase className="text-2xl" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-base mb-1">B2B Vendor</h4>
                                        <p className="text-xs text-gray-300">
                                            Wholesale & bulk business
                                        </p>
                                    </div>
                                    <div className="text-white/50 group-hover:text-white transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </motion.button>

                                {/* Regular Vendor Option */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleVendorTypeSelection('vendor')}
                                    className="w-full p-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl text-white shadow-lg hover:shadow-xl transition-all text-left flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-colors">
                                        <FiShoppingBag className="text-2xl" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-base mb-1">Vendor</h4>
                                        <p className="text-xs text-blue-200">
                                            Retail & individual seller
                                        </p>
                                    </div>
                                    <div className="text-white/50 group-hover:text-white transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Loading Overlay */}
            {isCheckingVendorStatus && (
                <div className="fixed inset-0 bg-black/50 z-[100001] flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-700 font-medium">Checking vendor status...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
