import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiCamera, FiSave } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../shared/store/authStore';
import { isValidEmail, isValidPhone } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const Profile = () => {
  const { user, updateProfile, changePassword, isLoading } = useAuthStore();
  const { responsivePadding } = useResponsiveHeaderPadding();
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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
          <Header />
          <Navbar />
          <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-2">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">My Profile</h1>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-6 py-3 font-semibold transition-colors ${
                      activeTab === 'personal'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Personal Information
                  </button>
                  <button
                    onClick={() => setActiveTab('password')}
                    className={`px-6 py-3 font-semibold transition-colors ${
                      activeTab === 'password'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 font-semibold transition-colors ${
                      activeTab === 'settings'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Settings
                  </button>
                </div>

                {/* Personal Information Tab */}
                {activeTab === 'personal' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-6 sm:p-8"
                  >
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Personal Information</h2>

                    {/* Avatar Upload */}
                    <div className="flex items-center gap-6 mb-8">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-green flex items-center justify-center text-white text-3xl font-bold">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white hover:bg-primary-700 transition-colors">
                          <FiCamera className="text-sm" />
                        </button>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Profile Picture</p>
                        <p className="text-sm text-gray-500">JPG, PNG or GIF. Max size 2MB</p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitPersonal(onPersonalSubmit)} className="space-y-5">
                      {/* Name */}
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
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${
                              personalErrors.name
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-green-500'
                            } focus:outline-none transition-colors`}
                            placeholder="Your full name"
                          />
                        </div>
                        {personalErrors.name && (
                          <p className="mt-1 text-sm text-red-600">
                            {personalErrors.name.message}
                          </p>
                        )}
                      </div>

                      {/* Email */}
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
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${
                              personalErrors.email
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-green-500'
                            } focus:outline-none transition-colors`}
                            placeholder="your.email@example.com"
                          />
                        </div>
                        {personalErrors.email && (
                          <p className="mt-1 text-sm text-red-600">
                            {personalErrors.email.message}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
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
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 ${
                              personalErrors.phone
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-green-500'
                            } focus:outline-none transition-colors`}
                            placeholder="1234567890"
                          />
                        </div>
                        {personalErrors.phone && (
                          <p className="mt-1 text-sm text-red-600">
                            {personalErrors.phone.message}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full sm:w-auto gradient-green text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-glow-green transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="glass-card rounded-2xl p-6 sm:p-8"
                  >
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h2>

                    <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-5">
                      {/* Current Password */}
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
                            className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 ${
                              passwordErrors.currentPassword
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-green-500'
                            } focus:outline-none transition-colors`}
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

                      {/* New Password */}
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
                            className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 ${
                              passwordErrors.newPassword
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-green-500'
                            } focus:outline-none transition-colors`}
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
                          <p className="mt-1 text-sm text-red-600">
                            {passwordErrors.newPassword.message}
                          </p>
                        )}
                      </div>

                      {/* Confirm New Password */}
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
                            className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 ${
                              passwordErrors.confirmPassword
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-gray-200 focus:border-green-500'
                            } focus:outline-none transition-colors`}
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
                        className="w-full sm:w-auto gradient-green text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-glow-green transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiSave />
                        {isLoading ? 'Changing Password...' : 'Change Password'}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-6 sm:p-8"
                  >
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h2>

                    <div className="space-y-6">
                      {/* Email Notifications */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">Email Notifications</h3>
                          <p className="text-sm text-gray-600">
                            Receive emails about your orders and promotions
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>

                      {/* SMS Notifications */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">SMS Notifications</h3>
                          <p className="text-sm text-gray-600">
                            Receive SMS updates about your orders
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>

                      {/* Marketing Emails */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">Marketing Emails</h3>
                          <p className="text-sm text-gray-600">
                            Receive emails about new products and special offers
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default Profile;

