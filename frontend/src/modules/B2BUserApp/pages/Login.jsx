import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiBriefcase, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useB2BUserAuthStore } from '../store/b2bUserAuthStore';
import toast from 'react-hot-toast';

const B2BUserLogin = () => {
    const navigate = useNavigate();
    const { login } = useB2BUserAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                toast.success('Welcome back to Bulk Marketplace!');
                navigate('/b2b');
            } else {
                toast.error(result.message || 'Login failed');
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>

                <div className="text-center mb-10">
                    <Link to="/app" className="inline-flex items-center gap-2 text-primary-600 font-bold mb-6 hover:translate-x-[-4px] transition-transform">
                        <FiArrowLeft /> Back to Shopping
                    </Link>
                    <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-50">
                        <FiBriefcase className="text-primary-600 text-3xl" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">B2B Login</h1>
                    <p className="text-gray-500 font-medium tracking-tight">Access the Bulk Marketplace</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Business Email</label>
                        <div className="relative group">
                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@business.com"
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
                        <div className="relative group">
                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500"
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Link to="/b2b/forgot-password" title="Forgot Password" className="text-sm font-bold text-primary-600 hover:underline">
                            Rescue Access?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Verifying...' : 'Sign In as Buyer'}
                    </button>

                    <p className="text-center text-gray-500 font-medium">
                        Need bulk access?{' '}
                        <Link to="/b2b/register" className="text-primary-600 font-bold hover:underline">
                            Create B2B Account
                        </Link>
                    </p>
                    <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Wholesaler / Manufacturer?</span>
                        <Link to="/b2b-vendor/login" className="text-primary-600 font-bold hover:underline">
                            Go to B2B Vendor Portal
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BUserLogin;
