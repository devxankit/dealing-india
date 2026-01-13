import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiBriefcase } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useWholesalerAuthStore } from "../store/wholesalerAuthStore";
import toast from 'react-hot-toast';

const WholesalerLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setAuth, isAuthenticated, loading: storeLoading } = useWholesalerAuthStore();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/wholesaler/dashboard';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

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
            // Placeholder login logic - will be replaced with actual service call
            await new Promise(resolve => setTimeout(resolve, 1500));

            const mockWholesaler = {
                id: 'w123',
                name: 'Prime Wholesale Solutions',
                email: formData.email,
                storeName: 'Prime Wholesale'
            };
            const mockToken = 'wholesaler-token-xyz';

            setAuth(mockWholesaler, mockToken);
            toast.success('Wholesaler Login successful!');
            const from = location.state?.from?.pathname || '/wholesaler/dashboard';
            navigate(from, { replace: true });
        } catch (error) {
            toast.error('Invalid wholesaler credentials.');
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
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Wholesaler Login</h1>
                    <p className="text-gray-600">Access your B2B wholesaler portal</p>
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
                                placeholder="wholesaler@example.com"
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
                            to="/wholesaler/forgot-password"
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

                    <div className="text-center pt-4">
                        <p className="text-sm text-gray-600">
                            New Wholesaler?{' '}
                            <Link
                                to="/wholesaler/register"
                                className="text-primary-600 hover:text-primary-700 font-semibold"
                            >
                                Apply Now
                            </Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default WholesalerLogin;
