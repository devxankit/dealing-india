import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiPackage, FiMessageCircle, FiTag, FiClock } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';

const Notifications = () => {
    // Mock notifications for now
    const [notifications] = useState([
        {
            id: 1,
            type: 'inquiry',
            title: 'New Quote received',
            message: 'You received a new quote for "Premium Silk Sarees" from Traditional Weavers.',
            time: '2 hours ago',
            read: false,
            icon: FiMessageCircle,
            color: 'text-blue-600 bg-blue-50'
        },
        {
            id: 2,
            type: 'order',
            title: 'Order Dispatched',
            message: 'Your bulk order #ORD-2024-889 has been dispatched via BlueDart.',
            time: 'Yesterday',
            read: true,
            icon: FiPackage,
            color: 'text-green-600 bg-green-50'
        },
        {
            id: 3,
            type: 'promo',
            title: 'Wholesale Festival Sale',
            message: 'Get up to 15% extra off on bulk orders above ₹50,000. Limited time offer!',
            time: '2 days ago',
            read: true,
            icon: FiTag,
            color: 'text-purple-600 bg-purple-50'
        }
    ]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Notifications" showBack={true} />

            <main className="max-w-2xl mx-auto px-4 py-2">
                <div className="space-y-3 mt-4">
                    {notifications.length > 0 ? (
                        notifications.map((notif, idx) => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`bg-white p-4 rounded-2xl border ${notif.read ? 'border-gray-100' : 'border-primary-100 shadow-sm'} flex gap-4`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.color}`}>
                                    <notif.icon size={20} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`text-sm font-bold ${notif.read ? 'text-gray-700' : 'text-gray-900'}`}>{notif.title}</h3>
                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
                                            <FiClock size={10} /> {notif.time}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">{notif.message}</p>
                                </div>
                                {!notif.read && (
                                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                                )}
                            </motion.div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                                <FiBell size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700">No notifications yet</h3>
                            <p className="text-sm text-gray-500 mt-2">We'll notify you about your orders and inquiries here.</p>
                        </div>
                    )}
                </div>
            </main>
            <B2BBottomNav />
        </div>
    );
};

export default Notifications;
