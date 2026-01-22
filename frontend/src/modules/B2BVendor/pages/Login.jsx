import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiBriefcase, FiCheck, FiStar, FiX, FiArrowLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { getActiveB2BPlans } from '../../../shared/utils/b2bPlanManager';
import PaymentModal from '../components/PaymentModal';

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

        // Autofill email if provided
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
            const { login } = useB2BVendorAuthStore.getState();
            console.log('[B2B Vendor Login Page] Calling login function');
            const result = await login(formData.email, formData.password);
            console.log('[B2B Vendor Login Page] Login result:', result);

            if (result && result.success) {
                // Wait for Zustand persist to save to localStorage (persist middleware is async)
                // Try multiple times to ensure state is persisted
                let retries = 0;
                const maxRetries = 10;
                let stateReady = false;
                
                while (retries < maxRetries && !stateReady) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    const { isAuthenticated, token } = useB2BVendorAuthStore.getState();
                    const storedToken = localStorage.getItem('b2b-vendor-token');
                    
                    stateReady = isAuthenticated && storedToken && token;
                    
                    if (stateReady) {
                        console.log('[B2B Vendor Login Page] State confirmed ready after', retries + 1, 'retries');
                        break;
                    }
                    
                    retries++;
                }
                
                // Final check
                const { isAuthenticated, token } = useB2BVendorAuthStore.getState();
                const storedToken = localStorage.getItem('b2b-vendor-token');
                console.log('[B2B Vendor Login Page] Final state check - isAuthenticated:', isAuthenticated, 'token:', storedToken ? 'exists' : 'missing', 'state token:', token ? 'exists' : 'missing');
                
                if (isAuthenticated && storedToken && token) {
                    toast.success('B2B Vendor Login successful!');
                    // Small delay before navigation to ensure everything is settled
                    await new Promise(resolve => setTimeout(resolve, 50));
                    const from = location.state?.from?.pathname || '/b2b-vendor/dashboard';
                    navigate(from, { replace: true });
                } else {
                    console.error('[B2B Vendor Login Page] State not properly updated after login', {
                        isAuthenticated,
                        hasStoredToken: !!storedToken,
                        hasStateToken: !!token
                    });
                    toast.error('Login successful but state not updated. Please refresh the page.');
                }
            } else {
                const errorMsg = result?.message || 'Invalid B2B vendor credentials.';
                const errorCode = result?.code;
                
                // If subscription expired, show plans
                if (errorCode === 'SUBSCRIPTION_EXPIRED') {
                    console.log('[B2B Vendor Login Page] Subscription expired, showing plans');
                    setShowPlans(true);
                    loadPlans();
                    toast.error('Your subscription has expired. Please renew to continue.');
                } else {
                    console.error('[B2B Vendor Login Page] Login failed:', errorMsg);
                    toast.error(errorMsg);
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
                className="glass-card rounded-3xl p-8 w-full max-w-md shadow-2xl relative"
            >
             {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-4 left-4 p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"
            >
                <FiArrowLeft size={24} />
            </button>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FiBriefcase className="text-white text-2xl" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">B2B Vendor Login</h1>
                    <p className="text-gray-600">Access your B2B vendor portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Business Email
                        </label>
                        <div className="relative">
                            <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="vendor@example.com"
                                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter password"
                                className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Remember me</span>
                        </label>
                        <Link
                            to="/b2b-vendor/forgot-password"
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isButtonLoading}
                        className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 disabled:opacity-50 shadow-md"
                    >
                        {isButtonLoading ? 'Authenticating...' : 'Login'}
                    </button>

                    <div className="text-center space-y-4 pt-6 mt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                            New B2B Vendor?{' '}
                            <Link
                                to="/b2b-vendor/register"
                                state={{ from: location.state?.from }}
                                className="text-primary-600 hover:text-primary-700 font-semibold"
                            >
                                Apply Now
                            </Link>
                        </p>

                        <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Retail Vendor?</span>
                            <Link to="/vendor/login" className="text-primary-600 font-bold hover:underline">
                                Switch to B2C Vendor Panel
                            </Link>
                            
                            <div className="mt-2 pt-2 w-full border-t border-gray-100 flex flex-col items-center gap-1">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">B2B Buyer?</span>
                                <Link to="/b2b/login" className="text-primary-600 font-bold hover:underline">
                                    Switch to B2B Buyer Login
                                </Link>
                            </div>
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
                                                className={`relative bg-white rounded-2xl p-6 shadow-sm border-2 cursor-pointer transition-all ${
                                                    isSelected
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
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                                                        isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
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
                                                            <div className={`mt-1 p-0.5 rounded-full ${
                                                                isSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
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
        </div>
    );
};

export default B2BVendorLogin;
