import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiKey, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useVendorAuthStore } from "../store/vendorAuthStore";
import toast from 'react-hot-toast';

const VendorForgotPassword = () => {
    const navigate = useNavigate();
    const { forgotPassword, resetPassword, isLoading } = useVendorAuthStore();

    const [step, setStep] = useState(1); // 1 = enter email, 2 = enter OTP + new password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    // Step 1: Request OTP
    const handleRequestOTP = async (e) => {
        e.preventDefault();

        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        try {
            await forgotPassword(email);
            setOtpSent(true);
            setStep(2);
            toast.success('OTP sent to your email address');
        } catch (error) {
            toast.error(error.message || 'Failed to send OTP. Please try again.');
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        try {
            await forgotPassword(email);
            toast.success('OTP resent to your email address');
        } catch (error) {
            toast.error(error.message || 'Failed to resend OTP. Please try again.');
        }
    };

    // Step 2: Reset Password with OTP
    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!otp || otp.length !== 4) {
            toast.error('Please enter the 4-digit OTP');
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        try {
            await resetPassword(email, otp, newPassword);
            toast.success('Password reset successfully! Please login with your new password.');
            navigate('/vendor/login');
        } catch (error) {
            toast.error(error.message || 'Failed to reset password. Please check your OTP and try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
                {/* Back Button */}
                <Link
                    to="/vendor/login"
                    className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                >
                    <FiArrowLeft className="mr-2" />
                    Back to Login
                </Link>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 gradient-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-green">
                        <FiKey className="text-white text-2xl" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
                        {step === 1 ? 'Forgot Password' : 'Reset Password'}
                    </h1>
                    <p className="text-gray-600">
                        {step === 1
                            ? 'Enter your email to receive a password reset OTP'
                            : 'Enter the OTP and your new password'}
                    </p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center mb-8">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                        {step > 1 ? <FiCheck /> : '1'}
                    </div>
                    <div className={`w-16 h-1 mx-2 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                        2
                    </div>
                </div>

                {/* Step 1: Enter Email */}
                {step === 1 && (
                    <form onSubmit={handleRequestOTP} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="vendor@example.com"
                                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full gradient-green text-white py-3 rounded-xl font-semibold hover:shadow-glow-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {/* Step 2: Enter OTP + New Password */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        {/* Email Display */}
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center">
                            <FiMail className="text-gray-400 mr-3" />
                            <div>
                                <p className="text-xs text-gray-500">OTP sent to</p>
                                <p className="text-sm font-medium text-gray-800">{email}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="ml-auto text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Change
                            </button>
                        </div>

                        {/* OTP Field */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Enter 4-Digit OTP
                            </label>
                            <div className="relative">
                                <FiKey className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setOtp(value);
                                    }}
                                    placeholder="Enter 4-digit OTP"
                                    maxLength={4}
                                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400 tracking-widest text-center font-bold text-lg"
                                    required
                                />
                            </div>
                            <div className="mt-2 text-right">
                                <button
                                    type="button"
                                    onClick={handleResendOTP}
                                    disabled={isLoading}
                                    className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                                >
                                    Resend OTP
                                </button>
                            </div>
                        </div>

                        {/* New Password Field */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimum 6 characters"
                                    className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
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

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        {/* Password Match Indicator */}
                        {confirmPassword && (
                            <div className={`flex items-center text-sm ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'
                                }`}>
                                {newPassword === confirmPassword ? (
                                    <>
                                        <FiCheck className="mr-1" />
                                        Passwords match
                                    </>
                                ) : (
                                    'Passwords do not match'
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !otp || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            className="w-full gradient-green text-white py-3 rounded-xl font-semibold hover:shadow-glow-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Resetting Password...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                {/* Help Text */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        Remember your password?{' '}
                        <Link to="/vendor/login" className="text-primary-600 hover:text-primary-700 font-medium">
                            Login here
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default VendorForgotPassword;
