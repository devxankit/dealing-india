import React, { useState, useEffect } from 'react';
import { FiSave, FiInfo, FiAlertCircle, FiSettings, FiCalendar, FiGift, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const MegaRewardSettings = () => {
    const [settings, setSettings] = useState({
        prizeTitle: '',
        prizes: [
            { id: 1, rank: '1st Prize', amount: 0, description: '', icon: '🏆', winnerCount: 1 },
            { id: 2, rank: '2nd Prize', amount: 0, description: '', icon: '🥈', winnerCount: 1 },
            { id: 3, rank: '3rd Prize', amount: 0, description: '', icon: '🥉', winnerCount: 1 },
            { id: 4, rank: 'Consolation', amount: 0, description: '', icon: '🎁', winnerCount: 1 }
        ],
        startDate: '',
        endDate: '',
        isActive: true,
        requiredClicks: {
            whatsapp: 5,
            instagram: 1,
            facebook: 1
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settingsId, setSettingsId] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    // Fetch active settings on mount
    useEffect(() => {
        fetchSettings();
    }, []);

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
                    })) || settings.prizes,
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
                    winnerCount: parseInt(p.winnerCount) || 1
                })),
                startDate: settings.startDate,
                endDate: settings.endDate,
                isActive: settings.isActive,
                requiredClicks: settings.requiredClicks
            };

            let response;
            if (settingsId) {
                // Update existing
                response = await api.put(`/admin/mega-reward/settings/${settingsId}`, payload);
            } else {
                // Create new
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
                    <div className="p-6 border-b border-gray-50 flex items-center gap-2">
                        <FiGift className="text-yellow-600" />
                        <h2 className="font-bold text-gray-900">Prize Configuration (1st, 2nd, 3rd & Custom)</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        {settings.prizes.map((prize) => (
                            <div key={prize.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{prize.rank}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2">{prize.icon}</span>
                                            <input
                                                type="text"
                                                value={prize.rank}
                                                onChange={(e) => prize.id === 4 && handlePrizeChange(prize.id, 'rank', e.target.value)}
                                                disabled={prize.id !== 4}
                                                className={`w-full bg-white border border-gray-200 rounded-xl p-2 pl-10 text-sm font-bold ${prize.id === 4 ? 'text-gray-900' : 'text-gray-500'}`}
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

                                {prize.id === 4 && (
                                    <div className="pt-4 border-t border-gray-200 flex items-center gap-4">
                                        <div className="space-y-2 flex-1">
                                            <label className="text-xs font-black text-purple-600 uppercase tracking-widest">Number of Winners for this category</label>
                                            <input
                                                type="number"
                                                value={prize.winnerCount || 0}
                                                onChange={(e) => handlePrizeChange(prize.id, 'winnerCount', e.target.value)}
                                                disabled={isLocked}
                                                className={`w-full max-w-[200px] bg-purple-50 border border-purple-100 rounded-xl p-2 text-sm font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
                                                placeholder="e.g. 10"
                                            />
                                        </div>
                                        <div className="text-xs text-gray-400 italic">
                                            * This prize will be given to {prize.winnerCount || 0} users after top 3.
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
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

                {/* Warning Area */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
                    <FiAlertCircle className="text-amber-600 text-xl flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold text-amber-900 text-sm">Important Note</h3>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                            Changes to the prize amount or end date will affect all current participants.
                            If you disable the program, users will no longer be able to generate new tickets,
                            but existing tickets will remain valid for the draw.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MegaRewardSettings;
