import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import MobileLayout from "../components/Layout/MobileLayout";
import PageTransition from '../../../shared/components/PageTransition';
import toast from 'react-hot-toast';

const MobileChangePassword = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        // Simulate API call
        toast.success("Password updated successfully");
        navigate(-1);
    };

    return (
        <PageTransition>
            <MobileLayout showBottomNav={false} showCartBar={false}>
                <div className="min-h-screen bg-gray-50">
                    {/* Header */}
                    <div className="bg-white sticky top-0 z-50 px-4 py-3 flex items-center gap-3 shadow-sm">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <FiChevronLeft className="text-xl text-gray-800" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-900">Change Password</h1>
                    </div>

                    <div className="p-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                <FiLock className="text-xl" />
                            </div>
                            <p className="text-center text-gray-500 text-sm mb-6">
                                Your new password must be different from previous used passwords.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Current Password */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.current ? "text" : "password"}
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleChange}
                                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 text-sm"
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword.current ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.new ? "text" : "password"}
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleChange}
                                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 text-sm"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword.new ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.confirm ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 text-sm"
                                            placeholder="Confirm new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword.confirm ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold shadow-md shadow-gray-200 mt-2"
                                >
                                    Update Password
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </MobileLayout>
        </PageTransition>
    );
};

export default MobileChangePassword;
