import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiMail } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';

const B2BVendorVerification = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [codes, setCodes] = useState(['', '', '', '', '', '']); // 6 digit OTP
    const [isLoading, setIsLoading] = useState(false);
    const inputRefs = useRef([]);
    const { verifyEmail, resendOTP } = useB2BVendorAuthStore();

    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            toast.error('Session expired. Please register again.');
            navigate('/b2b-vendor/register');
        }
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [email, navigate]);

    const handleChange = (index, value) => {
        if (value.length > 1) return;
        const newCodes = [...codes];
        newCodes[index] = value;
        setCodes(newCodes);
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !codes[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otp = codes.join('');
        if (otp.length !== 6) {
            toast.error('Please enter the complete 6-digit code');
            return;
        }

        setIsLoading(true);
        try {
            const result = await verifyEmail(email, otp);
            if (result.success) {
                toast.success('Registration successful! Your account is now waiting for admin approval.', {
                    duration: 8000
                });
                navigate('/b2b-vendor/login', {
                    state: {
                        message: 'Registration successful! Your account is pending admin approval. You will be able to login once approved.',
                        email: email,
                        autoFill: true
                    }
                });
            } else {
                toast.error(result.message || 'Verification failed');
            }
        } catch (error) {
            toast.error(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            const result = await resendOTP(email);
            if (result.success) {
                toast.success('Verification code resent successfully');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to resend code');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl"
            >
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-50">
                        <FiMail className="text-primary-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Verify Access</h1>
                    <p className="text-sm text-gray-500 font-medium px-4">
                        Code sent to <br />
                        <span className="font-bold text-gray-800">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center gap-2">
                        {codes.map((code, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={code}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-10 h-12 text-center text-xl font-extrabold bg-gray-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-primary-500 focus:bg-white text-gray-800 transition-all shadow-sm"
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || codes.some(code => !code)}
                        className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold text-base hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Verifying...' : <><FiCheck className="text-lg" /> Complete Verification</>}
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleResend}
                            className="text-sm font-bold text-primary-600 hover:underline"
                        >
                            Didn't receive? Resend Code
                        </button>
                    </div>

                    <div className="text-center pt-4 border-t border-gray-100">
                        <Link to="/b2b-vendor/login" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
                            <FiArrowLeft /> Back to Login
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BVendorVerification;
