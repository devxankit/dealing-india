import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiBriefcase, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useB2BUserAuthStore } from '../store/b2bUserAuthStore';
import toast from 'react-hot-toast';

const B2BUserRegister = () => {
    const navigate = useNavigate();
    const { register } = useB2BUserAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        gstNumber: '',
        password: '',
        address: {
            city: '',
            state: '',
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await register(formData);
            if (result.success) {
                toast.success('Registration successful! Please verify your email.');
                navigate('/b2b/verification', { state: { email: formData.email } });
            } else {
                toast.error(result.message || 'Registration failed');
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 w-full max-w-2xl shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>

                <div className="text-center mb-10">
                    <Link to="/app" className="inline-flex items-center gap-2 text-primary-600 font-bold mb-6 hover:translate-x-[-4px] transition-transform">
                        <FiArrowLeft /> Back to Shopping
                    </Link>
                    <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-50">
                        <FiBriefcase className="text-primary-600 text-3xl" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">B2B Registration</h1>
                    <p className="text-gray-500 font-medium tracking-tight">Join as a Verified Business Buyer</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Info */}
                    <div className="md:col-span-2">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-4 px-1">Contact Information</h3>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                        <div className="relative group">
                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium"
                            />
                        </div>
                    </div>

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
                        <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                        <div className="relative group">
                            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="tel"
                                name="phone"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+91 9876543210"
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

                    {/* Business Info */}
                    <div className="md:col-span-2 pt-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-primary-600 mb-4 px-1">Business Details</h3>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Company / Store Name</label>
                        <div className="relative group">
                            <FiBriefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="companyName"
                                required
                                value={formData.companyName}
                                onChange={handleChange}
                                placeholder="ABC Enterprises"
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">GST Number (Optional)</label>
                        <div className="relative group">
                            <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="gstNumber"
                                value={formData.gstNumber}
                                onChange={handleChange}
                                placeholder="22AAAAA0000A1Z5"
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium uppercase"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">City</label>
                        <div className="relative group">
                            <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="address.city"
                                required
                                value={formData.address.city}
                                onChange={handleChange}
                                placeholder="Surat"
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-6">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating Account...' : 'Register as Business Buyer'}
                        </button>
                    </div>

                    <div className="md:col-span-2">
                        <p className="text-center text-gray-500 font-medium">
                            Already have a bulk account?{' '}
                            <Link to="/b2b/login" className="text-primary-600 font-bold hover:underline">
                                Sign In here
                            </Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BUserRegister;
