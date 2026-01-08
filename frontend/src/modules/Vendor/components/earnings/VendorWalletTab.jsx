import { useState, useEffect } from "react";
import {
    FiCreditCard,
    FiArrowUpRight,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiActivity,
    FiInfo
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useVendorWalletStore } from "../../store/vendorWalletStore";
import { formatPrice } from "../../../../shared/utils/helpers";
import Badge from "../../../../shared/components/Badge";
import WithdrawalConfirmDialog from "./WithdrawalConfirmDialog";
import { toast } from "react-hot-toast";

const VendorWalletTab = () => {
    const {
        wallet,
        withdrawals,
        transactions,
        isLoading,
        fetchWallet,
        fetchWithdrawals,
        fetchTransactions,
        requestWithdrawal
    } = useVendorWalletStore();

    const [activeSubTab, setActiveSubTab] = useState("withdrawals");
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    useEffect(() => {
        fetchWallet();
        fetchWithdrawals();
        fetchTransactions();
    }, [fetchWallet, fetchWithdrawals, fetchTransactions]);

    const handleWithdrawClick = () => {
        if (!wallet || wallet.balance <= 0) {
            toast.error("Insufficient balance for withdrawal");
            return;
        }
        setShowConfirmDialog(true);
    };

    const onConfirmWithdrawal = async (paymentDetails) => {
        const result = await requestWithdrawal(paymentDetails);
        if (result.success) {
            toast.success(result.message);
            setShowConfirmDialog(false);
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Wallet Balance Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4 opacity-80">
                            <FiCheckCircle size={20} />
                            <span className="text-sm font-medium uppercase tracking-wider">Available Balance (Withdrawable)</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            {formatPrice(wallet?.balance || 0)}
                        </h2>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={handleWithdrawClick}
                                disabled={!wallet || wallet.balance <= 0 || isLoading}
                                className={`flex items-center gap-2 bg-white text-indigo-700 px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 ${(!wallet || wallet.balance <= 0 || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50'
                                    }`}
                            >
                                <FiArrowUpRight size={20} />
                                Withdraw Full Balance
                            </button>
                        </div>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-purple-400 opacity-20 rounded-full blur-2xl"></div>
                </div>

                <div className="space-y-4">
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm relative group">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-amber-700 font-medium">Pending Balance</p>
                            <FiClock className="text-amber-500" />
                        </div>
                        <p className="text-2xl font-bold text-amber-800">{formatPrice(wallet?.pendingBalance || 0)}</p>
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600">
                            <FiInfo size={12} />
                            <span>Held for 7-day return period</span>
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 w-64 shadow-xl pointer-events-none">
                            Earnings from delivered orders are held here for 7 days. If no return is requested, they automatically move to your Available Balance.
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-500 mb-1">Total Withdrawn</p>
                        <p className="text-2xl font-bold text-gray-800">{formatPrice(wallet?.totalWithdrawn || 0)}</p>
                    </div>
                </div>
            </div>

            {/* History Sections */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveSubTab("withdrawals")}
                        className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${activeSubTab === "withdrawals" ? "text-purple-600" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Withdrawal Requests
                        {activeSubTab === "withdrawals" && <motion.div layoutId="subTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />}
                    </button>
                    <button
                        onClick={() => setActiveSubTab("transactions")}
                        className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${activeSubTab === "transactions" ? "text-purple-600" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Transaction History
                        {activeSubTab === "transactions" && <motion.div layoutId="subTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />}
                    </button>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {activeSubTab === "withdrawals" ? (
                            <motion.div
                                key="withdrawals"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                {withdrawals.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-gray-400 text-xs uppercase tracking-wider">
                                                    <th className="pb-4 font-medium">Request Date</th>
                                                    <th className="pb-4 font-medium">Amount</th>
                                                    <th className="pb-4 font-medium">Status</th>
                                                    <th className="pb-4 font-medium">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {withdrawals.map((req) => (
                                                    <tr key={req._id}>
                                                        <td className="py-4 text-sm text-gray-600">
                                                            {new Date(req.requestedAt).toLocaleDateString()}
                                                            <span className="text-xs text-gray-400 block">
                                                                {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 text-sm font-bold text-gray-800">
                                                            {formatPrice(req.amount)}
                                                        </td>
                                                        <td className="py-4">
                                                            <Badge variant={
                                                                req.status === 'approved' ? 'success' :
                                                                    req.status === 'pending' ? 'warning' : 'error'
                                                            }>
                                                                {req.status.toUpperCase()}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-4 text-sm text-gray-500">
                                                            {req.status === 'approved' && (
                                                                <div className="flex items-center gap-1">
                                                                    <FiInfo size={14} className="text-gray-400" />
                                                                    <span className="text-xs">Txn: {req.transactionId || req._id?.toString().slice(-8).toUpperCase() || 'N/A'}</span>
                                                                </div>
                                                            )}
                                                            {req.status === 'rejected' && (
                                                                <div className="flex items-center gap-1 text-red-500">
                                                                    <FiXCircle size={14} />
                                                                    <span className="text-xs">{req.rejectionReason || 'No reason provided'}</span>
                                                                </div>
                                                            )}
                                                            {req.status === 'pending' && <span className="text-xs italic">Processing...</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <FiClock className="text-4xl text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No withdrawal requests found</p>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="transactions"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                {transactions.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-gray-400 text-xs uppercase tracking-wider">
                                                    <th className="pb-4 font-medium">Transaction Date</th>
                                                    <th className="pb-4 font-medium">Description</th>
                                                    <th className="pb-4 font-medium">Type</th>
                                                    <th className="pb-4 font-medium text-right">Amount</th>
                                                    <th className="pb-4 font-medium text-right">Balance After</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {transactions.map((txn) => (
                                                    <tr key={txn._id}>
                                                        <td className="py-4 text-sm text-gray-600">
                                                            {new Date(txn.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-4">
                                                            <p className="text-sm font-medium text-gray-800">{txn.description}</p>
                                                            <p className="text-xs text-gray-400">{txn.referenceType.toUpperCase()}: {txn.referenceId || 'N/A'}</p>
                                                        </td>
                                                        <td className="py-4">
                                                            <span className={`text-xs font-bold uppercase ${txn.type === 'credit' ? 'text-green-600' :
                                                                txn.type === 'withdrawal' ? 'text-blue-600' : 'text-red-600'
                                                                }`}>
                                                                {txn.type}
                                                            </span>
                                                        </td>
                                                        <td className={`py-4 text-sm font-bold text-right ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {txn.type === 'credit' ? '+' : '-'}{formatPrice(txn.amount)}
                                                        </td>
                                                        <td className="py-4 text-sm font-semibold text-gray-800 text-right">
                                                            {formatPrice(txn.balanceAfter)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <FiActivity className="text-4xl text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No transaction logs found</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <AnimatePresence>
                {showConfirmDialog && (
                    <WithdrawalConfirmDialog
                        amount={wallet?.balance || 0}
                        onClose={() => setShowConfirmDialog(false)}
                        onConfirm={onConfirmWithdrawal}
                        isLoading={isLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default VendorWalletTab;
