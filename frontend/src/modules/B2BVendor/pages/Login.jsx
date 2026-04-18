import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiBriefcase, FiCheck, FiStar, FiX, FiArrowLeft, FiShoppingBag } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import toast from '../../../shared/utils/toast';
import api from '../../../shared/utils/api';
import { getActiveB2BPlans } from '../../../shared/utils/b2bPlanManager';
import PaymentModal from '../components/PaymentModal';
import { registerFCMToken } from '../../../services/pushNotificationService';

const B2BVendorLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setAuth, isAuthenticated, loading: storeLoading } = useB2BVendorAuthStore();

    const [formData, setFormData] = useState({
        email: location.state?.email || '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);
    const [showPlans, setShowPlans] = useState(false);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);

    useEffect(() => {
        // Check for existing authentication on mount
        const token = localStorage.getItem('b2b-vendor-token');
        const { isAuthenticated: storeAuth } = useB2BVendorAuthStore.getState();

        if (storeAuth && token) {
            const from = location.state?.from?.pathname || '/b2b-vendor/dashboard';
            navigate(from, { replace: true });
        } else if (storeAuth && !token) {
            // Store state is stale (token removed by api interceptor), force logout
            useB2BVendorAuthStore.getState().logout();
        }

        // Check if redirected due to expired subscription
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('expired') === 'true') {
            toast.error('Your subscription has expired. Please renew to continue.');
        }

        // Show message from registration if available
        if (location.state?.message) {
            toast.success(location.state.message, {
                duration: 6000,
            });
        }

        // Check for remembered email
        const savedEmail = localStorage.getItem('remembered-b2b-vendor-email');
        if (savedEmail && !location.state?.email) {
            setFormData(prev => ({ ...prev, email: savedEmail }));
            setRememberMe(true);
        }

        // Autofill email if provided (overrides remembered)
        if (location.state?.email && location.state?.autoFill) {
            setFormData(prev => ({ ...prev, email: location.state.email }));
        }
    }, [navigate, location]); // Removed isAuthenticated from deps to avoid redirect loops

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

        // If email changes and plans are shown, hide them
        if (e.target.name === 'email' && showPlans) {
            setShowPlans(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            toast.error('Please fill in all fields');
            return;
        }

        setLocalLoading(true);
        try {
            const result = await useB2BVendorAuthStore.getState().login(formData.email, formData.password);

            if (result.success) {
                // Handle Remember Me
                if (rememberMe) {
                    localStorage.setItem('remembered-b2b-vendor-email', formData.email);
                } else {
                    localStorage.removeItem('remembered-b2b-vendor-email');
                }

                toast.success('Login successful! Welcome to your dashboard.', {
                    id: 'login-success'
                });
                try { await registerFCMToken(true); } catch { }
                const from = location.state?.from?.pathname || '/b2b-vendor/dashboard';
                navigate(from, { replace: true });
            } else {
                const errorMsg = result?.message || 'Invalid B2B vendor credentials.';
                const errorCode = result?.code;

                // If account is pending approval or inactive
                if (errorMsg.toLowerCase().includes('pending')) {
                    toast.error('Account Pending: Your registration is under review. Please wait for admin approval.', {
                        duration: 8000,
                        icon: '⏳',
                        id: 'auth-pending'
                    });
                } else if (errorMsg.toLowerCase().includes('not approved') || errorMsg.toLowerCase().includes('inactive')) {
                    toast.error(errorMsg, {
                        duration: 8000,
                        icon: '🚫',
                        id: 'auth-error'
                    });
                } else if (errorCode === 'SUBSCRIPTION_EXPIRED') {
                    console.log('[B2B Vendor Login Page] Subscription expired, showing plans');
                    setShowPlans(true);
                    loadPlans();
                    toast.error('Your subscription has expired. Please renew to continue.', {
                        duration: 8000,
                        id: 'subscription-expired'
                    });
                } else {
                    console.error('[B2B Vendor Login Page] Login failed:', errorMsg);
                    if (errorMsg.toLowerCase().includes('not found')) {
                        setShowRegisterModal(true);
                    } else {
                        toast.error(errorMsg, { id: 'login-error' });
                    }
                }
            }
        } catch (error) {
            console.error('[B2B Vendor Login Page] Login error:', error);
            toast.error(error.message || 'An error occurred during login.');
        } finally {
            setLocalLoading(false);
        }
    };

    const isButtonLoading = localLoading || storeLoading;

    const loadPlans = async () => {
        setIsLoadingPlans(true);
        try {
            const plans = await getActiveB2BPlans();
            const filteredPlans = plans.filter(plan =>
                plan.duration === 3 || plan.duration === 6 || plan.duration === 12
            ).sort((a, b) => a.duration - b.duration);
            setAvailablePlans(filteredPlans);
            if (filteredPlans.length > 0) {
                const defaultPlan = filteredPlans.find(p => p.duration === 6) || filteredPlans[0];
                setSelectedPlan(defaultPlan._id || defaultPlan.id);
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            toast.error('Failed to load subscription plans');
        } finally {
            setIsLoadingPlans(false);
        }
    };

    const handlePlanSelect = (planId) => {
        setSelectedPlan(planId);
    };

    const handleSubscribe = () => {
        if (!selectedPlan) {
            toast.error('Please select a plan');
            return;
        }
        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = async (plan) => {
        // After payment success, try to login again
        toast.success('Subscription renewed successfully! Please login again.');
        setShowPlans(false);
        setShowPaymentModal(false);
        // Clear form to allow fresh login
        setFormData({ email: formData.email, password: '' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative"
            >
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-3 left-3 p-1.5 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"
                >
                    <FiArrowLeft size={20} />
                </button>
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <FiBriefcase className="text-white text-xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">B2B Vendor Login</h1>
                    <p className="text-sm text-gray-600">Access your B2B vendor portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Business Email
                        </label>
                        <div className="relative">
                            <FiMail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="vendor@business.com"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <FiLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-12 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-xs text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
                        </label>
                        <Link
                            to="/b2b-vendor/forgot-password"
                            className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isButtonLoading}
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-2.5 rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isButtonLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Logging in...</span>
                            </div>
                        ) : (
                            "Sign In"
                        )}
                    </button>

                    <div className="text-center pt-4 border-t border-gray-100 space-y-3">
                        <p className="text-xs text-gray-600">
                            Don't have a vendor account?{" "}
                            <Link
                                to="/b2b-vendor/register"
                                className="text-primary-600 font-bold hover:text-primary-700 transition-colors"
                            >
                                Register Now
                            </Link>
                        </p>
                        <div className="pt-1">
                            <p className="text-xs text-gray-500 mb-1">Looking for Bulk Marketplace?</p>
                            <Link
                                to="/b2b/login"
                                className="inline-flex items-center gap-1.5 text-primary-600 font-bold hover:gap-2 transition-all text-sm"
                            >
                                <FiShoppingBag /> Login as Buyer
                            </Link>
                        </div>
                    </div>
                </form>

                {/* Subscription Plans Section - Only shown when expired */}
                <AnimatePresence>
                    {showPlans && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-8 pt-8 border-t border-gray-200"
                        >
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-2">Renew Your Subscription</h2>
                                <p className="text-sm text-gray-600">Your subscription has expired. Please select a plan to continue.</p>
                            </div>

                            {isLoadingPlans ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                    <p className="mt-2 text-sm text-gray-600">Loading plans...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    {availablePlans.map((plan) => {
                                        const planId = plan._id || plan.id;
                                        const isSelected = selectedPlan === planId;
                                        return (
                                            <motion.div
                                                key={planId}
                                                whileHover={{ y: -5 }}
                                                onClick={() => handlePlanSelect(planId)}
                                                className={`relative bg-white rounded-2xl p-6 shadow-sm border-2 cursor-pointer transition-all ${isSelected
                                                    ? 'border-primary-500 ring-4 ring-primary-50'
                                                    : 'border-gray-100 hover:border-primary-200'
                                                    }`}
                                            >
                                                {plan.duration === 6 && (
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                                        RECOMMENDED
                                                    </div>
                                                )}

                                                <div className="mb-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
                                                        }`}>
                                                        <FiStar className="text-xl" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-800 mb-2">{plan.name}</h3>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-3xl font-extrabold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{plan.duration} Months Duration</p>
                                                </div>

                                                <ul className="space-y-2 mb-4">
                                                    {plan.features && plan.features.slice(0, 3).map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-gray-600">
                                                            <div className={`mt-1 p-0.5 rounded-full ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
                                                                }`}>
                                                                <FiCheck className="text-xs" />
                                                            </div>
                                                            <span className="text-xs font-medium">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={handleSubscribe}
                                    disabled={!selectedPlan || isLoadingPlans}
                                    className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 disabled:opacity-50 shadow-md"
                                >
                                    {isLoadingPlans ? 'Loading...' : 'Subscribe & Continue'}
                                </button>
                                <button
                                    onClick={() => setShowPlans(false)}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                planId={selectedPlan}
                onSuccess={handlePaymentSuccess}
            />

            {/* Register Modal */}
            <AnimatePresence>
                {showRegisterModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 min-h-screen">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRegisterModal(false)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                        />
                        
                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
                        >
                            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FiShoppingBag className="text-primary-600 text-3xl" />
                            </div>
                            
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Vendor Not Found</h3>
                            <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                                This business email is not registered with us. Would you like to create a new vendor account?
                            </p>
                            
                            <div className="space-y-3">
                                <Link
                                    to="/b2b-vendor/register"
                                    onClick={() => setShowRegisterModal(false)}
                                    className="block w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all"
                                >
                                    Register Now
                                </Link>
                                <button
                                    onClick={() => setShowRegisterModal(false)}
                                    className="block w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all border border-gray-100"
                                >
                                    Try Different Email
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default B2BVendorLogin;
