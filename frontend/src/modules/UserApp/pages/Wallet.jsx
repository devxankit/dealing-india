import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiCreditCard, FiClock, FiPlus, FiArrowUpRight, FiArrowDownLeft } from 'react-icons/fi';
import MobileLayout from "../components/Layout/MobileLayout";
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import { useAuthStore } from '../../../shared/store/authStore';
import { getWallet, getWalletTransactions } from '../../../shared/services/walletService';
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
                                            onClick={() => toast.info('Add money feature coming soon')}
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
                    </div>
                </MobileLayout>
            </PageTransition>
        </ProtectedRoute>
    );
};

export default MobileWallet;
