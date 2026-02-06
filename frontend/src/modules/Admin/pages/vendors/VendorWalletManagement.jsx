import { useState, useEffect } from "react";
import {
    FiDollarSign,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiSearch,
    FiFilter,
    FiExternalLink,
    FiMoreVertical,
    FiCheck,
    FiX
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminVendorWalletStore } from "../../store/adminVendorWalletStore";
import { formatPrice } from "../../../../shared/utils/helpers";
import Badge from "../../../../shared/components/Badge";
import { toast } from "react-hot-toast";

const AdminVendorWallet = () => {
    const {
        requests,
        wallets,
        stats,
        isLoading,
        fetchPendingRequests,
        fetchAllWallets,
        approveWithdrawal,
        rejectWithdrawal
    } = useAdminVendorWalletStore();

    const [filter, setFilter] = useState("");
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [adminNotes, setAdminNotes] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");

    useEffect(() => {
        fetchPendingRequests();
        fetchAllWallets();
    }, [fetchPendingRequests, fetchAllWallets]);

    const filteredRequests = requests.filter(req =>
        req.vendorId?.name?.toLowerCase().includes(filter.toLowerCase()) ||
        req.vendorId?.storeName?.toLowerCase().includes(filter.toLowerCase())
    );

    const handleApprove = (req) => {
        setSelectedRequest(req);
        setShowApproveModal(true);
        setAdminNotes("");
        setTransactionId("");
    };

    const handleReject = (req) => {
        setSelectedRequest(req);
        setShowRejectModal(true);
        setRejectionReason("");
    };

    const onConfirmApproval = async () => {
        const result = await approveWithdrawal(selectedRequest._id, adminNotes, transactionId);
        if (result.success) {
            toast.success(result.message);
            setShowApproveModal(false);
        } else {
            toast.error(result.message);
        }
    };

    const onConfirmRejection = async () => {
        if (!rejectionReason) {
            toast.error("Please provide a rejection reason");
            return;
        }
        const result = await rejectWithdrawal(selectedRequest._id, rejectionReason);
        if (result.success) {
            toast.success(result.message);
            setShowRejectModal(false);
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Vendor Wallet Management</h1>
                <p className="text-gray-500">Oversee vendor withdrawal requests and financial stats.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                            <FiDollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Withdrawn</p>
                            <p className="text-2xl font-bold text-gray-800">{formatPrice(stats.totalWithdrawn)}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                            <FiClock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending Requests</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.pendingCount}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <FiCheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Processed Today</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.processedToday}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
                    <h3 className="font-bold text-gray-800">Pending Withdrawals</h3>
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search vendor or store..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Vendor / Store</th>
                                <th className="px-6 py-4 font-medium">Request Date</th>
                                <th className="px-6 py-4 font-medium">Amount</th>
                                <th className="px-6 py-4 font-medium text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                                    <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                                    {req.vendorId?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{req.vendorId?.name}</p>
                                                    <p className="text-xs text-gray-500">{req.vendorId?.storeName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(req.requestedAt).toLocaleDateString()}
                                            <span className="text-xs text-gray-400 block">
                                                {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-base font-bold text-gray-800">{formatPrice(req.amount)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleApprove(req)}
                                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                    title="Approve"
                                                >
                                                    <FiCheck size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req)}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Reject"
                                                >
                                                    <FiX size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        {isLoading ? "Loading requests..." : "No pending withdrawal requests found."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Wallets Table */}
            <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
                    <h3 className="font-bold text-gray-800">Vendor Wallet Balances</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Vendor / Store</th>
                                <th className="px-6 py-4 font-medium">Balance (Withdrawable)</th>
                                <th className="px-6 py-4 font-medium">Pending (Returns)</th>
                                <th className="px-6 py-4 font-medium">Total Withdrawn</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {wallets && wallets.length > 0 ? (
                                wallets
                                    .filter(w =>
                                        w.vendorId?.name?.toLowerCase().includes(filter.toLowerCase()) ||
                                        w.vendorId?.storeName?.toLowerCase().includes(filter.toLowerCase())
                                    )
                                    .map((wallet) => (
                                        <tr key={wallet._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                        {wallet.vendorId?.name?.charAt(0) || 'V'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">{wallet.vendorId?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-500">{wallet.vendorId?.storeName || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-base font-bold text-green-600">{formatPrice(wallet.balance)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-base font-medium text-amber-600">{formatPrice(wallet.pendingBalance)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-base font-medium text-gray-600">{formatPrice(wallet.totalWithdrawn)}</span>
                                            </td>
                                        </tr>
                                    ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        {isLoading ? "Loading wallets..." : "No vendor wallets found."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Approve Modal */}
            <AnimatePresence>
                {showApproveModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-4">Approve Withdrawal</h3>
                            <p className="text-gray-500 mb-6 text-sm">
                                Confirm payment to <strong>{selectedRequest.vendorId?.name}</strong> for <strong>{formatPrice(selectedRequest.amount)}</strong>.
                            </p>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Transaction ID (Optional)</label>
                                    <input
                                        type="text"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        placeholder="Enter bank reference number"
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Internal Notes</label>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="e.g. Paid via NEFT"
                                        rows="3"
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={onConfirmApproval}
                                    disabled={isLoading}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    {isLoading ? "Processing..." : "Confirm & Approve"}
                                </button>
                                <button
                                    onClick={() => setShowApproveModal(false)}
                                    className="flex-1 py-3 text-gray-500 font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reject Modal */}
            <AnimatePresence>
                {showRejectModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-4 text-red-600">Reject Request</h3>
                            <p className="text-gray-500 mb-6 text-sm">
                                This will decline the withdrawal request for <strong>{selectedRequest.vendorId?.name}</strong>.
                            </p>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Rejection Reason</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="e.g. Bank details missing or incorrect"
                                    rows="4"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={onConfirmRejection}
                                    disabled={isLoading}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    {isLoading ? "Processing..." : "Confirm Rejection"}
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    className="flex-1 py-3 text-gray-500 font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminVendorWallet;
