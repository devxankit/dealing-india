import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiShare2, FiLoader, FiGift, FiExternalLink } from 'react-icons/fi';
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

    const handleShare = async (platform) => {
        if (!reelId) {
            toast.error('No reel selected');
            return;
        }

        console.log('[MegaRewardSheet] Starting share process:', {
            reelId,
            platform,
            timestamp: new Date().toISOString()
        });

        setSharingPlatform(platform);
        setLoading(true);

        try {
            // Generate share link from backend
            console.log('[MegaRewardSheet] Requesting share link from backend...');
            const response = await api.post('/user/mega-reward/share-link', {
                reelId,
                platform
            });

            console.log('[MegaRewardSheet] Share link response:', {
                success: response.success,
                hasData: !!response.data,
                linkCode: response.data?.linkCode?.substring(0, 20) + '...'
            });

            if (response.success && response.data) {
                const { shareUrl } = response.data;
                const shareMessage = `Check out this amazing reel! 🎬 ${reelTitle || 'Watch Now'}`;

                console.log('[MegaRewardSheet] Share URL generated:', shareUrl);

                // Prepare share data for Web Share API
                const shareData = {
                    title: reelTitle || 'Mega Reward Reel',
                    text: shareMessage,
                    url: shareUrl
                };

                // Try Web Share API first (native OS share sheet)
                // This provides the best experience on mobile - opens native share picker
                if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                    try {
                        console.log('[MegaRewardSheet] Using Web Share API');
                        await navigator.share(shareData);
                        toast.success('Shared successfully!');
                        // Refresh status after share
                        setTimeout(() => fetchStatus(), 2000);
                        return;
                    } catch (err) {
                        if (err.name === 'AbortError') {
                            // User cancelled the share - don't fall through
                            console.log('[MegaRewardSheet] User cancelled share');
                            return;
                        }
                        // Web Share failed, fall through to platform-specific fallback
                        console.log('[MegaRewardSheet] Web Share failed, using fallback:', err.message);
                    }
                }

                // Fallback to platform-specific sharing
                let shareLink = '';

                switch (platform) {
                    case 'whatsapp':
                        // Use wa.me for a cleaner sharing experience
                        shareLink = `https://wa.me/?text=${encodeURIComponent(shareMessage + '\n\n' + shareUrl)}`;
                        console.log('[MegaRewardSheet] Opening WhatsApp...');
                        window.open(shareLink, '_blank');
                        break;

                    case 'instagram':
                        // Copy link to clipboard first
                        await navigator.clipboard.writeText(shareMessage + '\n\n' + shareUrl);
                        toast.success('Link copied! Paste it in your Instagram Story or DM');
                        console.log('[MegaRewardSheet] Opening Instagram...');

                        // Try to open Instagram app via URL scheme
                        // This works on mobile when the app is installed
                        const instagramAppUrl = 'instagram://camera';
                        const instagramWebUrl = 'https://www.instagram.com/';

                        // Try app first, fallback to web
                        const instagramOpened = window.open(instagramAppUrl, '_self');
                        setTimeout(() => {
                            // If app didn't open (still on same page), open web
                            window.open(instagramWebUrl, '_blank');
                        }, 1000);
                        break;

                    case 'facebook':
                        // Try Facebook app URL scheme first (mobile)
                        const fbAppUrl = `fb://share?link=${encodeURIComponent(shareUrl)}`;
                        const fbWebUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

                        console.log('[MegaRewardSheet] Opening Facebook...');

                        // On mobile, try app first
                        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                            window.location.href = fbAppUrl;
                            // Fallback to web after a short delay
                            setTimeout(() => {
                                window.open(fbWebUrl, '_blank');
                            }, 1000);
                        } else {
                            // Desktop: Open web share dialog directly
                            window.open(fbWebUrl, '_blank');
                        }
                        break;
                }

                toast.success(`Opening ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`);

                // Refresh status after share
                setTimeout(() => fetchStatus(), 2000);
            }
        } catch (error) {
            console.error('[MegaRewardSheet] Share error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
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

                                <StepItem
                                    icon={<FaWhatsapp className="text-green-600 text-xl" />}
                                    label="WhatsApp"
                                    subLabel={`${stats.whatsapp?.clicks || 0}/${stats.whatsapp?.required || 5} unique opens`}
                                    done={eligibility?.eligibility?.whatsapp}
                                    loading={sharingPlatform === 'whatsapp'}
                                    onShare={() => handleShare('whatsapp')}
                                />

                                <StepItem
                                    icon={<FaInstagram className="text-pink-600 text-xl" />}
                                    label="Instagram"
                                    subLabel={`${stats.instagram?.clicks || 0}/${stats.instagram?.required || 1} unique opens`}
                                    done={eligibility?.eligibility?.instagram}
                                    loading={sharingPlatform === 'instagram'}
                                    onShare={() => handleShare('instagram')}
                                />

                                <StepItem
                                    icon={<FaFacebook className="text-blue-600 text-xl" />}
                                    label="Facebook"
                                    subLabel={`${stats.facebook?.clicks || 0}/${stats.facebook?.required || 1} unique opens`}
                                    done={eligibility?.eligibility?.facebook}
                                    loading={sharingPlatform === 'facebook'}
                                    onShare={() => handleShare('facebook')}
                                />
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

const StepItem = ({ icon, label, subLabel, done, loading, onShare }) => (
    <div className={`flex items-center p-4 rounded-xl border ${done ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
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
                className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-50"
            >
                {loading ? <FiLoader className="animate-spin" /> : <FiExternalLink />}
                {loading ? '...' : 'Share'}
            </button>
        )}
    </div>
);

export default MegaRewardSheet;
