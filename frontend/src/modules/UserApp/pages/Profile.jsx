import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiPackage, FiMapPin, FiCreditCard, FiGift,
  FiLogOut, FiChevronRight, FiEdit2, FiSettings, FiCamera,
  FiShield, FiHelpCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import { useAuthStore } from '../../../shared/store/authStore';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import toast from 'react-hot-toast';

const MobileProfile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showExitModal, setShowExitModal] = useState(false);

  // Check Mega Reward Status
  const [isRewardEntered, setIsRewardEntered] = useState(false);

  useEffect(() => {
    const lastEntryStr = localStorage.getItem('mega_reward_last_entry');
    if (lastEntryStr) {
      const lastEntry = new Date(lastEntryStr);
      const now = new Date();
      if (lastEntry.getMonth() === now.getMonth() && lastEntry.getFullYear() === now.getFullYear()) {
        setIsRewardEntered(true);
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/app/login');
    toast.success('Logged out successfully');
  };

  const menuItems = [
    { icon: FiPackage, label: 'My Orders', subtitle: 'Track, return, or buy again', path: '/app/orders', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: FiMapPin, label: 'Addresses', subtitle: 'Manage delivery addresses', path: '/app/addresses', color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: FiCreditCard, label: 'Wallet & Payments', subtitle: 'Methods, history, and credits', path: '/app/wallet', color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: FiShield, label: 'Privacy & Security', subtitle: 'Change password, security', path: '/app/settings', color: 'text-green-600', bg: 'bg-green-50' },
    { icon: FiHelpCircle, label: 'Help Center', subtitle: 'FAQs and support', path: '/app/help', color: 'text-gray-600', bg: 'bg-gray-50' },
  ];

  return (
    <ProtectedRoute>
      <PageTransition>
        <MobileLayout showBottomNav={true} showCartBar={true}>
          <div className="w-full pb-28 bg-gray-50 min-h-screen">

            {/* Header */}
            <div className="bg-white px-4 pt-8 pb-6 rounded-b-[2rem] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-10 -mt-10 opacity-50" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full gradient-green flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md text-gray-700 hover:text-green-600 transition-colors">
                    <FiEdit2 className="text-sm" />
                  </button>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">{user?.name || 'User Name'}</h1>
                <p className="text-gray-500 text-sm">{user?.email || 'user@example.com'}</p>
              </div>
            </div>

            <div className="px-4 -mt-4 relative z-20 space-y-4">

              {/* Mega Reward Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/app/mega-reward')}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-20 h-20 bg-black/10 rounded-full blur-lg" />

                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
                      <h3 className="font-bold text-lg">Mega Monthly Reward</h3>
                    </div>
                    <p className="text-white/90 text-sm mb-3 max-w-[200px]">
                      {isRewardEntered
                        ? "You've entered for this month! Fingers crossed."
                        : "Share & Enter to win exclusive prizes worth ₹50,000!"}
                    </p>
                    <button className="bg-white text-purple-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide shadow-md">
                      {isRewardEntered ? "View Details" : "Enter Now"}
                    </button>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                    <FiGift className="text-3xl text-yellow-300" />
                  </div>
                </div>
              </motion.div>

              {/* Menu Items */}
              <div className="bg-white rounded-2xl p-2 shadow-sm">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index}>
                      <button
                        onClick={() => navigate(item.path)}
                        className="w-full flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                      >
                        <div className={`w-10 h-10 rounded-full ${item.bg} ${item.color} flex items-center justify-center mr-4 group-hover:scale-110 transition-transform`}>
                          <Icon className="text-lg" />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="text-gray-900 font-semibold text-sm">{item.label}</h4>
                          <p className="text-gray-500 text-xs">{item.subtitle}</p>
                        </div>
                        <FiChevronRight className="text-gray-400" />
                      </button>
                      {index < menuItems.length - 1 && <div className="h-px bg-gray-50 mx-14" />}
                    </div>
                  );
                })}
              </div>

              {/* Logout Button */}
              <button
                onClick={() => setShowExitModal(true)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-center gap-2 text-red-500 font-semibold hover:bg-red-50 transition-colors"
              >
                <FiLogOut />
                All Logout
              </button>
            </div>

            {/* Logout Confirmation Modal */}
            <AnimatePresence>
              {showExitModal && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowExitModal(false)}
                    className="fixed inset-0 bg-black/60 z-[99999]"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-2xl p-6 z-[100000] shadow-2xl text-center"
                  >
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiLogOut className="text-2xl" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Logout?</h3>
                    <p className="text-gray-500 mb-6">Are you sure you want to logout from your account?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowExitModal(false)}
                        className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold shadow-lg shadow-red-200"
                      >
                        Yes, Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

          </div>
        </MobileLayout>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default MobileProfile;
