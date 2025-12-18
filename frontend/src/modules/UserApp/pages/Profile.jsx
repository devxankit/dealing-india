import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiSave, FiCamera, FiArrowLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MobileLayout from "../components/Layout/MobileLayout";
import { useAuthStore } from '../../../shared/store/authStore';
import { isValidEmail, isValidPhone } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import PasswordStrengthMeter from '../components/Mobile/PasswordStrengthMeter';

const MobileProfile = () => {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState('personal');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerPersonal,
    handleSubmit: handleSubmitPersonal,
    formState: { errors: personalErrors },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm();

  const newPassword = watch('newPassword');

  const onPersonalSubmit = async (data) => {
    try {
      await updateProfile(data);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully!');
      resetPassword();
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    }
  };

  return (
    <ProtectedRoute>
      <PageTransition>
        <MobileLayout showBottomNav={true} showCartBar={true}>
          <div className="w-full pb-24">
            {/* Header */}
            <div className="px-4 py-4 bg-white border-b border-gray-200 sticky top-1 z-30">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiArrowLeft className="text-xl text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">My Profile</h1>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-gray-200 -mx-4 px-4">
                <button
                  onClick={() => setActiveTab('personal')}
                  className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'personal'
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-600 border-transparent'
                    }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'password'
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-600 border-transparent'
                    }`}
                >
                  Password
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
              {/* Personal Information Tab */}
              {activeTab === 'personal' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-4"
                >
                  {/* Avatar */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full gradient-green flex items-center justify-center text-white text-2xl font-bold">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white hover:bg-primary-700 transition-colors">
                        <FiCamera className="text-sm" />
                      </button>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Profile Picture</p>
                      <p className="text-xs text-gray-500">JPG, PNG or GIF. Max size 2MB</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitPersonal(onPersonalSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          {...registerPersonal('name', {
                            required: 'Name is required',
                            minLength: {
                              value: 2,
                              message: 'Name must be at least 2 characters',
                            },
                          })}
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${personalErrors.name
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-primary-500'
                            } focus:outline-none transition-colors text-base`}
                          placeholder="Your full name"
                        />
                      </div>
                      <AnimatePresence>
                        {personalErrors.name && (
                          <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1 text-sm text-red-600"
                          >
                            {personalErrors.name.message}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          {...registerPersonal('email', {
                            required: 'Email is required',
                            validate: (value) =>
                              isValidEmail(value) || 'Please enter a valid email',
                          })}
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${personalErrors.email
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-primary-500'
                            } focus:outline-none transition-colors text-base`}
                          placeholder="your.email@example.com"
                        />
                      </div>
                      <AnimatePresence>
                        {personalErrors.email && (
                          <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1 text-sm text-red-600"
                          >
                            {personalErrors.email.message}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <FiPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          {...registerPersonal('phone', {
                            validate: (value) =>
                              !value || isValidPhone(value) || 'Please enter a valid phone number',
                          })}
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${personalErrors.phone
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-primary-500'
                            } focus:outline-none transition-colors text-base`}
                          placeholder="1234567890"
                        />
                      </div>
                      <AnimatePresence>
                        {personalErrors.phone && (
                          <motion.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1 text-sm text-red-600"
                          >
                            {personalErrors.phone.message}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full gradient-green text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-glow-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiSave />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Change Password Tab */}
              {activeTab === 'password' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-4"
                >
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Change Password</h2>

                  <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          {...registerPassword('currentPassword', {
                            required: 'Current password is required',
                          })}
                          className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 ${passwordErrors.currentPassword
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-primary-500'
                            } focus:outline-none transition-colors text-base`}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordErrors.currentPassword.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          {...registerPassword('newPassword', {
                            required: 'New password is required',
                            minLength: {
                              value: 6,
                              message: 'Password must be at least 6 characters',
                            },
                          })}
                          className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 ${passwordErrors.newPassword
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-primary-500'
                            } focus:outline-none transition-colors text-base`}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {passwordErrors.newPassword && (
                        <motion.p
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="mt-1 text-sm text-red-600"
                        >
                          {passwordErrors.newPassword.message}
                        </motion.p>
                      )}
                      <PasswordStrengthMeter password={newPassword} />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...registerPassword('confirmPassword', {
                            required: 'Please confirm your password',
                            validate: (value) =>
                              value === newPassword || 'Passwords do not match',
                          })}
                          className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 ${passwordErrors.confirmPassword
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-primary-500'
                            } focus:outline-none transition-colors text-base`}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {passwordErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordErrors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full gradient-green text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-glow-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiSave />
                      {isLoading ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default MobileProfile;

