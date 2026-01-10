import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiShare2, FiLoader, FiGift, FiExternalLink, FiCopy, FiMessageCircle, FiCamera } from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

const MegaRewardSheet = ({ isOpen, onClose, reelId, reelTitle, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [sharingPlatform, setSharingPlatform] = useState(null);
    const [campaign, setCampaign] = useState(null);
    const [showInstagramOptions, setShowInstagramOptions] = useState(false);
    const [showFacebookOptions, setShowFacebookOptions] = useState(false);

    useEffect(() => {
        if (isOpen && reelId) {
            fetchStatus();
        }
    }, [isOpen, reelId]);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/user/mega-reward/my-status');
            if (response.success && response.data) {
                setEligibility(response.data.eligibility);
                setCampaign(response.data.campaign);
            }
        } catch (error) {
            console.error('Failed to fetch status:', error);
        }
    };

    const copyToClipboard = async (text, successMsg = 'Link copied!') => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(successMsg);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            toast.error('Failed to copy link. Please manually copy.');
            return false;
        }
    };

    // Check if device is mobile
    const isMobile = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    const handleShare = async (platform, subAction = null) => {
        if (!reelId) {
            toast.error('No reel selected');
            return;
        }

        console.info(`[MegaRewardShare] Sharing to ${platform}${subAction ? ` (${subAction})` : ''}`, { reelId });

        setSharingPlatform(`${platform}${subAction ? `-${subAction}` : ''}`);
        setLoading(true);

        try {
            // 1. Generate persistent share link from backend
            const response = await api.post('/user/mega-reward/share-link', {
                reelId,
                platform
            });

            if (response.success && response.data) {
                const { shareUrl } = response.data;
                const shareMessage = `Check out this amazing reel! 🎬 ${reelTitle || 'Watch Now'}`;
                const fullText = `${shareMessage}\n\n${shareUrl}`;

                // 2. Platform-specific execution
                switch (platform) {
                    case 'whatsapp':
                        // Direct WhatsApp sharing
                        const waUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
                        window.open(waUrl, '_blank');
                        break;

                    case 'instagram':
                        // Copy link first
                        await copyToClipboard(fullText, 'Link copied! Opening Instagram...');

                        if (isMobile()) {
                            let igUrl;
                            switch (subAction) {
                                case 'app':
                                    // Open Instagram app home - user is at top of app with link copied
                                    igUrl = 'instagram://app';
                                    break;
                                case 'story':
                                    // Open Instagram story camera - user can paste link as sticker
                                    igUrl = 'instagram://story-camera';
                                    break;
                                case 'message':
                                    // Open Instagram DMs - user can paste and send
                                    igUrl = 'instagram://direct-inbox';
                                    break;
                                default:
                                    igUrl = 'instagram://app';
                            }

                            // Try deep link, fallback to web
                            const startTime = Date.now();
                            window.location.href = igUrl;

                            setTimeout(() => {
                                // If still on this page after 1.5s, app is not installed
                                if (Date.now() - startTime < 2000) {
                                    const webFallbacks = {
                                        'app': 'https://www.instagram.com/',
                                        'story': 'https://www.instagram.com/create/story/',
                                        'message': 'https://www.instagram.com/direct/inbox/'
                                    };
                                    window.open(webFallbacks[subAction] || 'https://www.instagram.com/', '_blank');
                                }
                            }, 1500);
                        } else {
                            // Desktop - open web version
                            const webUrls = {
                                'app': 'https://www.instagram.com/',
                                'story': 'https://www.instagram.com/create/story/',
                                'message': 'https://www.instagram.com/direct/inbox/'
                            };
                            window.open(webUrls[subAction] || 'https://www.instagram.com/', '_blank');
                        }
                        break;

                    case 'facebook':
                        // Copy link first
                        await copyToClipboard(fullText, 'Link copied! Opening Facebook...');

                        if (isMobile()) {
                            let fbUrl;
                            switch (subAction) {
                                case 'app':
                                    // Open Facebook app home - user can create post
                                    fbUrl = 'fb://';
                                    break;
                                case 'story':
                                    // Open Facebook story camera
                                    fbUrl = 'fb://story';
                                    break;
                                case 'message':
                                    // Open Messenger
                                    fbUrl = 'fb-messenger://';
                                    break;
                                default:
                                    fbUrl = 'fb://';
                            }

                            const startTime = Date.now();
                            window.location.href = fbUrl;

                            setTimeout(() => {
                                if (Date.now() - startTime < 2000) {
                                    const webFallbacks = {
                                        'app': 'https://www.facebook.com/',
                                        'story': 'https://www.facebook.com/stories/create',
                                        'message': 'https://www.messenger.com/'
                                    };
                                    window.open(webFallbacks[subAction] || 'https://www.facebook.com/', '_blank');
                                }
                            }, 1500);
                        } else {
                            // Desktop - open web version
                            const webUrls = {
                                'app': 'https://www.facebook.com/',
                                'story': 'https://www.facebook.com/stories/create',
                                'message': 'https://www.messenger.com/'
                            };
                            window.open(webUrls[subAction] || 'https://www.facebook.com/', '_blank');
                        }
                        break;

                    case 'copy':
                        // Just copy the link
                        await copyToClipboard(fullText, 'Share link copied to clipboard!');
                        break;
                }

                // Refresh status after a short delay
                setTimeout(() => fetchStatus(), 2500);
            }
        } catch (error) {
            console.error('[MegaRewardShare] Share error:', error);
            toast.error(error.message || 'Failed to generate share link');
        } finally {
            setLoading(false);
            setSharingPlatform(null);
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
            toast.error(error.message || 'Not eligible yet. Complete all shares first!');
        } finally {
            setLoading(false);
        }
    };

    const allEligible = eligibility?.eligibility?.allMet || false;
    const stats = eligibility?.stats || { whatsapp: { clicks: 0, required: 5 }, instagram: { clicks: 0, required: 1 }, facebook: { clicks: 0, required: 1 } };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-50 max-h-[85vh] overflow-y-auto"
                    >
                        {/* Handle */}
                        <div className="sticky top-0 bg-white pt-3 pb-2 z-10">
                            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                        >
                            <FiX className="text-gray-500" />
                        </button>

                        {/* Content */}
                        <div className="px-6 pb-8">
                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-400/30">
                                    <FiGift className="text-white text-2xl" />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 mb-1">
                                    {campaign?.prizeTitle || 'Mega Reward'}
                                </h2>
                                <p className="text-sm text-gray-500">Share this reel to enter the lucky draw!</p>
                            </div>

                            {/* Prize Preview */}
                            {campaign?.prizes && (
                                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Prizes</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {campaign.prizes.slice(0, 3).map((prize, idx) => (
                                            <div key={idx} className="text-center">
                                                <div className="text-2xl mb-1">{idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}</div>
                                                <div className="text-xs font-black text-gray-900">₹{prize.amount?.toLocaleString()}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Custom Ranges */}
                                    {campaign.customRanges && campaign.customRanges.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Additional Rewards</div>
                                            <div className="space-y-2">
                                                {campaign.customRanges.map((range, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-gray-500">Rank {range.startRank}-{range.endRank}</span>
                                                        <span className="font-black text-gray-900">₹{range.prizeAmount?.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Share Steps */}
                            <div className="space-y-3 mb-6">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Complete All Shares</div>

                                {/* WhatsApp - Direct share */}
                                <StepItem
                                    icon={<FaWhatsapp className="text-green-600 text-xl" />}
                                    label="WhatsApp"
                                    subLabel={`${stats.whatsapp?.clicks || 0}/${stats.whatsapp?.required || 5} unique opens`}
                                    done={eligibility?.eligibility?.whatsapp}
                                    loading={sharingPlatform === 'whatsapp'}
                                    onShare={() => handleShare('whatsapp')}
                                />

                                {/* Instagram - with sub-options */}
                                <div className="space-y-2">
                                    <StepItem
                                        icon={<FaInstagram className="text-pink-600 text-xl" />}
                                        label="Instagram"
                                        subLabel={`${stats.instagram?.clicks || 0}/${stats.instagram?.required || 1} unique opens`}
                                        done={eligibility?.eligibility?.instagram}
                                        loading={sharingPlatform?.startsWith('instagram')}
                                        onShare={() => setShowInstagramOptions(!showInstagramOptions)}
                                        isExpanded={showInstagramOptions}
                                    />

                                    <AnimatePresence>
                                        {showInstagramOptions && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="grid grid-cols-3 gap-2 px-2 overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => handleShare('instagram', 'app')}
                                                    disabled={loading}
                                                    className="py-3 px-2 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl text-[10px] font-bold text-pink-600 flex flex-col items-center gap-1 border border-pink-100 hover:shadow-md transition-all active:scale-95"
                                                >
                                                    <FaInstagram className="text-lg" />
                                                    <span>App</span>
                                                    <span className="text-[8px] text-gray-400">Open & Paste</span>
                                                </button>
                                                <button
                                                    onClick={() => handleShare('instagram', 'story')}
                                                    disabled={loading}
                                                    className="py-3 px-2 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl text-[10px] font-bold text-pink-600 flex flex-col items-center gap-1 border border-pink-100 hover:shadow-md transition-all active:scale-95"
                                                >
                                                    <FiCamera className="text-lg" />
                                                    <span>Story</span>
                                                    <span className="text-[8px] text-gray-400">Add to Story</span>
                                                </button>
                                                <button
                                                    onClick={() => handleShare('instagram', 'message')}
                                                    disabled={loading}
                                                    className="py-3 px-2 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl text-[10px] font-bold text-pink-600 flex flex-col items-center gap-1 border border-pink-100 hover:shadow-md transition-all active:scale-95"
                                                >
                                                    <FiMessageCircle className="text-lg" />
                                                    <span>Message</span>
                                                    <span className="text-[8px] text-gray-400">Send to Friends</span>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Facebook - with sub-options (same as Instagram) */}
                                <div className="space-y-2">
                                    <StepItem
                                        icon={<FaFacebook className="text-blue-600 text-xl" />}
                                        label="Facebook"
                                        subLabel={`${stats.facebook?.clicks || 0}/${stats.facebook?.required || 1} unique opens`}
                                        done={eligibility?.eligibility?.facebook}
                                        loading={sharingPlatform?.startsWith('facebook')}
                                        onShare={() => setShowFacebookOptions(!showFacebookOptions)}
                                        isExpanded={showFacebookOptions}
                                    />

                                    <AnimatePresence>
                                        {showFacebookOptions && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="grid grid-cols-3 gap-2 px-2 overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => handleShare('facebook', 'app')}
                                                    disabled={loading}
                                                    className="py-3 px-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-[10px] font-bold text-blue-600 flex flex-col items-center gap-1 border border-blue-100 hover:shadow-md transition-all active:scale-95"
                                                >
                                                    <FaFacebook className="text-lg" />
                                                    <span>App</span>
                                                    <span className="text-[8px] text-gray-400">Open & Paste</span>
                                                </button>
                                                <button
                                                    onClick={() => handleShare('facebook', 'story')}
                                                    disabled={loading}
                                                    className="py-3 px-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-[10px] font-bold text-blue-600 flex flex-col items-center gap-1 border border-blue-100 hover:shadow-md transition-all active:scale-95"
                                                >
                                                    <FiCamera className="text-lg" />
                                                    <span>Story</span>
                                                    <span className="text-[8px] text-gray-400">Add to Story</span>
                                                </button>
                                                <button
                                                    onClick={() => handleShare('facebook', 'message')}
                                                    disabled={loading}
                                                    className="py-3 px-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-[10px] font-bold text-blue-600 flex flex-col items-center gap-1 border border-blue-100 hover:shadow-md transition-all active:scale-95"
                                                >
                                                    <FiMessageCircle className="text-lg" />
                                                    <span>Message</span>
                                                    <span className="text-[8px] text-gray-400">Send to Friends</span>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Copy Share Link */}
                                <button
                                    onClick={() => handleShare('copy')}
                                    disabled={loading}
                                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-500 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    <FiCopy className="text-sm" />
                                    <span className="text-xs uppercase tracking-wider">Copy Share Link</span>
                                </button>
                            </div>

                            {/* Generate Ticket Button */}
                            {allEligible ? (
                                <button
                                    onClick={handleGenerateTicket}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-yellow-400/30 flex items-center justify-center gap-2"
                                >
                                    {loading ? <FiLoader className="animate-spin" /> : <FiGift />}
                                    {loading ? 'Generating...' : 'Generate Entry Ticket'}
                                </button>
                            ) : (
                                <div className="text-center py-4 bg-gray-50 rounded-2xl">
                                    <p className="text-sm text-gray-500">Complete all shares to generate your ticket</p>
                                </div>
                            )}

                            {/* Info */}
                            <p className="text-center text-[10px] text-gray-400 mt-4">
                                Links must be opened by unique users (different IPs) to count
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const StepItem = ({ icon, label, subLabel, done, loading, onShare, isExpanded = false }) => (
    <div className={`flex items-center p-4 rounded-xl border transition-all ${done ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-gray-50'} ${isExpanded ? 'border-b-0 rounded-b-none' : ''}`}>
        <div className="mr-4">{icon}</div>
        <div className="flex-1">
            <div className={`font-bold text-sm ${done ? 'text-gray-900' : 'text-gray-500'}`}>{label}</div>
            <div className="text-[10px] text-gray-400">{subLabel}</div>
        </div>
        {done ? (
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <FiCheckCircle className="text-white" />
            </div>
        ) : (
            <button
                onClick={onShare}
                disabled={loading}
                className={`px-4 py-2 text-white text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-all ${isExpanded ? 'bg-gray-600' : 'bg-black'}`}
            >
                {loading ? <FiLoader className="animate-spin" /> : <FiExternalLink />}
                {loading ? '...' : isExpanded ? 'Close' : 'Share'}
            </button>
        )}
    </div>
);

export default MegaRewardSheet;
