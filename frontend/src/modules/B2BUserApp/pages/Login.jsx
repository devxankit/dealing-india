import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiPhone, FiLock, FiEye, FiEyeOff, FiBriefcase, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../shared/store/authStore';
import toast from '../../../shared/utils/toast';
import { registerFCMToken } from '../../../services/pushNotificationService';

const B2BUserLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        phone: '',
        countryCode: '+91',
        password: '',
    });

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/b2b/catalog';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            // Only allow numbers and limit to 10 digits
            const cleaned = value.replace(/[^0-9]/g, '').slice(0, 10);
            setFormData({ ...formData, [name]: cleaned });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        setIsLoading(true);
        try {
            const identifier = `${formData.countryCode}${formData.phone}`;
            // Send userType: 'b2b' to land in B2B marketplace
            const result = await login(identifier, formData.password, false, 'b2b');
            if (result.success) {
                toast.success('Welcome back to Bulk Marketplace!');
                try { await registerFCMToken(true); } catch {}
                const from = location.state?.from?.pathname || '/b2b/catalog';
                navigate(from, { replace: true });
            } else {
                toast.error(result.message || 'Login failed');
            }
        } catch (error) {
            toast.error(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-primary-600"></div>

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-3 left-3 p-1.5 hover:bg-gray-100 text-gray-500 rounded-full transition-colors z-10"
                >
                    <FiArrowLeft size={20} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-50">
                        <FiBriefcase className="text-primary-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">B2B Login</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Access the Bulk Marketplace</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Phone Number</label>
                        <div className="flex gap-2">
                            <select
                                name="countryCode"
                                value={formData.countryCode}
                                onChange={handleChange}
                                className="w-20 px-2 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-gray-900 appearance-none cursor-pointer text-sm"
                            >
                                <option value="+91">+91</option>
                                <option value="+880">+880</option>
                                <option value="+1">+1</option>
                                <option value="+44">+44</option>
                            </select>
                            <div className="relative flex-1 group">
                                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="10 digit number"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Password</label>
                        <div className="relative group">
                            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500"
                            >
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                        <div className="flex justify-end pt-0.5">
                            <Link
                                to="/b2b/forgot-password"
                                tabIndex="-1"
                                className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold text-base hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Verifying...' : 'Sign In as Buyer'}
                    </button>

                    <div className="pt-6 border-t border-gray-100 text-center space-y-3">
                        <p className="text-xs text-gray-600">
                            New to Bulk Marketplace?{' '}
                            <Link
                                to="/b2b/register"
                                state={{ from: location.state?.from }}
                                className="text-primary-600 hover:text-primary-700 font-bold"
                            >
                                Create Account
                            </Link>
                        </p>
                        <div className="pt-1">
                            <p className="text-xs text-gray-500 mb-1">Are you a Seller?</p>
                            <Link
                                to="/b2b-vendor/login"
                                className="inline-flex items-center gap-1.5 text-primary-600 font-bold hover:gap-2 transition-all text-sm"
                            >
                                <FiBriefcase /> Login as Vendor
                            </Link>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div >
    );
};

export default B2BUserLogin;
