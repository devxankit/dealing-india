import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FiHeart, FiMessageCircle, FiSend, FiArrowLeft, FiGift, FiShoppingBag, FiVolume2, FiVolumeX, FiX, FiVideo } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import { formatVideoUrl } from "../../../shared/utils/helpers";
import MegaRewardSheet from "../components/MegaRewardSheet";

const SingleReel = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Check if opened from a share link
    const queryParams = new URLSearchParams(location.search);
    const source = queryParams.get('source');
    const isFromShare = !!source;

    const [reel, setReel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [showMuteIcon, setShowMuteIcon] = useState(false);
    const [showRewardPopup, setShowRewardPopup] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [showHeartAnimation, setShowHeartAnimation] = useState(false);

    const videoRef = useRef(null);
    const muteIconTimeout = useRef(null);

    useEffect(() => {
        const fetchReel = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/public/reels/${id}`);
                if (response?.success && response?.data) {
                    setReel(response.data);
                    // Check if already liked (mock or from server if authenticated)
                    // For now keeping it simple as it's a public view
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Error fetching reel:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchReel();
        }
    }, [id]);

    const handleLike = async () => {
        if (!isLiked) {
            setShowHeartAnimation(true);
            setTimeout(() => setShowHeartAnimation(false), 1200);
        }
        setIsLiked(!isLiked);

        // Update local likes count optimistically
        setReel(prev => ({
            ...prev,
            likes: isLiked ? Math.max(0, (prev.likes || 0) - 1) : (prev.likes || 0) + 1
        }));

        try {
            const endpoint = reel.isPromotional
                ? `/user/promotional-reels/${reel._id}/like`
                : `/user/reels/${reel._id}/like`;
            await api.post(endpoint);
        } catch (err) {
            console.error("Error liking reel:", err);
            // Don't revert for now to keep UI snappy
        }
    };

    const handleShare = () => {
        const shareUrl = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: reel.productName || reel.title,
                text: reel.description,
                url: shareUrl
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareUrl)
                .then(() => toast.success("Link copied!"))
                .catch(() => toast.error("Failed to copy link"));
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        setShowMuteIcon(true);
        if (muteIconTimeout.current) clearTimeout(muteIconTimeout.current);
        muteIconTimeout.current = setTimeout(() => setShowMuteIcon(false), 800);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !reel) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 p-6 text-center">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <FiVideo className="text-3xl text-gray-500" />
                </div>
                <h3 className="text-white text-xl font-bold mb-2">Reel Not Found</h3>
                <p className="text-gray-400 mb-8">The video you're looking for might have been removed or is no longer available.</p>
                <button
                    onClick={() => navigate('/app/reels')}
                    className="px-8 py-3 bg-white text-black rounded-full font-bold transition-transform active:scale-95"
                >
                    Watch Other Reels
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                <button onClick={() => navigate(-1)} className="text-white p-2 bg-black/20 rounded-full backdrop-blur-sm">
                    <FiArrowLeft className="text-2xl" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-white font-bold tracking-wide uppercase text-xs">Reels</span>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Video Player */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-gray-900">
                <video
                    ref={videoRef}
                    src={formatVideoUrl(reel.videoUrl)}
                    className="h-full w-full object-cover"
                    loop
                    muted={isMuted}
                    playsInline
                    autoPlay
                    onClick={toggleMute}
                />

                {/* Mute Indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <AnimatePresence>
                        {showMuteIcon && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="bg-black/50 p-4 rounded-full backdrop-blur-sm"
                            >
                                {isMuted ? <FiVolumeX className="text-white text-3xl" /> : <FiVolume2 className="text-white text-3xl" />}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Heart Animation */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <AnimatePresence>
                        {showHeartAnimation && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1.2 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                            >
                                <FiHeart className="text-red-500 fill-red-500 text-9xl drop-shadow-2xl" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Overlay Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pb-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                    <div className="flex items-end justify-between">
                        <div className="flex-1 mr-12">
                            {/* Vendor Info */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white overflow-hidden">
                                    <img
                                        src={reel.vendorLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(reel.vendorName)}&background=random`}
                                        alt={reel.vendorName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{reel.vendorName}</span>
                            </div>

                            {/* Description */}
                            <h3 className="text-white text-lg font-bold mb-1 drop-shadow-md">{reel.productName || reel.title}</h3>
                            <p className="text-white/90 text-sm line-clamp-3 mb-4 drop-shadow-md">{reel.description}</p>

                            {/* Product Link */}
                            {reel.productId && (
                                <button
                                    onClick={() => navigate(`/app/product/${reel.productId._id || reel.productId}`)}
                                    className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl mb-4 shadow-lg active:scale-95 transition-transform"
                                >
                                    <FiShoppingBag className="text-black" />
                                    <span className="text-black text-sm font-bold">Shop Now • ₹{reel.productPrice}</span>
                                </button>
                            )}

                            {/* Watch More Button - Hidden if from share */}
                            {!isFromShare && (
                                <button
                                    onClick={() => navigate('/app/reels')}
                                    className="flex items-center gap-2 text-white/70 text-sm font-medium hover:text-white transition-colors"
                                >
                                    <FiVideo />
                                    <span>Watch More Reels</span>
                                </button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-center gap-6">
                            <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                                <div className="p-3.5 rounded-full bg-white/10 backdrop-blur-md group-active:scale-90 transition-transform">
                                    <FiHeart className={`text-2xl ${isLiked ? "text-red-500 fill-red-500" : "text-white"}`} />
                                </div>
                                <span className="text-white text-xs font-bold drop-shadow-md">{reel.likes || 0}</span>
                            </button>

                            <button className="flex flex-col items-center gap-1">
                                <div className="p-3.5 rounded-full bg-white/10 backdrop-blur-md">
                                    <FiMessageCircle className="text-2xl text-white" />
                                </div>
                                <span className="text-white text-xs font-bold drop-shadow-md">{reel.comments || 0}</span>
                            </button>

                            {!isFromShare && (
                                <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                                    <div className="p-3.5 rounded-full bg-white/10 backdrop-blur-md group-active:scale-90 transition-transform">
                                        <FiSend className="text-2xl text-white" />
                                    </div>
                                    <span className="text-white text-xs font-bold drop-shadow-md">Share</span>
                                </button>
                            )}

                            {reel.isPromotional && (
                                <button onClick={() => setShowRewardPopup(true)} className="flex flex-col items-center gap-1 animate-bounce">
                                    <div className="p-3.5 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl shadow-yellow-500/30">
                                        <FiGift className="text-2xl text-white" />
                                    </div>
                                    <span className="text-white text-[10px] font-black uppercase tracking-tighter">Mega Reward</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mega Reward Sheet */}
            {reel.isPromotional && (
                <MegaRewardSheet
                    isOpen={showRewardPopup}
                    onClose={() => setShowRewardPopup(false)}
                    reelId={reel._id}
                    reelTitle={reel.title}
                />
            )}
        </div>
    );
};

export default SingleReel;
