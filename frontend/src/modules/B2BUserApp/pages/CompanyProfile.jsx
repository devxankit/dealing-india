import React from 'react';
import { motion } from 'framer-motion';
import { FiBriefcase, FiMapPin, FiAward, FiEdit2 } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { useAuthStore } from '../../../shared/store/authStore';

const CompanyProfile = () => {
    const { user } = useAuthStore();
    const company = user?.businessInfo || {};

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Company Profile" showBack={true} />

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Company Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 border border-primary-100">
                                <FiBriefcase size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{company.companyName || 'Your Company Name'}</h2>
                                <p className="text-sm text-gray-500 font-medium">{company.gstNumber ? `GST: ${company.gstNumber}` : 'GST Not Verified'}</p>
                            </div>
                        </div>
                        <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors">
                            <FiEdit2 size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-2xl">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Company Type</p>
                            <p className="font-semibold text-gray-800">{company.companyType || 'Retailer'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Industry</p>
                            <p className="font-semibold text-gray-800">{company.industry || 'Fashion & Apparel'}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Contact & Address */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FiMapPin className="text-primary-500" />
                        Registered Address
                    </h3>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">Address Line 1</label>
                                <p className="text-gray-700 font-medium bg-gray-50 p-3 rounded-xl">
                                    {company.address?.line1 || 'No address added'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">City</label>
                                <p className="text-gray-700 font-medium bg-gray-50 p-3 rounded-xl">{company.address?.city || '---'}</p>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">State</label>
                                <p className="text-gray-700 font-medium bg-gray-50 p-3 rounded-xl">{company.address?.state || '---'}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Verification Status */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 border border-green-100 flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-500 shadow-sm">
                        <FiAward size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-green-800">Verified Business</h3>
                        <p className="text-xs text-green-600 font-medium">Your GST and business documents are verified.</p>
                    </div>
                </motion.div>

            </main>
            <B2BBottomNav />
        </div>
    );
};

export default CompanyProfile;
