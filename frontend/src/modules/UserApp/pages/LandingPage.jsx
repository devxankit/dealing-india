import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBriefcase, FiShoppingBag, FiUser, FiShoppingCart } from 'react-icons/fi';
import MobileHome from './Home';
import { appLogo } from "../../../data/logos";
import { useAuthStore } from '../../../shared/store/authStore';
import { useVendorAuthStore } from "../../Vendor/store/vendorAuthStore";
import { useB2BVendorAuthStore } from "../../B2BVendor/store/b2bVendorAuthStore";
import dealingLanding from '../../../assets/landing/dealingindia.png';

const LandingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated: isUserAuth, userType } = useAuthStore();
    const { isAuthenticated: isVendorAuth } = useVendorAuthStore();
    const { isAuthenticated: isB2BVendorAuth } = useB2BVendorAuthStore();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        // We only redirect if specifically coming from a login attempt or if we want to force dashboard
        // For the root /app path, we allow vendors to see the landing page/marketplace
        if (isUserAuth) {
            if (userType === 'b2b') {
                navigate('/b2b/catalog', { replace: true });
            } else if (userType === 'b2c') {
                navigate('/app/home', { replace: true });
            }
        } else if (isVendorAuth) {
            navigate('/vendor/dashboard', { replace: true });
        } else if (isB2BVendorAuth) {
            navigate('/b2b-vendor/dashboard', { replace: true });
        }
    }, [isUserAuth, isVendorAuth, isB2BVendorAuth, userType, isMobile, navigate]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleVendorTypeSelection = (vendorType) => {
        if (vendorType === 'b2b') {
            if (isB2BVendorAuth) {
                navigate('/b2b-vendor/dashboard');
            } else {
                navigate('/b2b-vendor/login', { state: { from: { pathname: '/b2b-vendor/dashboard' } } });
            }
        } else {
            if (isVendorAuth) {
                navigate('/vendor/dashboard');
            } else {
                navigate('/vendor/login', { state: { from: { pathname: '/vendor/dashboard' } } });
            }
        }
    };

    const handleBuyerLogin = (type) => {
        if (type === 'b2b') {
            navigate('/b2b/login', { state: { from: { pathname: '/b2b/catalog' } } });
        } else {
            // Navigate to the B2C login page as requested
            navigate('/app/login', { state: { from: { pathname: '/app/home' } } });
        }
    };

    // Show marketplace (MobileHome) if:
    // 1. User is on a mobile device
    if (isMobile) {
        return <MobileHome />;
    }

    return (
        <div className="min-h-screen bg-white overflow-hidden flex flex-col font-sans">
            {/* Navigation Header */}
            <div className="bg-white sticky top-0 z-50 px-8 py-4 flex items-center justify-between shadow-sm border-b border-gray-50 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-10 md:h-12">
                        <img
                            src={appLogo.src}
                            alt={appLogo.alt}
                            className="h-full object-contain cursor-pointer"
                            onClick={() => navigate('/app')}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <span className="hidden text-2xl font-bold text-secondary-600">Dealing India</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Buyer Buttons */}
                    <button
                        onClick={() => handleBuyerLogin('b2c')}
                        className="px-6 py-2.5 bg-primary-600 border border-primary-600 rounded-xl text-sm font-bold text-white hover:bg-primary-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <FiUser className="text-lg" /> B2C Buyer
                    </button>
                    <button
                        onClick={() => handleBuyerLogin('b2b')}
                        className="px-6 py-2.5 bg-orange-600 border border-orange-600 rounded-xl text-sm font-bold text-white hover:bg-orange-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <FiShoppingCart className="text-lg" /> B2B Buyer
                    </button>

                    {/* Vendor Buttons */}
                    <button
                        onClick={() => handleVendorTypeSelection('b2b')}
                        className="px-6 py-2.5 bg-orange-600 border border-orange-600 rounded-xl text-sm font-bold text-white hover:bg-orange-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <FiBriefcase className="text-lg" /> B2B Vendor
                    </button>
                    <button
                        onClick={() => handleVendorTypeSelection('vendor')}
                        className="px-6 py-2.5 bg-green-600 border border-green-600 rounded-xl text-sm font-bold text-white hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <FiShoppingBag className="text-lg" /> B2C Vendor
                    </button>
                </div>
            </div>

            {/* Hero Section */}
            <div className="flex-1 relative bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-between px-16 overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-100/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-100/30 rounded-full blur-3xl -ml-20 -mb-20"></div>

                <div className="relative z-10 max-w-2xl w-1/2">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-7xl font-black text-gray-900 leading-[1.1] mb-8">
                            Your Ultimate <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500">B2B & B2C</span> <br />
                            Marketplace for <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-500">Bharat</span>
                        </h1>

                        <p className="text-gray-600 text-xl mb-10 max-w-lg leading-relaxed font-medium">
                            Buy at Wholesale Prices or Sell at 0% Commission. <br />
                            Empowering millions of Buyers and Sellers across India.
                        </p>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => handleBuyerLogin('b2c')}
                                className="px-8 py-4 bg-green-600 text-white rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2"
                            >
                                Start Shopping <FiShoppingCart />
                            </button>
                            <button
                                onClick={() => handleVendorTypeSelection('vendor')}
                                className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center gap-2"
                            >
                                Start Selling <FiBriefcase />
                            </button>
                        </div>
                    </motion.div>
                </div>

                <div className="w-1/2 relative z-10 h-full flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-200/20 to-green-200/20 rounded-[3rem] blur-2xl"></div>
                        <img
                            src={dealingLanding}
                            alt="Dealing India"
                            className="max-h-[75vh] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] relative z-10"
                        />
                    </motion.div>
                </div>
            </div>

            {/* Stats Section - Footer */}
            <div className="bg-white border-t border-gray-100 py-12 flex-shrink-0">
                <div className="grid grid-cols-4 gap-8 px-16 max-w-7xl mx-auto">
                    {[
                        { title: "Lakhs of", desc: "Sellers trust Dealing India to grow business", color: "orange" },
                        { title: "Crores of", desc: "Products available at best prices", color: "green" },
                        { title: "Thousands of", desc: "Serviceable pincodes across India", color: "orange" },
                        { title: "Hundreds of", desc: "Categories for every need", color: "green" }
                    ].map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + (idx * 0.1) }}
                            className={`p-8 rounded-3xl border transition-all hover:shadow-xl hover:-translate-y-1 ${stat.color === 'orange'
                                ? 'bg-orange-50 border-orange-100'
                                : 'bg-green-50 border-green-100'
                                }`}
                        >
                            <div className={`text-2xl font-black mb-2 ${stat.color === 'orange' ? 'text-orange-600' : 'text-green-600'
                                }`}>{stat.title}</div>
                            <div className="text-gray-600 font-semibold leading-snug">{stat.desc}</div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
