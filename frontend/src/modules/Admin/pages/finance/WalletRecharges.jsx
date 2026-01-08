import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiArrowLeft,
    FiSearch,
    FiDownload,
    FiCalendar,
    FiCreditCard,
    FiTrendingUp,
    FiDollarSign,
    FiUsers,
    FiCheckCircle,
    FiXCircle,
    FiRefreshCw,
} from "react-icons/fi";
import { formatPrice } from "../../../../shared/utils/helpers";
import Badge from "../../../../shared/components/Badge";
import { getWalletAnalytics, getWalletTransactions } from "../../services/walletAdminService";
import toast from "react-hot-toast";

const WalletRecharges = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

    // Filters
    const [search, setSearch] = useState("");
    const [dateRange, setDateRange] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const dateParams = getDateParams();

            const [analyticsRes, transactionsRes] = await Promise.all([
                getWalletAnalytics(dateParams),
                getWalletTransactions({ ...dateParams, page: 1, limit: 20, search }),
            ]);

            setAnalytics(analyticsRes.data);
            setTransactions(transactionsRes.data.transactions || []);
            setPagination(transactionsRes.data.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (error) {
            console.error("Error loading wallet data:", error);
            toast.error("Failed to load wallet analytics");
        } finally {
            setLoading(false);
        }
    };

    const getDateParams = () => {
        const params = {};
        const now = new Date();

        if (dateRange === "today") {
            params.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            params.endDate = new Date().toISOString();
        } else if (dateRange === "week") {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            params.startDate = weekAgo.toISOString();
            params.endDate = new Date().toISOString();
        } else if (dateRange === "month") {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            params.startDate = monthAgo.toISOString();
            params.endDate = new Date().toISOString();
        } else if (dateRange === "custom" && startDate && endDate) {
            params.startDate = new Date(startDate).toISOString();
            params.endDate = new Date(endDate).toISOString();
        }

        return params;
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            const dateParams = getDateParams();
            const res = await getWalletTransactions({ ...dateParams, page: 1, limit: 20, search });
            setTransactions(res.data.transactions || []);
            setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (error) {
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = async (newPage) => {
        setLoading(true);
        try {
            const dateParams = getDateParams();
            const res = await getWalletTransactions({ ...dateParams, page: newPage, limit: 20, search });
            setTransactions(res.data.transactions || []);
            setPagination(res.data.pagination || { page: newPage, totalPages: 1, total: 0 });
        } catch (error) {
            toast.error("Failed to load page");
        } finally {
            setLoading(false);
        }
    };

    const handleDateRangeChange = (range) => {
        setDateRange(range);
        if (range !== "custom") {
            setTimeout(loadData, 100);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const exportCSV = () => {
        if (transactions.length === 0) {
            toast.error("No data to export");
            return;
        }

        const headers = ["Date", "User", "Email", "Phone", "Amount", "Status"];
        const rows = transactions.map((t) => [
            formatDate(t.createdAt),
            t.userName,
            t.userEmail || "-",
            t.userPhone || "-",
            t.amount,
            t.status,
        ]);

        const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `wallet_recharges_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        toast.success("CSV exported successfully");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <FiArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Wallet Recharges</h1>
                            <p className="text-sm text-gray-500">User wallet top-up analytics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadData}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <FiRefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <FiDownload className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                <FiCreditCard className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Recharges</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? "-" : analytics?.total?.count || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <FiDollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Amount</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? "-" : formatPrice(analytics?.total?.amount || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <FiTrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Today</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? "-" : analytics?.today?.count || 0}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {formatPrice(analytics?.today?.amount || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                                <FiUsers className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Avg Amount</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? "-" : formatPrice(analytics?.total?.avgAmount || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                                    placeholder="Search by user name, email, phone..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="flex items-center gap-2">
                            <FiCalendar className="text-gray-400" />
                            <select
                                value={dateRange}
                                onChange={(e) => handleDateRangeChange(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        {/* Custom Date Inputs */}
                        {dateRange === "custom" && (
                            <>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border border-gray-200 rounded-lg px-3 py-2"
                                />
                                <span className="text-gray-400">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border border-gray-200 rounded-lg px-3 py-2"
                                />
                                <button
                                    onClick={loadData}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Apply
                                </button>
                            </>
                        )}

                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                        >
                            Search
                        </button>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                        User
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Contact
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                                            No recharges found
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {formatDate(tx.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">{tx.userName}</p>
                                                <p className="text-xs text-gray-500">{tx.userEmail}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {tx.userPhone || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-bold text-green-600">
                                                    +{formatPrice(tx.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge
                                                    variant={tx.status === "completed" ? "success" : "warning"}
                                                >
                                                    {tx.status === "completed" ? (
                                                        <FiCheckCircle className="inline mr-1" />
                                                    ) : (
                                                        <FiXCircle className="inline mr-1" />
                                                    )}
                                                    {tx.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="px-3 py-1 border rounded-lg disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="px-3 py-1 border rounded-lg disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletRecharges;
