import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiBriefcase } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import toast from 'react-hot-toast';

const B2BVendorLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setAuth, isAuthenticated, loading: storeLoading } = useB2BVendorAuthStore();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);

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

        // Show message from registration if available
        if (location.state?.message) {
            toast.success(location.state.message, {
                duration: 6000,
            });
        }
    }, [navigate, location]); // Removed isAuthenticated from deps to avoid redirect loops
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
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
                console.error('[B2B Vendor Login Page] Login failed:', errorMsg);
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('[B2B Vendor Login Page] Login error:', error);
            toast.error(error.message || 'An error occurred during login.');
        } finally {
            setLocalLoading(false);
        }
    };

    const isButtonLoading = localLoading || storeLoading;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
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
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BVendorLogin;
