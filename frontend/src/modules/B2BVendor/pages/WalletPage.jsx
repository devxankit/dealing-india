import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiCreditCard, 
    FiArrowUpRight, 
    FiArrowDownLeft, 
    FiClock, 
    FiPlus, 
    FiInfo,
    FiRefreshCcw,
    FiCheckCircle,
    FiXCircle,
    FiLayers,
    FiGift
} from 'react-icons/fi';
import { getMyWallet, initiateRecharge, verifyRecharge } from '../services/vendorWalletService';
import toast from 'react-hot-toast';

const WalletPage = () => {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [processing, setProcessing] = useState(false);

    const fetchWallet = async () => {
        try {
            const data = await getMyWallet();
            setWallet(data);
        } catch (error) {
            toast.error('Failed to load wallet');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    const handleRecharge = async (e) => {
        e.preventDefault();
        const baseAmount = parseFloat(rechargeAmount);
        if (!baseAmount || baseAmount < 100) {
            return toast.error('Minimum recharge amount is ₹100');
        }

        const totalPayable = Math.round(baseAmount * 1.18 * 100) / 100;

        setProcessing(true);
        try {
            const order = await initiateRecharge(totalPayable);
            
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: 'INR',
                name: 'Dealing India',
                description: 'Wallet Recharge',
                order_id: order.id,
                handler: async (response) => {
                    try {
                        await verifyRecharge({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: totalPayable
                        });
                        toast.success('Wallet recharged successfully!');
                        setRechargeModalOpen(false);
                        setRechargeAmount('');
                        fetchWallet();
                    } catch (error) {
                        toast.error(error.message || 'Verification failed');
                    }
                },
                modal: {
                    ondismiss: () => setProcessing(false)
                },
                prefill: {
                    name: '',
                    email: '',
                },
                theme: { color: '#4F46E5' }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            toast.error(error.message || 'Failed to initiate payment');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const getTransactionIcon = (type, referenceType) => {
        if (type === 'credit') {
            if (referenceType === 'referral_reward') return <FiGift className="text-pink-500" />;
            return <FiArrowUpRight className="text-green-500" />;
        }
        if (referenceType === 'addon_plan') return <FiLayers className="text-indigo-500" />;
        return <FiArrowDownLeft className="text-red-500" />;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
                    <p className="text-gray-500 text-sm">Manage your funds and rewards in one place</p>
                </div>
                <button
                    onClick={() => setRechargeModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-semibold shadow-md shadow-primary-200"
                >
                    <FiPlus /> Recharge Wallet
                </button>
            </div>

            {/* Wallet Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl"
                >
                    <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                        <div>
                            <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Available Balance</span>
                            <div className="text-5xl font-black mt-2 tracking-tight">
                                ₹{wallet?.balance?.toLocaleString('en-IN') || 0}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px]">VISA</div>
                                <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-900 flex items-center justify-center text-[10px]">MC</div>
                            </div>
                            <span className="text-xs text-slate-500">Secure Payments via Razorpay</span>
                        </div>
                    </div>
                    {/* Decorative Circles */}
                    <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary-600/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-50 rounded-lg">
                                <FiGift className="text-pink-600 text-xl" />
                            </div>
                            <h3 className="font-bold text-gray-800">Referral Rewards</h3>
                        </div>
                        <p className="text-sm text-gray-500">Earn ₹50 for every verified vendor you refer to India's fastest growing B2B marketplace.</p>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/b2b-vendor/referral'}
                        className="mt-6 w-full py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                    >
                        Learn More
                    </button>
                </motion.div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Transaction History</h3>
                    <button 
                        onClick={fetchWallet}
                        className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                    >
                        <FiRefreshCcw />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest">
                                <th className="px-6 py-4">Transaction Details</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {wallet?.transactions?.length > 0 ? (
                                wallet.transactions.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl bg-gray-50 group-hover:bg-white transition-colors`}>
                                                    {getTransactionIcon(tx.type, tx.referenceType)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 capitalize leading-none mb-1">
                                                        {tx.description || tx.referenceType?.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-mono">ID: {tx.referenceId || '--'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-black ${tx.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                                                {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount?.toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <FiClock className="text-2xl opacity-20" />
                                            <p className="text-sm">No transactions yet</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recharge Modal */}
            <AnimatePresence>
                {rechargeModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !processing && setRechargeModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Add Money</h2>
                                        <p className="text-gray-500 text-sm mt-1">Recharge your wallet to enjoy platform services</p>
                                    </div>
                                    {!processing && (
                                        <button onClick={() => setRechargeModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                            <FiXCircle className="text-gray-400 text-xl" />
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleRecharge} className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Amount (₹)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">₹</span>
                                            <input 
                                                autoFocus
                                                type="number"
                                                required
                                                min="100"
                                                value={rechargeAmount}
                                                onChange={(e) => setRechargeAmount(e.target.value)}
                                                placeholder="Enter amount (Min ₹100)"
                                                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-primary-500 focus:bg-white rounded-2xl py-4 pl-10 pr-4 text-2xl font-black outline-none transition-all placeholder:text-gray-200"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {[500, 1000, 2000, 5000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setRechargeAmount(amt.toString())}
                                                    className="px-4 py-1.5 rounded-full border border-gray-100 text-xs font-semibold text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-all hover:bg-primary-50"
                                                >
                                                    +₹{amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {rechargeAmount >= 100 && (
                                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Recharge Amount</span>
                                                <span className="font-bold">₹{parseFloat(rechargeAmount).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>GST (18%)</span>
                                                <span className="font-bold">+ ₹{(Math.round(rechargeAmount * 0.18 * 100) / 100).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="pt-2 border-t border-gray-200 flex justify-between text-lg font-black text-primary-600">
                                                <span>Total Payable</span>
                                                <span>₹{(Math.round(rechargeAmount * 1.18 * 100) / 100).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-indigo-50/50 p-4 rounded-2xl flex gap-3 items-start">
                                        <FiInfo className="text-primary-600 mt-1 flex-shrink-0" />
                                        <p className="text-[10px] text-indigo-700 leading-relaxed font-medium">
                                            The recharge amount will be added to your spendable balance. GST is charged as per government regulations and an official invoice will be emailed to you.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className={`w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-3 ${processing ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {processing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>Proceed to Payment</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WalletPage;
