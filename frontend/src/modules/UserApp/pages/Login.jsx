import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiPhone } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../shared/store/authStore';
import { isValidEmail, isValidPhone } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import MobileLayout from '../components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';

const MobileLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' or 'email'
  const [localLoading, setLocalLoading] = useState(false);
  const timeoutRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const from = location.state?.from?.pathname || '/app';

  // Reset loading state on mount to prevent stuck loading state from persistence
  useEffect(() => {
    // Reset isLoading in store if it's stuck (can happen if persisted state had isLoading: true)
    const store = useAuthStore.getState();
    if (store.isLoading) {
      useAuthStore.setState({ isLoading: false });
    }
    // Also reset local loading state
    setLocalLoading(false);
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []); // Run only on mount

  // Safety mechanism: Reset loading state if it's stuck
  useEffect(() => {
    if (localLoading || isLoading) {
      timeoutRef.current = setTimeout(() => {
        setLocalLoading(false);
        toast.error('Request timeout. Please check your internet connection and try again.');
      }, 35000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isLoading, localLoading]);

  // Sync local loading with store loading
  useEffect(() => {
    if (!isLoading) {
      setLocalLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isLoading]);

  const onSubmit = async (data) => {
    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setLocalLoading(true);

      // If using phone, combine country code with phone number
      const identifier = loginMethod === 'phone'
        ? (data.countryCode ? `${data.countryCode}${data.phone}` : data.phone)
        : data.email;

      await login(identifier, data.password, rememberMe, 'b2c');

      setLocalLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      toast.success('Login successful!');
      navigate(from, { replace: true });
    } catch (error) {
      setLocalLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Show error toast with the message from store/interceptor
      toast.error(error.message || 'Login failed. Please try again.');
    }
  };

  const isButtonLoading = localLoading || isLoading;

  return (
    <PageTransition>
      <MobileLayout showBottomNav={false} showCartBar={false}>
        <div className="w-full min-h-screen flex items-start justify-center px-4 pt-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-sm text-gray-600">Login to access your account</p>
              </div>

              {/* Login Method Toggle */}
              <div className="mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('phone')}
                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${loginMethod === 'phone'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Phone Number
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${loginMethod === 'email'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Email
                  </button>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Phone or Email Input */}
                {loginMethod === 'phone' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        {...register('countryCode', { required: loginMethod === 'phone' })}
                        defaultValue="+91"
                        className="w-24 px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none text-sm bg-white text-gray-900"
                      >
                        <option value="+880">+880</option>
                        <option value="+1">+1</option>
                        <option value="+91">+91</option>
                        <option value="+44">+44</option>
                      </select>
                      <div className="relative flex-1">
                        <FiPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          {...register('phone', {
                            required: loginMethod === 'phone' ? 'Phone number is required' : false,
                            validate: (value) =>
                              !value || isValidPhone(value) || 'Please enter a valid phone number',
                            maxLength: {
                              value: 10,
                              message: 'Phone number must be 10 digits',
                            },
                          })}
                          onInput={(e) => {
                            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          }}
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 bg-white text-gray-900 ${errors.phone
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-primary-500'
                            } focus:outline-none transition-colors text-base`}
                          placeholder="1775472701"
                        />
                      </div>
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        {...register('email', {
                          required: loginMethod === 'email' ? 'Email is required' : false,
                          validate: (value) =>
                            !value || isValidEmail(value) || 'Please enter a valid email',
                        })}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 bg-white text-gray-900 ${errors.email
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-gray-200 focus:border-primary-500'
                          } focus:outline-none transition-colors text-base`}
                        placeholder="your.email@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters',
                        },
                      })}
                      className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 bg-white text-gray-900 ${errors.password
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-primary-500'
                        } focus:outline-none transition-colors text-base`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Remember me</span>
                  </label>
                  <Link
                    to="/app/forgot-password"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Forget password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isButtonLoading}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3.5 rounded-xl font-semibold text-base transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isButtonLoading ? 'Logging in...' : 'Log In'}
                </button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-6 text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link
                    to="/app/register"
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Sign Up
                  </Link>
                </p>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">Business User?</p>
                  <Link
                    to="/b2b/login"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-bold"
                  >
                    Switch to Bulk Marketplace
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </MobileLayout >
    </PageTransition >
  );
};

export default MobileLogin;
