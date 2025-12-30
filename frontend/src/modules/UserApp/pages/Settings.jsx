import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiLock, FiBell, FiShield, FiFileText, FiInfo } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import PageTransition from '../../../shared/components/PageTransition';

const MobileSettings = () => {
    const navigate = useNavigate();

    const settingsGroups = [
        {
            title: "Account Security",
            items: [
                { icon: FiLock, label: "Change Password", path: "/app/change-password", description: "Update your login password" },
                { icon: FiShield, label: "Privacy Settings", path: "/app/privacy", description: "Manage your data & privacy" },
            ]
        },
        {
            title: "Preferences",
            items: [
                { icon: FiBell, label: "Notifications", path: "/app/notifications", description: "App & order updates" },
            ]
        },
        {
            title: "Legal & About",
            items: [
                { icon: FiFileText, label: "Terms of Service", path: "/app/terms", description: "Read our rules & policies" },
                { icon: FiInfo, label: "About Us", path: "/app/about", description: "Learn more about Dealing India" },
            ]
        }
    ];

    return (
        <PageTransition>
            <MobileLayout showBottomNav={false} showCartBar={false}>
                <div className="min-h-screen bg-gray-50 pb-safe">
                    {/* Header */}
                    <div className="bg-white sticky top-0 z-50 px-4 py-3 flex items-center gap-3 shadow-sm">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <FiChevronLeft className="text-xl text-gray-800" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
                    </div>

                    <div className="p-4 space-y-6">
                        {settingsGroups.map((group, groupIndex) => (
                            <motion.div
                                key={groupIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: groupIndex * 0.1 }}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm"
                            >
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{group.title}</h2>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {group.items.map((item, itemIndex) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={itemIndex}
                                                onClick={() => navigate(item.path)} // Note: These paths might also need to be created later or are placeholders
                                                className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 mr-4">
                                                    <Icon className="text-lg" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-semibold text-gray-900">{item.label}</h3>
                                                    <p className="text-xs text-gray-500">{item.description}</p>
                                                </div>
                                                <FiChevronLeft className="rotate-180 text-gray-300" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}

                        <div className="text-center py-8">
                            <p className="text-xs text-gray-400">App Version 1.0.0</p>
                            <p className="text-[10px] text-gray-300 mt-1">© 2024 Dealing India</p>
                        </div>
                    </div>
                </div>
            </MobileLayout>
        </PageTransition>
    );
};

export default MobileSettings;
