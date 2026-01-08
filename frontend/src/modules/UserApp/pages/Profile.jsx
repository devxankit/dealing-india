import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiPackage, FiMapPin, FiCreditCard, FiGift,
  FiLogOut, FiChevronRight, FiEdit2, FiSettings, FiCamera,
  FiShield, FiArrowLeft, FiMessageSquare, FiRotateCcw, FiShoppingBag
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
    { icon: FiRotateCcw, label: 'My Returns', subtitle: 'Track return status', path: '/app/returns', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: FiMapPin, label: 'Addresses', subtitle: 'Manage delivery addresses', path: '/app/addresses', color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: FiCreditCard, label: 'Wallet & Payments', subtitle: 'Methods, history, and credits', path: '/app/wallet', color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: FiMessageSquare, label: 'Support Tickets', subtitle: 'Get help with orders and account', path: '/app/support-tickets', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { icon: FiShield, label: 'Privacy & Security', subtitle: 'Change password, security', path: '/app/settings', color: 'text-green-600', bg: 'bg-green-50' },
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

              {/* Mega Reward Card - Compact & Elegant */}
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/app/mega-reward', { state: { scrollToTicket: isRewardEntered } })}
                className="w-full bg-[#0A0A0A] rounded-xl p-4 text-white shadow-xl relative overflow-hidden cursor-pointer border border-yellow-500/20"
              >
                {/* Subtle Glow */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl" />

                <div className="relative z-10 flex items-center gap-4">
                  {/* Compact Icon Section */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-yellow-500/10 blur-lg rounded-full" />
                    <div className="relative w-12 h-12 bg-gradient-to-tr from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg border border-white/10 rotate-3">
                      <FiGift className="text-2xl text-white drop-shadow-md -rotate-3" />
                    </div>
                  </div>

                  {/* Text Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-black text-sm tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 uppercase">
                        Mega Reward
                      </h3>
                      <span className="flex h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">
                      {isRewardEntered ? "Confirmed entry • View Ticket" : "Win ₹50,000 • Enter Now"}
                    </p>
                  </div>

                  <div className="text-yellow-500/50">
                    <FiArrowLeft className="rotate-180 text-lg" />
                  </div>
                </div>
              </motion.div>

              {/* Become a Seller Banner */}
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ delay: 0.1 }}
                onClick={() => navigate('/vendor/register', {
                  state: {
                    userData: {
                      name: user?.name,
                      email: user?.email,
                      phone: user?.phone
                    },
                    isUpgrade: true
                  }
                })}
                className="w-full bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-4 text-white shadow-xl relative overflow-hidden cursor-pointer"
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-blue-500/10 rounded-full -ml-6 -mb-6 blur-xl" />

                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10">
                    <FiShoppingBag className="text-2xl text-blue-200" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-blue-50 mb-0.5">Become a Seller</h3>
                    <p className="text-[10px] text-blue-200 font-medium leading-tight">
                      Start your business today & reach millions
                    </p>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center backdrop-blur-sm">
                    <FiArrowLeft className="rotate-180 text-blue-200" />
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
                    initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }}
                    animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }}
                    exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }}
                    className="fixed top-1/2 left-1/2 w-[90%] max-w-sm bg-white rounded-2xl p-6 z-[100000] shadow-2xl text-center"
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
