import React, { useState, useEffect } from 'react';
import { FiCalendar, FiUser, FiExternalLink, FiPlus, FiLoader, FiAlertCircle } from 'react-icons/fi';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const MegaRewardWinners = () => {
    const [winners, setWinners] = useState([]);
    const [winnerStatus, setWinnerStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [declaring, setDeclaring] = useState(false);
    const [selectedPrizeRank, setSelectedPrizeRank] = useState('');

    useEffect(() => {
        fetchWinners();
        fetchWinnerStatus();
    }, []);

    const fetchWinners = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/mega-reward/winners');
            if (response.success) {
                // Sort winners by rank (1st, 2nd, 3rd, etc.)
                const sortedWinners = (response.data || []).sort((a, b) => {
                    const getRank = (str) => {
                        const match = str.match(/(\d+)/);
                        return match ? parseInt(match[1]) : 999;
                    };
                    return getRank(a.prizeRank) - getRank(b.prizeRank);
                });
                setWinners(sortedWinners);
            }
        } catch (error) {
            console.error('Failed to fetch winners:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWinnerStatus = async () => {
        try {
            const response = await api.get('/admin/mega-reward/winners/status');
            if (response.success) {
                setWinnerStatus(response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch winner status:', error);
        }
    };

    const handleDeclareWinner = async (prizeRank) => {
        const prizeInfo = winnerStatus.find(s => s.rank === prizeRank);
        const isRange = prizeInfo?.isRange;
        const rangeIndex = prizeInfo?.rangeIndex;

        const confirmMessage = isRange
            ? `Are you sure you want to declare winners for ${prizeRank}? This will randomly select ${prizeInfo.totalSlots} eligible entries and credit the prizes to their wallets.`
            : `Are you sure you want to declare a ${prizeRank} winner? This will randomly select one eligible entry and credit the prize to their wallet.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setDeclaring(true);
        setSelectedPrizeRank(prizeRank);

        try {
            const payload = isRange
                ? { type: 'range', rangeIndex, prizeRank }
                : { prizeRank };

            const response = await api.post('/admin/mega-reward/winners/declare', payload);
            if (response.success) {
                toast.success(`${prizeRank} winner(s) declared! 🏆`);
                fetchWinners();
                fetchWinnerStatus();
            }
        } catch (error) {
            console.error('Declare winner error:', error);
            toast.error(error.message || 'Failed to declare winner');
        } finally {
            setDeclaring(false);
            setSelectedPrizeRank('');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getNextAvailablePrize = () => {
        for (const status of winnerStatus) {
            if (status.remaining > 0) {
                return status.rank;
            }
        }
        return null;
    };

    const nextPrize = getNextAvailablePrize();

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Winners</h1>
                    <p className="text-gray-500 mt-1">Hall of fame for all Mega Reward lucky draw winners.</p>
                </div>
                {nextPrize && (
                    <button
                        onClick={() => handleDeclareWinner(nextPrize)}
                        disabled={declaring}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black font-black rounded-xl hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-400/20 uppercase tracking-wider text-sm disabled:opacity-50"
                    >
                        {declaring ? <FiLoader className="animate-spin" /> : <FiPlus />}
                        {declaring ? 'Selecting...' : `Declare ${nextPrize}`}
                    </button>
                )}
            </div>

            {/* Winner Status Overview */}
            {winnerStatus.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {winnerStatus.map((status, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-2xl border ${status.remaining === 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-black uppercase ${idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-500' : idx === 2 ? 'text-orange-600' : 'text-purple-600'}`}>
                                    {status.rank}
                                </span>
                                {status.remaining === 0 ? (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Complete</span>
                                ) : (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{status.remaining} left</span>
                                )}
                            </div>
                            <div className="text-lg font-black text-gray-900">₹{status.amount?.toLocaleString()}</div>
                            <div className="text-xs text-gray-400 mt-1">{status.declared}/{status.totalSlots} declared</div>
                            {status.remaining > 0 && nextPrize === status.rank && (
                                <button
                                    onClick={() => handleDeclareWinner(status.rank)}
                                    disabled={declaring && selectedPrizeRank === status.rank}
                                    className="mt-3 w-full py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                    {declaring && selectedPrizeRank === status.rank ? (
                                        <><FiLoader className="animate-spin" /> Selecting...</>
                                    ) : (
                                        <><FiPlus /> Declare Winner</>
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <FiLoader className="animate-spin text-4xl text-gray-300" />
                </div>
            ) : winners.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-3xl text-yellow-500 font-bold">₹</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Winners Yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto">Click "Declare Winner" to randomly select an eligible entry and declare them as the winner.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {winners.map((winner) => (
                        <div key={winner._id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                            {/* Rank Badge */}
                            <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-[2rem] text-[10px] font-black uppercase tracking-widest ${winner.prizeRank === '1st Prize' ? 'bg-yellow-400 text-black' :
                                winner.prizeRank === '2nd Prize' ? 'bg-gray-200 text-gray-700' :
                                    winner.prizeRank === '3rd Prize' ? 'bg-orange-100 text-orange-700' :
                                        'bg-purple-100 text-purple-700'
                                }`}>
                                {winner.prizeRank}
                            </div>

                            <div className="flex items-start gap-4 mb-6 pt-4">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500">
                                    {winner.userId?.name?.charAt(0) || <FiUser className="text-gray-400" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{winner.userId?.name || 'Unknown'}</h3>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                                        <FiCalendar className="text-yellow-500" />
                                        {formatDate(winner.declaredAt)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                            <span className="text-yellow-500 font-bold">₹</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prize Won</p>
                                            <p className="text-sm font-bold text-gray-900">₹{winner.prizeAmount?.toLocaleString()} - {winner.prizeDescription}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-2">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Ticket ID</p>
                                        <p className="text-xs font-mono font-bold text-gray-600">{winner.entryId?.ticketId || 'N/A'}</p>
                                    </div>
                                    {winner.walletTransactionId && (
                                        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-full font-bold">
                                            💰 Wallet Credited
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Background Decoration */}
                            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gray-50 rounded-full blur-3xl group-hover:bg-yellow-50 transition-colors" />
                        </div>
                    ))}
                </div>
            )}

            {/* Info Banner */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6 flex gap-4">
                <FiAlertCircle className="text-blue-600 text-xl flex-shrink-0 mt-1" />
                <div>
                    <h3 className="font-bold text-blue-900 text-sm">Winner Selection Process</h3>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                        When you click "Declare Winner", the system randomly selects one eligible entry (verified participants).
                        The prize amount is automatically credited to the winner's wallet and they receive a notification.
                        Each user can only win once per campaign.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MegaRewardWinners;
