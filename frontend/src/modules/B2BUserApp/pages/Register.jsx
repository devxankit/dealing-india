import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiBriefcase, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../shared/store/authStore';
import toast from 'react-hot-toast';

const B2BUserRegister = () => {
    const navigate = useNavigate();
    const { register } = useAuthStore();
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
            fullAddress: '',
            pincode: '',
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
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                businessInfo: {
                    companyName: formData.companyName,
                    gstNumber: formData.gstNumber,
                    address: {
                        fullAddress: formData.address.fullAddress,
                        pincode: formData.address.pincode,
                        city: formData.address.city,
                        state: formData.address.state
                    }
                },
                userType: 'b2b'
            };

            const result = await register(
                payload.name,
                payload.email,
                payload.password,
                payload.phone,
                payload.userType,
                payload.businessInfo
            );

            // Note: Currently the register action in authStore doesn't handle businessInfo.
            // I should update the authStore's register action to accept an optional data object or handle additional fields.
            // But for now, I'll update the store's register action to be more flexible.

            if (result.success) {
                toast.success('Registration successful! Please verify your email.');
                navigate('/b2b/verification', { state: { email: formData.email } });
            } else {
                toast.error(result.message || 'Registration failed');
            }
        } catch (error) {
            toast.error(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-primary-600"></div>

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 text-gray-400 hover:text-primary-600 transition-colors z-10"
                    title="Go Back"
                >
                    <FiArrowLeft size={22} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-50">
                        <FiBriefcase className="text-primary-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">B2B Registration</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Join as a Verified Business Buyer</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personal Info */}
                    <div className="md:col-span-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-2 px-1">Contact Information</h3>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Full Name</label>
                        <div className="relative group">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Business Email</label>
                        <div className="relative group">
                            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@business.com"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Phone Number</label>
                        <div className="relative group">
                            <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="tel"
                                name="phone"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+91 9876543210"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
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
                                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500"
                            >
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Business Info */}
                    <div className="md:col-span-2 pt-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-2 px-1">Business Details</h3>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Company / Store Name</label>
                        <div className="relative group">
                            <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                placeholder="ABC Enterprises (Optional)"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">GST (Optional)</label>
                        <div className="relative group">
                            <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="gstNumber"
                                value={formData.gstNumber}
                                onChange={handleChange}
                                placeholder="22AAAAA0000A1Z5"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium uppercase text-sm"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Full Address</label>
                        <div className="relative group">
                            <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="address.fullAddress"
                                required
                                value={formData.address.fullAddress}
                                onChange={handleChange}
                                placeholder="Shop No. 123, Main Market Road"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">City</label>
                        <div className="relative group">
                            <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="address.city"
                                required
                                value={formData.address.city}
                                onChange={handleChange}
                                placeholder="Surat"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 ml-1">Pincode</label>
                        <div className="relative group">
                            <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                name="address.pincode"
                                required
                                maxLength={6}
                                value={formData.address.pincode}
                                onChange={handleChange}
                                placeholder="395006"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white transition-all font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold text-base hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating Account...' : 'Register as Business Buyer'}
                        </button>
                    </div>

                    <div className="md:col-span-2 pt-3 border-t border-gray-100 flex flex-col items-center gap-2">
                        <Link to="/app/login" className="text-xs text-gray-500 font-medium hover:text-primary-600 transition-colors">
                            Back to Retail Marketplace
                        </Link>
                        <p className="text-center text-xs text-gray-500 font-medium">
                            Already have an account?{' '}
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
