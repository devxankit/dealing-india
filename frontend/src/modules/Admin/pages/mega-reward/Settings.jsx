import React, { useState, useEffect } from 'react';
import { FiSave, FiInfo, FiAlertCircle, FiSettings, FiCalendar, FiGift, FiLoader, FiPlus, FiTrash2, FiSearch, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const MegaRewardSettings = () => {
    const [settings, setSettings] = useState({
        prizeTitle: '',
        prizes: [
            { id: 1, rank: '1st Prize', amount: 0, description: '', icon: '🏆', winnerCount: 1 },
            { id: 2, rank: '2nd Prize', amount: 0, description: '', icon: '🥈', winnerCount: 1 },
            { id: 3, rank: '3rd Prize', amount: 0, description: '', icon: '🥉', winnerCount: 1 }
        ],
        customRanges: [],
        startDate: '',
        endDate: '',
        isActive: true,
        requiredClicks: {
            whatsapp: 5,
            instagram: 1,
            facebook: 1
        }
    });
    const [entries, setEntries] = useState([]);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [currentSelectingRank, setCurrentSelectingRank] = useState(null);
    const [winnerStatus, setWinnerStatus] = useState([]);
    const [searchEntry, setSearchEntry] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settingsId, setSettingsId] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    // Fetch active settings on mount
    useEffect(() => {
        fetchSettings();
        fetchWinnerStatus();
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            const response = await api.get('/admin/mega-reward/entries?limit=1000');
            if (response.success) {
                setEntries(response.data.entries || []);
            }
        } catch (error) {
            console.error('Failed to fetch entries:', error);
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

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/mega-reward/settings/active');
            if (response.success && response.data) {
                const data = response.data;
                setSettingsId(data._id);
                setSettings({
                    prizeTitle: data.prizeTitle || 'Grand Monthly Jackpot',
                    prizes: data.prizes?.map((p, idx) => ({
                        id: idx + 1,
                        rank: p.rank,
                        amount: Number(p.amount) || 0,
                        description: p.description || '',
                        icon: p.icon || '🎁',
                        winnerCount: Number(p.winnerCount) || 1
                    })).slice(0, 3) || settings.prizes,
                    customRanges: data.customRanges?.map((r, idx) => ({
                        ...r,
                        id: idx + 100 // unique id for ranges
                    })) || [],
                    startDate: data.startDate ? data.startDate.split('T')[0] : '',
                    endDate: data.endDate ? data.endDate.split('T')[0] : '',
                    isActive: data.isActive ?? true,
                    requiredClicks: data.requiredClicks || { whatsapp: 5, instagram: 1, facebook: 1 }
                });

                // Check if campaign has already started
                const now = new Date();
                const startDate = data.startDate ? new Date(data.startDate) : null;
                if (data.isActive && startDate && startDate <= now) {
                    setIsLocked(true);
                } else {
                    setIsLocked(false);
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            // If no settings found, keep defaults
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePrizeChange = (id, field, value) => {
        let finalValue = value;
        if ((field === 'amount' || field === 'winnerCount') && value === '') {
            finalValue = 0;
        } else if (field === 'amount' || field === 'winnerCount') {
            finalValue = parseInt(value) || 0;
        }

        setSettings(prev => ({
            ...prev,
            prizes: prev.prizes.map(p => p.id === id ? { ...p, [field]: finalValue } : p)
        }));
    };

    const handleSave = async () => {
        // Validation
        if (!settings.prizeTitle) {
            toast.error('Please enter a campaign title');
            return;
        }
        if (!settings.startDate || !settings.endDate) {
            toast.error('Please select start and end dates');
            return;
        }
        if (new Date(settings.endDate) <= new Date(settings.startDate)) {
            toast.error('End date must be after start date');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                prizeTitle: settings.prizeTitle,
                prizes: settings.prizes.map(p => ({
                    rank: p.rank,
                    amount: parseInt(p.amount),
                    description: p.description,
                    icon: p.icon,
                    winnerCount: 1
                })),
                customRanges: settings.customRanges.map(r => ({
                    startRank: parseInt(r.startRank),
                    endRank: parseInt(r.endRank),
                    prizeAmount: parseInt(r.prizeAmount),
                    description: r.description,
                    icon: r.icon || '🎁'
                })),
                startDate: settings.startDate,
                endDate: settings.endDate,
                isActive: settings.isActive,
                requiredClicks: settings.requiredClicks
            };

            let response;
            if (settingsId) {
                response = await api.put(`/admin/mega-reward/settings/${settingsId}`, payload);
            } else {
                response = await api.post('/admin/mega-reward/settings', payload);
            }

            if (response.success) {
                if (response.data?._id && !settingsId) {
                    setSettingsId(response.data._id);
                }
                toast.success('Settings saved successfully!');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleAddRange = () => {
        if (settings.customRanges.length >= 5) {
            toast.error('Maximum 5 ranges allowed');
            return;
        }
        const lastEndRank = settings.customRanges.length > 0
            ? settings.customRanges[settings.customRanges.length - 1].endRank
            : 3;

        setSettings(prev => ({
            ...prev,
            customRanges: [
                ...prev.customRanges,
                { id: Date.now(), startRank: lastEndRank + 1, endRank: lastEndRank + 10, prizeAmount: 0, description: '', icon: '🎁' }
            ]
        }));
    };

    const handleRemoveRange = (id) => {
        setSettings(prev => ({
            ...prev,
            customRanges: prev.customRanges.filter(r => r.id !== id)
        }));
    };

    const handleRangeChange = (id, field, value) => {
        setSettings(prev => ({
            ...prev,
            customRanges: prev.customRanges.map(r => r.id === id ? { ...r, [field]: value } : r)
        }));
    };

    const handleOpenSelectionModal = (rank) => {
        setCurrentSelectingRank(rank);
        setShowSelectionModal(true);
    };

    const handleSelectWinner = async (entryId) => {
        if (!window.confirm(`Are you sure you want to select this user for ${currentSelectingRank}?`)) return;

        try {
            const response = await api.post('/admin/mega-reward/winners/declare', {
                megaRewardId: settingsId,
                prizeRank: currentSelectingRank,
                entryId,
                type: 'manual'
            });

            if (response.success) {
                toast.success(`${currentSelectingRank} declared!`);
                setShowSelectionModal(false);
                fetchWinnerStatus();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to declare winner');
        }
    };

    const handleDeclareRange = async (index) => {
        if (!window.confirm(`Are you sure you want to randomly declare winners for this range?`)) return;

        try {
            const response = await api.post('/admin/mega-reward/winners/declare', {
                megaRewardId: settingsId,
                rangeIndex: index,
                type: 'range'
            });

            if (response.success) {
                toast.success(`Winners declared for range!`);
                fetchWinnerStatus();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to declare winners');
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
                <FiLoader className="animate-spin text-4xl text-purple-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mega Reward Settings</h1>
                    <p className="text-gray-500 mt-1">Configure the rules and prizes for the Mega Reward program.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || isLocked}
                    className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
                    {saving ? 'Saving...' : isLocked ? 'Settings Locked' : 'Save Changes'}
                </button>
            </div>

            {isLocked && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                    <FiAlertCircle className="flex-shrink-0" />
                    <p className="text-sm font-bold">
                        Editing is disabled because this campaign is currently active/started.
                    </p>
                </div>
            )}

            <div className="space-y-6">
                {/* General Configuration */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center gap-2">
                        <FiSettings className="text-purple-600" />
                        <h2 className="font-bold text-gray-900">General Configuration</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-gray-700">Campaign Title</label>
                            <input
                                type="text"
                                name="prizeTitle"
                                value={settings.prizeTitle}
                                onChange={handleChange}
                                disabled={isLocked}
                                className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                placeholder="e.g. Grand Monthly Jackpot"
                            />
                        </div>
                    </div>
                </div>

                {/* Prize Configuration */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FiGift className="text-yellow-600" />
                            <h2 className="font-bold text-gray-900">Prize Configuration (1st, 2nd & 3rd)</h2>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        {settings.prizes.map((prize) => {
                            const status = winnerStatus.find(s => s.rank === prize.rank);
                            const isDeclared = status && status.declared > 0;
                            return (
                                <div key={prize.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{prize.rank}</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2">{prize.icon}</span>
                                                <input
                                                    type="text"
                                                    value={prize.rank}
                                                    disabled
                                                    className="w-full bg-white border border-gray-200 rounded-xl p-2 pl-10 text-sm font-bold text-gray-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Amount (₹)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    value={prize.amount || 0}
                                                    onChange={(e) => handlePrizeChange(prize.id, 'amount', e.target.value)}
                                                    disabled={isLocked}
                                                    className={`w-full bg-white border border-gray-200 rounded-xl p-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</label>
                                            <input
                                                type="text"
                                                value={prize.description}
                                                onChange={(e) => handlePrizeChange(prize.id, 'description', e.target.value)}
                                                disabled={isLocked}
                                                className={`w-full bg-white border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                                placeholder="e.g. Cash Prize"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="text-xs text-gray-500 font-bold">
                                            {isDeclared ? (
                                                <span className="text-green-600 flex items-center gap-1">
                                                    <FiCheck /> Winner: {status.winners[0]?.userId?.name || 'Unknown'} (Ticket: {status.winners[0]?.entryId?.ticketId})
                                                </span>
                                            ) : (
                                                <span className="text-amber-600">No winner declared yet</span>
                                            )}
                                        </div>
                                        {!isDeclared && settingsId && (
                                            <button
                                                onClick={() => handleOpenSelectionModal(prize.rank)}
                                                className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-all flex items-center gap-2"
                                            >
                                                <FiPlus /> Select Winner
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Range Configuration */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FiSettings className="text-purple-600" />
                            <h2 className="font-bold text-gray-900">Custom Range-Based Prizes (4th Prize Onwards)</h2>
                        </div>
                        <button
                            onClick={handleAddRange}
                            disabled={isLocked || settings.customRanges.length >= 5}
                            className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50"
                        >
                            <FiPlus /> Add Range
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        {settings.customRanges.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <p className="text-sm text-gray-500">No custom ranges configured yet. Max 5 ranges allowed.</p>
                            </div>
                        )}
                        {settings.customRanges.map((range, index) => {
                            const status = winnerStatus.find(s => s.rangeIndex === index);
                            const isComplete = status && status.remaining === 0;
                            return (
                                <div key={range.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Range {index + 1}</h3>
                                        {!isLocked && (
                                            <button onClick={() => handleRemoveRange(range.id)} className="text-red-500 hover:text-red-600">
                                                <FiTrash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Start Rank</label>
                                            <input
                                                type="number"
                                                value={range.startRank}
                                                onChange={(e) => handleRangeChange(range.id, 'startRank', parseInt(e.target.value))}
                                                disabled={isLocked}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">End Rank</label>
                                            <input
                                                type="number"
                                                value={range.endRank}
                                                onChange={(e) => handleRangeChange(range.id, 'endRank', parseInt(e.target.value))}
                                                disabled={isLocked}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Prize Amount</label>
                                            <input
                                                type="number"
                                                value={range.prizeAmount}
                                                onChange={(e) => handleRangeChange(range.id, 'prizeAmount', parseInt(e.target.value))}
                                                disabled={isLocked}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Description</label>
                                            <input
                                                type="text"
                                                value={range.description}
                                                onChange={(e) => handleRangeChange(range.id, 'description', e.target.value)}
                                                disabled={isLocked}
                                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                                                placeholder="e.g. Consolation"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-[10px] font-bold text-gray-500">
                                            {status ? (
                                                <span className={status.remaining === 0 ? 'text-green-600' : 'text-amber-600'}>
                                                    {status.declared} / {status.totalSlots} winners declared
                                                </span>
                                            ) : (
                                                <span>Save settings to enable declaration</span>
                                            )}
                                        </div>
                                        {status && status.remaining > 0 && (
                                            <button
                                                onClick={() => handleDeclareRange(index)}
                                                className="px-3 py-1 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-700"
                                            >
                                                Declare {status.remaining} Winners
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Date Configuration */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center gap-2">
                        <FiCalendar className="text-blue-600" />
                        <h2 className="font-bold text-gray-900">Duration</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Start Date</label>
                            <div className="relative">
                                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    name="startDate"
                                    value={settings.startDate}
                                    onChange={handleChange}
                                    disabled={isLocked}
                                    className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">End Date</label>
                            <div className="relative">
                                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    name="endDate"
                                    value={settings.endDate}
                                    onChange={handleChange}
                                    disabled={isLocked}
                                    className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Participation Rules */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center gap-2">
                        <FiInfo className="text-blue-600" />
                        <h2 className="font-bold text-gray-900">Participation Rules</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Active Status</h3>
                                <p className="text-xs text-gray-500">Enable or disable the Mega Reward program globally.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={settings.isActive}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900 text-sm">Required Unique Clicks for Eligibility</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 border border-gray-100 rounded-xl">
                                    <label className="text-xs font-bold text-green-600 uppercase">WhatsApp</label>
                                    <input
                                        type="number"
                                        value={settings.requiredClicks?.whatsapp || 5}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            requiredClicks: { ...prev.requiredClicks, whatsapp: parseInt(e.target.value) }
                                        }))}
                                        disabled={isLocked}
                                        className={`w-full mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                        min="1"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Unique people must open link</p>
                                </div>
                                <div className="p-4 border border-gray-100 rounded-xl">
                                    <label className="text-xs font-bold text-pink-600 uppercase">Instagram</label>
                                    <input
                                        type="number"
                                        value={settings.requiredClicks?.instagram || 1}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            requiredClicks: { ...prev.requiredClicks, instagram: parseInt(e.target.value) }
                                        }))}
                                        disabled={isLocked}
                                        className={`w-full mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                        min="1"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Unique people must open link</p>
                                </div>
                                <div className="p-4 border border-gray-100 rounded-xl">
                                    <label className="text-xs font-bold text-blue-600 uppercase">Facebook</label>
                                    <input
                                        type="number"
                                        value={settings.requiredClicks?.facebook || 1}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            requiredClicks: { ...prev.requiredClicks, facebook: parseInt(e.target.value) }
                                        }))}
                                        disabled={isLocked}
                                        className={`w-full mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                        min="1"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Unique people must open link</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Winner Selection Modal */}
            {showSelectionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Select Winner</h2>
                                <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mt-1">{currentSelectingRank}</p>
                            </div>
                            <button
                                onClick={() => setShowSelectionModal(false)}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                            >
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="p-8">
                            {/* Search bar */}
                            <div className="relative mb-6">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email or ticket ID..."
                                    value={searchEntry}
                                    onChange={(e) => setSearchEntry(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-purple-500/20 transition-all"
                                />
                            </div>

                            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {entries
                                    .filter(entry =>
                                        entry.status === 'active' && !winnerStatus.some(s => s.winners.some(w => w.userId?._id === entry.userId?._id)) && (
                                            entry.userId?.name?.toLowerCase().includes(searchEntry.toLowerCase()) ||
                                            entry.userId?.email?.toLowerCase().includes(searchEntry.toLowerCase()) ||
                                            entry.ticketId?.toLowerCase().includes(searchEntry.toLowerCase())
                                        ))
                                    .map((entry) => (
                                        <div
                                            key={entry._id}
                                            className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl font-black text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500 transition-colors">
                                                    {entry.userId?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{entry.userId?.name || 'Unknown'}</h4>
                                                    <p className="text-xs text-gray-400 font-medium">{entry.userId?.email || 'No email'}</p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                            {entry.ticketId}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleSelectWinner(entry._id)}
                                                className="px-6 py-2.5 bg-black text-white text-xs font-black rounded-xl hover:bg-purple-600 transition-all shadow-sm"
                                            >
                                                Select
                                            </button>
                                        </div>
                                    ))}

                                {entries.filter(entry =>
                                    entry.status === 'active' && !winnerStatus.some(s => s.winners.some(w => w.userId?._id === entry.userId?._id)) && (
                                        entry.userId?.name?.toLowerCase().includes(searchEntry.toLowerCase()) ||
                                        entry.userId?.email?.toLowerCase().includes(searchEntry.toLowerCase()) ||
                                        entry.ticketId?.toLowerCase().includes(searchEntry.toLowerCase())
                                    )).length === 0 && (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FiSearch className="text-2xl text-gray-300" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900">No Eligible Entries Found</h3>
                                            <p className="text-sm text-gray-500">Try searching for something else or ensure entries are active.</p>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MegaRewardSettings;
