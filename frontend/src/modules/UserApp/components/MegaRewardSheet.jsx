import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiShare2, FiLoader, FiGift } from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

const MegaRewardSheet = ({ isOpen, onClose, reelId, reelTitle, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [sharingPlatform, setSharingPlatform] = useState(null);
    const [campaign, setCampaign] = useState(null);

    useEffect(() => {
        if (isOpen && reelId) {
            fetchStatus();
        }
    }, [isOpen, reelId]);

    const fetchStatus = async () => {
        if (!reelId) return;
        try {
            const response = await api.get(`/user/mega-reward/my-status?reelId=${reelId}`);
            if (response.success && response.data) {
                setEligibility(response.data.eligibility || null);
                setCampaign(response.data.campaign || null);
            }
        } catch (error) {
            console.error('Failed to fetch status:', error);
        }
    };

    const handleShare = async (platform) => {
        if (!reelId) {
            toast.error('No reel selected');
            return;
        }

        console.info(`[MegaRewardShare] Sharing to ${platform}`, { reelId });
        setSharingPlatform(platform);
        setLoading(true);

        try {
            // 1. Generate persistent share link from backend
            const response = await api.post('/user/mega-reward/share-link', {
                reelId,
                platform
            });

            if (response.success && response.data) {
                const { shareUrl } = response.data;
                const shareMessage = `Check out this amazing reel on Dealing India! 🎬 ${reelTitle || 'Watch Now'}`;
                const fullText = `${shareMessage}\n\n${shareUrl}`;

                // 2. Platform-specific execution
                if (platform === 'whatsapp') {
                    // Direct WhatsApp sharing
                    const waUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
                    window.open(waUrl, '_blank');
                } else if (navigator.share) {
                    // Use Native Web Share API for Instagram, Facebook and others
                    // This opens the native mobile share menu with multiple options
                    try {
                        await navigator.share({
                            title: reelTitle || 'Mega Reward Reel',
                            text: shareMessage,
                            url: shareUrl
                        });
                        toast.success(`Opening ${platform} share...`);
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            console.error('Native share failed:', err);
                            // Fallback to clipboard if share fails
                            await copyToClipboard(fullText);
                        }
                    }
                } else {
                    // Fallback for browsers that don't support navigator.share
                    await copyToClipboard(fullText);
                }

                // Refresh status after a short delay to account for network/DB updates
                setTimeout(() => fetchStatus(), 3000);
            }
        } catch (error) {
            console.error('[MegaRewardShare] Share error:', error);
            toast.error(error.message || 'Failed to generate share link');
        } finally {
            setLoading(false);
            setSharingPlatform(null);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Link copied! Please share it manually.');
        } catch (err) {
            toast.error('Failed to copy. Please copy link manually.');
        }
    };

    const handleGenerateTicket = async () => {
        if (!reelId) {
            toast.error('No reel selected');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/user/mega-reward/generate-ticket', { reelId });

            if (response.success) {
                toast.success(response.message || 'Ticket generated!');
                if (onComplete) {
                    onComplete(response.data);
                }
                onClose();
            }
        } catch (error) {
            console.error('Ticket generation error:', error);
            toast.error(error.message || 'Not eligible yet. Please complete all shares first.');
        } finally {
            setLoading(false);
        }
    };

    const allEligible = eligibility?.eligibility?.allMet || false;
    const stats = eligibility?.stats || {
        whatsapp: { clicks: 0, required: 5 },
        instagram: { clicks: 0, required: 1 },
        facebook: { clicks: 0, required: 1 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-50 max-h-[85vh] overflow-y-auto"
                    >
                        <div className="sticky top-0 bg-white pt-3 pb-2 z-10">
                            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                        >
                            <FiX className="text-gray-500" />
                        </button>

                        <div className="px-6 pb-10">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-400/30">
                                    <FiGift className="text-white text-2xl" />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 mb-1">
                                    {campaign?.prizeTitle || 'Mega Reward'}
                                </h2>
                                <p className="text-sm text-gray-500 font-medium">Share this reel to enter the lucky draw!</p>
                            </div>

                            {campaign?.prizes && (
                                <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100 shadow-sm">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Winning Prizes</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {campaign.prizes.slice(0, 3).map((prize, idx) => (
                                            <div key={idx} className="text-center bg-white p-2 rounded-xl border border-gray-100">
                                                <div className="text-2xl mb-1">{idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}</div>
                                                <div className="text-xs font-black text-gray-900">₹{prize.amount?.toLocaleString()}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {campaign.customRanges && campaign.customRanges.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Additional Rewards</div>
                                            <div className="space-y-2">
                                                {campaign.customRanges.map((range, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-gray-500">Rank {range.startRank}-{range.endRank}</span>
                                                        <span className="font-black text-gray-900 bg-yellow-100 px-2 py-0.5 rounded text-[10px]">₹{range.prizeAmount?.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3 mb-8">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Steps to Eligibility</div>

                                <StepItem
                                    icon={<FaWhatsapp className="text-green-600 text-xl" />}
                                    label="WhatsApp Share"
                                    subLabel={`${stats.whatsapp?.clicks || 0}/${stats.whatsapp?.required || 5} unique opens required`}
                                    done={eligibility?.eligibility?.whatsapp}
                                    loading={sharingPlatform === 'whatsapp'}
                                    onShare={() => handleShare('whatsapp')}
                                />

                                <StepItem
                                    icon={<FaInstagram className="text-pink-600 text-xl" />}
                                    label="Instagram Share"
                                    subLabel={`${stats.instagram?.clicks || 0}/${stats.instagram?.required || 1} unique open required`}
                                    done={eligibility?.eligibility?.instagram}
                                    loading={sharingPlatform === 'instagram'}
                                    onShare={() => handleShare('instagram')}
                                />

                                <StepItem
                                    icon={<FaFacebook className="text-blue-600 text-xl" />}
                                    label="Facebook Share"
                                    subLabel={`${stats.facebook?.clicks || 0}/${stats.facebook?.required || 1} unique open required`}
                                    done={eligibility?.eligibility?.facebook}
                                    loading={sharingPlatform === 'facebook'}
                                    onShare={() => handleShare('facebook')}
                                />
                            </div>

                            {allEligible ? (
                                <button
                                    onClick={handleGenerateTicket}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-yellow-400/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                >
                                    {loading ? <FiLoader className="animate-spin text-xl" /> : <FiGift className="text-xl" />}
                                    {loading ? 'Generating...' : 'Generate Entry Ticket'}
                                </button>
                            ) : (
                                <div className="text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-xs text-gray-500 font-black uppercase tracking-widest">
                                        {stats.whatsapp?.clicks < stats.whatsapp?.required
                                            ? `Need ${stats.whatsapp?.required - stats.whatsapp?.clicks} more WhatsApp opens`
                                            : 'Almost there! Complete all shares'}
                                    </p>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-6">
                                <p className="text-[10px] text-blue-700 leading-relaxed text-center font-medium">
                                    <span className="font-black block mb-1">💡 HOW IT WORKS:</span>
                                    Only clicks from <span className="font-black">other unique users</span> are counted.
                                    Self-clicks or clicks from the same device/network will not increase your count.
                                    If you are logged in, your own clicks are ignored.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const StepItem = ({ icon, label, subLabel, done, loading, onShare }) => (
    <div className={`flex items-center p-4 rounded-2xl border transition-all ${done ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50 shadow-sm'}`}>
        <div className={`mr-4 p-2 rounded-xl ${done ? 'bg-white' : 'bg-gray-100'}`}>{icon}</div>
        <div className="flex-1">
            <div className={`font-black text-sm ${done ? 'text-gray-900' : 'text-gray-600'}`}>{label}</div>
            <div className={`text-[10px] font-bold ${done ? 'text-green-600' : 'text-gray-400'}`}>{subLabel}</div>
        </div>
        {done ? (
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                <FiCheckCircle className="text-white text-lg" />
            </div>
        ) : (
            <button
                onClick={onShare}
                disabled={loading}
                className="px-5 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-50 shadow-md"
            >
                {loading ? <FiLoader className="animate-spin" /> : <FiShare2 />}
                {loading ? '...' : 'Share'}
            </button>
        )}
    </div>
);

export default MegaRewardSheet;
