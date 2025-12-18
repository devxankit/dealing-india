import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiMail } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const VendorVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [codes, setCodes] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);
  
  const email = location.state?.email || 'your email';

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) return;
    
    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (pastedData.length === 4 && /^\d+$/.test(pastedData)) {
      const newCodes = pastedData.split('');
      setCodes(newCodes);
      inputRefs.current[3]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = codes.join('');
    
    if (verificationCode.length !== 4) {
      toast.error('Please enter the complete verification code');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Verification successful! Your account is pending admin approval.');
      navigate('/vendor/login');
    } catch (error) {
      toast.error('Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    toast.success('Verification code sent to your email');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 gradient-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-green">
            <FiMail className="text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            We've sent a verification code to <br />
            <span className="font-semibold text-gray-800">{email}</span>
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Code Inputs */}
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
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-16 h-16 text-center text-2xl font-bold bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800"
              />
            ))}
          </div>

          {/* Resend Code */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Didn't receive the code? Resend
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || codes.some(code => !code)}
            className="w-full gradient-green text-white py-3 rounded-xl font-semibold hover:shadow-glow-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              'Verifying...'
            ) : (
              <>
                <FiCheck />
                Verify Email
              </>
            )}
          </button>

          {/* Back to Login */}
          <div className="text-center pt-4">
            <Link
              to="/vendor/login"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              <FiArrowLeft />
              Back to Login
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default VendorVerification;

