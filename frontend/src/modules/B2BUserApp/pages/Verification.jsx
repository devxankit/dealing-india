import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiMail } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../shared/store/authStore';

const B2BUserVerification = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [codes, setCodes] = useState(['', '', '', '', '', '']); // 6 digit OTP
    const [isLoading, setIsLoading] = useState(false);
    const inputRefs = useRef([]);
    const { verifyEmail, resendOTP } = useAuthStore();

    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            toast.error('Session expired. Please register again.');
            navigate('/b2b/register');
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

    const handlePaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').trim().slice(0, 6);
        if (!/^\d+$/.test(pasteData)) return;

        const newCodes = [...codes];
        pasteData.split('').forEach((char, index) => {
            if (index < 6) newCodes[index] = char;
        });
        setCodes(newCodes);

        // Focus the last filled input or the next one
        const focusIndex = Math.min(pasteData.length, 5);
        inputRefs.current[focusIndex]?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otp = codes.join('');
        if (otp.length !== 6) return;

        setIsLoading(true);
        try {
            const result = await verifyEmail(email, otp);
            if (result.success) {
                toast.success('Email verified successfully! Welcome to the B2B Network.');
                navigate('/b2b/catalog');
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
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-primary-600"></div>

                <button
                    onClick={() => navigate('/b2b/register')}
                    className="absolute top-4 left-4 p-2 text-gray-400 hover:text-primary-600 transition-colors z-10"
                    title="Go Back"
                >
                    <FiArrowLeft size={22} />
                </button>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-50">
                        <FiMail className="text-primary-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Verify Access</h1>
                    <p className="text-sm text-gray-500 font-medium">
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
                                onPaste={handlePaste}
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
                            className="text-xs font-bold text-primary-600 hover:underline"
                        >
                            Didn't receive? Resend Code
                        </button>
                    </div>

                    <div className="text-center pt-3 border-t border-gray-100">
                        <Link to="/b2b/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors">
                            <FiArrowLeft /> Back to Login
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BUserVerification;
