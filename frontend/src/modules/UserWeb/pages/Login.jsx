import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiPhone } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../shared/store/authStore';
import { isValidEmail, isValidPhone } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import PageTransition from '../../../shared/components/PageTransition';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' or 'email'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data) => {
    try {
      // If using phone, combine country code with phone number
      const identifier = loginMethod === 'phone' 
        ? (data.countryCode ? `${data.countryCode}${data.phone}` : data.phone)
        : data.email;
      
      await login(identifier, data.password, rememberMe);
      toast.success('Login successful!');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Login failed. Please try again.');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-white w-full overflow-x-hidden">
        <main className="w-full overflow-x-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12">
            <div className="max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm"
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                  <p className="text-sm sm:text-base text-gray-600">Login to access your account</p>
                </div>

                {/* Login Method Toggle */}
                <div className="mb-6">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setLoginMethod('phone')}
                      className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                        loginMethod === 'phone'
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Phone Number
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('email')}
                      className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                        loginMethod === 'email'
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
                          className="w-24 px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none text-sm"
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
                            })}
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${
                              errors.phone
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-primary-500'
                            } focus:outline-none transition-colors`}
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
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${
                            errors.email
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-200 focus:border-primary-500'
                          } focus:outline-none transition-colors`}
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
                        className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 ${
                          errors.password
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-primary-500'
                        } focus:outline-none transition-colors`}
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
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Remember me</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Forget password?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3.5 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Logging in...' : 'Log In'}
                  </button>
                </form>

                {/* Social Login Section */}
                <div className="mt-6">
                  <div className="text-center mb-4">
                    <span className="text-sm text-gray-500">Or Sign In With</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-medium transition-all duration-300 hover:shadow-md"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="text-sm font-medium">Google</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-medium transition-all duration-300 hover:shadow-md"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span className="text-sm font-medium">Facebook</span>
                    </button>
                  </div>
                </div>

                {/* Sign Up Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm sm:text-base text-gray-600">
                    Don't have an account?{' '}
                    <Link
                      to="/register"
                      className="text-primary-600 hover:text-primary-700 font-semibold"
                    >
                      Sign Up
                    </Link>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Login;
