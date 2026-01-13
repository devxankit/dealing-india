import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiMail } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const WholesalerVerification = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [codes, setCodes] = useState(['', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const inputRefs = useRef([]);

    const email = location.state?.email || 'your email';

    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (index, value) => {
        if (value.length > 1) return;
        const newCodes = [...codes];
        newCodes[index] = value;
        setCodes(newCodes);
        if (value && index < 3) {
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
        if (codes.join('').length !== 4) {
            toast.error('Please enter the complete code');
            return;
        }

        setIsLoading(true);
        try {
            // Mock verification
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success('Email verified successfully! Your account is now pending admin approval.');
            navigate('/wholesaler/login');
        } catch (error) {
            toast.error('Invalid verification code');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FiMail className="text-white text-2xl" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Verify Account</h1>
                    <p className="text-gray-600">
                        Verification code sent to <br />
                        <span className="font-semibold text-gray-800">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center gap-3">
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
                                className="w-16 h-16 text-center text-2xl font-bold bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500"
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || codes.some(c => !c)}
                        className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                        {isLoading ? 'Verifying...' : <><FiCheck /> Verify Code</>}
                    </button>

                    <div className="text-center">
                        <button type="button" className="text-sm text-primary-600 font-bold hover:underline" onClick={() => toast.success('New code sent!')}>
                            Resend Code
                        </button>
                    </div>

                    <div className="text-center pt-4">
                        <Link to="/wholesaler/login" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                            <FiArrowLeft /> Back to Login
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default WholesalerVerification;
