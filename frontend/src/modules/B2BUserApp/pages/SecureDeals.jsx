import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShield, FiPackage, FiTruck, FiMapPin, FiClock, FiCheckCircle, FiAlertCircle, FiXCircle } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import toast from '../../../shared/utils/toast';

const SecureDeals = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDeals = async () => {
        try {
            const res = await api.get('/order-deals/buyer');
            if (res.success) {
                setDeals(res.data);
            }
        } catch (error) {
            console.error('Error fetching secure deals:', error);
            toast.error('Failed to load secure deals');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeals();
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending':
                return {
                    bg: 'bg-amber-50',
                    text: 'text-amber-600',
                    border: 'border-amber-100',
                    icon: FiClock
                };
            case 'accepted':
                return {
                    bg: 'bg-emerald-50',
                    text: 'text-emerald-600',
                    border: 'border-emerald-100',
                    icon: FiCheckCircle
                };
            case 'rejected':
                return {
                    bg: 'bg-red-50',
                    text: 'text-red-600',
                    border: 'border-red-100',
                    icon: FiXCircle
                };
            default:
                return {
                    bg: 'bg-gray-50',
                    text: 'text-gray-600',
                    border: 'border-gray-100',
                    icon: FiAlertCircle
                };
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="My Secure Deals" />

            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="bg-primary-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-primary-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Secure Deals</h2>
                            <p className="text-primary-100 font-medium text-sm leading-relaxed opacity-90">
                                Tracking your trusted B2B transactions with platform escrow protection and verified settlement.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center p-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-600"></div>
                        </div>
                    ) : deals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <FiShield size={40} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">No Secure Deals Yet</h3>
                            <p className="text-gray-400 max-w-sm mt-2 font-medium">Start a secure deal from any vendor's product page to ensure safe transactions.</p>
                        </div>
                    ) : (
                        deals.map((deal) => {
                            const style = getStatusStyle(deal.status);
                            const StatusIcon = style.icon;

                            return (
                                <motion.div
                                    key={deal._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                                >
                                    <div className="flex flex-col gap-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                                                    <FiPackage size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-gray-800 tracking-tight leading-tight">{deal.productName}</h3>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                                                        Seller: {deal.sellerId?.storeName || deal.sellerId?.name || 'Unknown Seller'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full ${style.bg} ${style.text} ${style.border} border text-[10px] font-black uppercase tracking-widest flex items-center gap-2`}>
                                                <StatusIcon size={12} />
                                                {deal.status}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Quantity</p>
                                                <p className="text-sm font-black text-gray-800">{deal.quantity.toLocaleString()} Units</p>
                                            </div>
                                            <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                                                <p className="text-[8px] font-black text-primary-400 uppercase tracking-widest mb-1">Total Amount</p>
                                                <p className="text-sm font-black text-primary-600">₹{deal.totalAmount.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 pt-2">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                <FiTruck className="text-gray-400" /> {deal.transport}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                <FiMapPin className="text-gray-400" /> {deal.station}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                <FiClock className="text-gray-400" /> {new Date(deal.createdAt).toLocaleDateString('en-GB')}
                                            </div>
                                        </div>

                                        {deal.status === 'accepted' && (
                                            <div className="mt-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                                                <FiCheckCircle className="text-emerald-500 mt-1 flex-shrink-0" />
                                                <p className="text-[10px] font-bold text-emerald-700 leading-relaxed uppercase tracking-wider">
                                                    Seller has accepted your request. Please proceed with the payment as discussed or wait for further instructions via notifications.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default SecureDeals;
