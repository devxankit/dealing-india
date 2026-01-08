import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiDownload, FiUser, FiCheckCircle, FiClock, FiX, FiPhone, FiMail, FiCalendar, FiHash, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const MegaRewardEntries = () => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState({ total: 0, active: 0, winners: 0 });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

    useEffect(() => {
        fetchEntries();
        fetchStats();
    }, [pagination.page]);

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/admin/mega-reward/entries?page=${pagination.page}&limit=${pagination.limit}&search=${searchTerm}`);
            if (response.success) {
                setEntries(response.data.entries || []);
                setPagination(prev => ({ ...prev, ...response.data.pagination }));
            }
        } catch (error) {
            console.error('Failed to fetch entries:', error);
            toast.error('Failed to load entries');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/mega-reward/entries/stats');
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchEntries();
    };

    const handleOpenDetails = async (entry) => {
        setSelectedEntry(entry);
        setIsModalOpen(true);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mega Reward Entries</h1>
                    <p className="text-gray-500 mt-1">Manage and track all participants in the current lucky draw.</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex gap-2 text-sm">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold">Total: {stats.total}</span>
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg font-bold">Active: {stats.active}</span>
                        <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg font-bold">Winners: {stats.winners}</span>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <form onSubmit={handleSearch} className="relative flex-1 w-full">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email or ticket ID..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={fetchEntries}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all text-sm font-semibold"
                    >
                        {loading ? <FiLoader className="animate-spin" /> : <FiSearch />} Search
                    </button>
                </div>
            </div>

            {/* Entries Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Joined</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <FiLoader className="animate-spin text-3xl text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-400">Loading entries...</p>
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FiSearch className="text-2xl text-gray-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">No entries found</h3>
                                        <p className="text-gray-500">No verified participants yet for this campaign.</p>
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                    <FiUser />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{entry.userId?.name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500">{entry.userId?.email || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                                                {entry.ticketId}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDate(entry.generatedAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {entry.status === 'winner' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                                    🏆 Winner
                                                </span>
                                            ) : entry.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                                    <FiCheckCircle /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-100">
                                                    {entry.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleOpenDetails(entry)}
                                                className="text-sm font-bold text-blue-600 hover:underline"
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex justify-center gap-2">
                        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setPagination(prev => ({ ...prev, page }))}
                                className={`px-3 py-1 rounded-lg text-sm font-bold ${pagination.page === page ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Entry Details Modal */}
            <AnimatePresence>
                {isModalOpen && selectedEntry && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight ml-2">Entry Details</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    <FiX className="text-lg text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-6">
                                {/* User Info */}
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center text-xl font-bold shrink-0">
                                        {selectedEntry.userId?.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-black text-gray-900 tracking-tight truncate">{selectedEntry.userId?.name || 'Unknown'}</h3>
                                        <p className="text-xs text-gray-500 font-medium">Joined: {formatDate(selectedEntry.generatedAt)}</p>
                                    </div>
                                </div>

                                {/* Detail Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-gray-50 rounded-xl space-y-1 col-span-2">
                                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                            <FiMail className="text-xs" /> Email Address
                                        </div>
                                        <div className="text-sm font-bold text-gray-900 break-all">{selectedEntry.userId?.email || 'N/A'}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                            <FiPhone className="text-xs" /> Phone
                                        </div>
                                        <div className="text-sm font-bold text-gray-900">{selectedEntry.userId?.phone || 'N/A'}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                            <FiHash className="text-xs" /> Ticket ID
                                        </div>
                                        <div className="font-mono font-black text-blue-600">{selectedEntry.ticketId}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl space-y-1 col-span-2">
                                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                            <FiCheckCircle className="text-xs" /> Status
                                        </div>
                                        <div>
                                            {selectedEntry.status === 'winner' ? (
                                                <span className="inline-flex items-center gap-1.5 text-purple-600 font-black uppercase text-[10px] tracking-widest">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" /> Winner
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-green-600 font-black uppercase text-[10px] tracking-widest">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" /> {selectedEntry.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Eligibility Status */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Eligibility Met</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {['whatsapp', 'instagram', 'facebook'].map((platform) => (
                                            <div key={platform} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-white">
                                                <span className="text-xs font-bold text-gray-700 capitalize">{platform}</span>
                                                {selectedEntry.eligibilityMet?.[platform] ? (
                                                    <FiCheckCircle className="text-green-500 text-base" />
                                                ) : (
                                                    <FiClock className="text-amber-500 text-base" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-gray-50 border-t border-gray-100">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full py-3 bg-black text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-black/10"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MegaRewardEntries;
