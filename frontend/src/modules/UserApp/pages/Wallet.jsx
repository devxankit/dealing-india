import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiCreditCard, FiClock, FiPlus, FiArrowUpRight, FiArrowDownLeft, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import { useAuthStore } from '../../../shared/store/authStore';
import { getWallet, getWalletTransactions, initiateAddMoney, verifyAddMoney } from '../../../shared/services/walletService';
import { initializeRazorpayCheckout, handlePaymentSuccess } from '../../../shared/services/paymentService';
import toast from 'react-hot-toast';

const MobileWallet = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();
    const [activeTab, setActiveTab] = useState('transactions');
    const [loading, setLoading] = useState(true);
    const [walletBalance, setWalletBalance] = useState(0);
    const [totalCredit, setTotalCredit] = useState(0);
    const [totalDebit, setTotalDebit] = useState(0);
    const [transactions, setTransactions] = useState([]);

    // Add Money Modal State
    const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
    const [addMoneyAmount, setAddMoneyAmount] = useState('');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user?.id) {
            loadWalletData();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, user?.id]);

    const loadWalletData = async () => {
        try {
            setLoading(true);
            const [walletResponse, transactionsResponse] = await Promise.all([
                getWallet(),
                getWalletTransactions({ limit: 10 }),
            ]);

            const walletData = walletResponse.data || walletResponse;
            setWalletBalance(walletData.balance || 0);
            setTotalCredit(walletData.totalCredit || 0);
            setTotalDebit(walletData.totalDebit || 0);

            const transactionsData = transactionsResponse.data || transactionsResponse;
            setTransactions(transactionsData.transactions || []);
        } catch (error) {
            console.error('Error loading wallet data:', error);
            toast.error('Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const handleAddMoney = async () => {
        const amount = parseFloat(addMoneyAmount);

        if (!amount || amount < 1) {
            toast.error('Please enter a valid amount (minimum ₹1)');
            return;
        }

        if (amount > 50000) {
            toast.error('Maximum recharge amount is ₹50,000');
            return;
        }

        setIsProcessingPayment(true);

        try {
            // Step 1: Initiate add money - get Razorpay order
            const response = await initiateAddMoney(amount);
            const { orderId, keyId } = response.data || response;

            if (!orderId || !keyId) {
                throw new Error('Failed to create payment order');
            }

            // Step 2: Open Razorpay checkout
            await initializeRazorpayCheckout({
                key: keyId,
                amount: amount,
                currency: 'INR',
                name: 'Dealing India',
                description: 'Wallet Recharge',
                orderId: orderId,
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                    contact: user?.phone || '',
                },
                handler: async (paymentResponse) => {
                    try {
                        // Step 3: Verify payment and credit wallet
                        const paymentData = handlePaymentSuccess(paymentResponse);
                        const verifyResponse = await verifyAddMoney(paymentData);

                        const { newBalance } = verifyResponse.data || verifyResponse;

                        // Update local state
                        setWalletBalance(newBalance);
                        setShowAddMoneyModal(false);
                        setAddMoneyAmount('');

                        toast.success(`₹${amount} added to wallet successfully!`);

                        // Refresh wallet data
                        loadWalletData();
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        toast.error('Payment verification failed. Please contact support.');
                    } finally {
                        setIsProcessingPayment(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessingPayment(false);
                        toast.error('Payment cancelled');
                    },
                },
            });
        } catch (error) {
            console.error('Add money error:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to process payment');
            setIsProcessingPayment(false);
        }
    };

    const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

    return (
        <ProtectedRoute>
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
                            <h1 className="text-lg font-bold text-gray-900">Wallet & Payments</h1>
                        </div>

                        {loading ? (
                            <div className="p-4">
                                <div className="text-center py-12">
                                    <div className="text-6xl text-gray-300 mx-auto mb-4">💳</div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Loading wallet...</h3>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 space-y-6">
                                {/* Balance Card */}
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                    <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-black/10 rounded-full blur-xl" />

                                    <div className="relative z-10 text-center">
                                        <p className="text-white/80 text-sm font-medium mb-1">Total Balance</p>
                                        <h2 className="text-4xl font-bold mb-4">₹{walletBalance.toFixed(2)}</h2>

                                        <button
                                            onClick={() => setShowAddMoneyModal(true)}
                                            className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 mx-auto">
                                            <FiPlus /> Add Money
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Actions / Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                            <FiArrowDownLeft className="text-lg" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Total Credit</p>
                                            <p className="font-bold text-gray-900">₹{totalCredit.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                                            <FiArrowUpRight className="text-lg" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Total Spent</p>
                                            <p className="font-bold text-gray-900">₹{totalDebit.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transactions List */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-gray-900 text-lg">Transactions</h3>
                                        <button className="text-indigo-600 text-xs font-semibold">View All</button>
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                                        {transactions.length > 0 ? (
                                            <div className="divide-y divide-gray-50">
                                                {transactions.map((tx) => (
                                                    <div key={tx.id} className="p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                                {tx.type === 'credit' ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900 text-sm">{tx.description}</p>
                                                                <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-bold text-sm ${tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                                                                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 uppercase">{tx.status || 'completed'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-gray-500">
                                                <FiClock className="text-3xl mx-auto mb-2 text-gray-300" />
                                                <p>No transactions yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Add Money Modal */}
                        <AnimatePresence>
                            {showAddMoneyModal && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
                                    onClick={() => !isProcessingPayment && setShowAddMoneyModal(false)}
                                >
                                    <motion.div
                                        initial={{ y: '100%' }}
                                        animate={{ y: 0 }}
                                        exit={{ y: '100%' }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                        className="bg-white w-full rounded-t-3xl p-6 pb-safe"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Modal Header */}
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-bold text-gray-900">Add Money to Wallet</h2>
                                            <button
                                                onClick={() => !isProcessingPayment && setShowAddMoneyModal(false)}
                                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                                disabled={isProcessingPayment}
                                            >
                                                <FiX className="text-xl text-gray-600" />
                                            </button>
                                        </div>

                                        {/* Amount Input */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Enter Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">₹</span>
                                                <input
                                                    type="number"
                                                    value={addMoneyAmount}
                                                    onChange={(e) => setAddMoneyAmount(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-center"
                                                    disabled={isProcessingPayment}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 text-center">Min ₹1 • Max ₹50,000</p>
                                        </div>

                                        {/* Quick Amount Buttons */}
                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            {quickAmounts.map((amt) => (
                                                <button
                                                    key={amt}
                                                    onClick={() => setAddMoneyAmount(amt.toString())}
                                                    className={`py-3 rounded-xl font-semibold text-sm transition-all ${addMoneyAmount === amt.toString()
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    disabled={isProcessingPayment}
                                                >
                                                    ₹{amt}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Add Money Button */}
                                        <button
                                            onClick={handleAddMoney}
                                            disabled={isProcessingPayment || !addMoneyAmount}
                                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isProcessingPayment || !addMoneyAmount
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
                                                }`}
                                        >
                                            {isProcessingPayment ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Processing...
                                                </span>
                                            ) : (
                                                `Add ₹${addMoneyAmount || '0'}`
                                            )}
                                        </button>

                                        {/* Secure Payment Notice */}
                                        <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-1">
                                            <FiCreditCard className="text-gray-400" />
                                            Secured by Razorpay
                                        </p>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </MobileLayout>
            </PageTransition>
        </ProtectedRoute>
    );
};

export default MobileWallet;
