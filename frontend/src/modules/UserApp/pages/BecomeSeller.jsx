import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheckCircle, FiTrendingUp, FiUsers, FiBox, FiBriefcase, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import MobileLayout from "../components/Layout/MobileLayout";
import { useAuthStore } from '../../../shared/store/authStore';
import { useVendorAuthStore } from '../../Vendor/store/vendorAuthStore';
import { useB2BVendorAuthStore } from '../../B2BVendor/store/b2bVendorAuthStore';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { appLogo } from "../../../data/logos";
import dealingLanding from '../../../assets/landing/dealingindia.png';

const BecomeSeller = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const handleVendorTypeSelection = async (vendorType) => {
    // Navigate directly to the login page for the selected vendor type
    if (vendorType === 'b2b') {
        navigate('/b2b-vendor/login', { state: { from: { pathname: '/b2b-vendor/dashboard' } } });
    } else {
        navigate('/vendor/login', { state: { from: { pathname: '/vendor/dashboard' } } });
    }
  };

  return (
    <MobileLayout showBottomNav={false} showCartBar={false} fullScreen={true}>
      <div className="h-full bg-white overflow-hidden flex flex-col">
        
        {/* Navigation Header */}
        <div className="bg-white sticky top-0 z-50 px-4 md:px-8 py-2 flex items-center justify-between shadow-sm border-b border-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <FiArrowLeft className="text-lg" />
            </button>
            <div className="h-7 md:h-10">
              <img 
                src={appLogo.src} 
                alt={appLogo.alt} 
                className="h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <span className="hidden text-lg font-bold text-blue-600">Dealing India</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleVendorTypeSelection('b2b')}
              className="px-2.5 py-1.5 md:px-6 md:py-2 bg-orange-50 border border-orange-200 rounded-lg text-[10px] md:text-sm font-bold text-orange-600 hover:bg-orange-100 transition-colors flex items-center gap-2"
            >
              <FiBriefcase className="hidden md:block" /> B2B Vendor
            </button>
            <button 
              onClick={() => handleVendorTypeSelection('vendor')}
              className="px-2.5 py-1.5 md:px-6 md:py-2 bg-green-50 border border-green-200 rounded-lg text-[10px] md:text-sm font-bold text-green-600 hover:bg-green-100 transition-colors flex items-center gap-2"
            >
              <FiShoppingBag className="hidden md:block" /> B2C Vendor
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="flex-1 relative bg-gradient-to-br from-orange-50 via-white to-green-50 flex flex-col md:flex-row items-center justify-center px-6 md:px-16 overflow-hidden">
             {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-100/50 rounded-full blur-3xl -mr-12 -mt-12"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-100/50 rounded-full blur-2xl -ml-8 -mb-8"></div>

          <div className="relative z-10 max-w-2xl w-full text-center md:text-left md:w-1/2 mb-4 md:mb-0">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl md:text-5xl font-black text-gray-900 leading-tight mb-3"
            >
              Sell online to <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500">Crores of Customers</span> <br className="hidden md:block"/>
              at <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-500">0% Commission</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600 text-sm md:text-lg mb-4 max-w-lg mx-auto md:mx-0"
            >
              Become a seller today and grow your business across India. Don't have a GSTIN? You can still sell!
            </motion.p>
          </div>

          <div className="w-full md:w-1/2 relative z-10 flex items-center justify-center max-h-[30vh] md:max-h-full overflow-hidden">
            {/* Realistic Delivery Man Image */}
            <motion.img
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                src={dealingLanding}
                alt="Dealing India"
                className="h-full max-h-48 md:max-h-[85%] object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Stats Section - Footer */}
        <div className="bg-white border-t border-gray-100 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-3 py-4 max-w-7xl mx-auto">
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
              <div className="text-orange-600 text-base font-bold mb-0.5">Lakhs of</div>
              <div className="text-[10px] text-gray-600 font-medium leading-tight">Sellers trust Dealing India</div>
            </div>
            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
               <div className="text-green-600 text-base font-bold mb-0.5">Crores of</div>
               <div className="text-[10px] text-gray-600 font-medium leading-tight">Customers buying across India</div>
            </div>
             <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
               <div className="text-orange-600 text-base font-bold mb-0.5">Thousands of</div>
               <div className="text-[10px] text-gray-600 font-medium leading-tight">Serviceable pincodes</div>
            </div>
             <div className="p-3 bg-green-50 rounded-xl border border-green-100">
               <div className="text-green-600 text-base font-bold mb-0.5">Hundreds of</div>
               <div className="text-[10px] text-gray-600 font-medium leading-tight">Categories to sell online</div>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isCheckingStatus && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-4 shadow-2xl">
                <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-900 font-bold">Checking Status...</p>
            </div>
            </div>
        )}

      </div>
    </MobileLayout>
  );
};

export default BecomeSeller;
