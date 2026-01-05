import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { FiHeart, FiMessageCircle, FiSend, FiArrowLeft, FiGift, FiShoppingBag, FiMoreVertical, FiVideo, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import MobileLayout from "../components/Layout/MobileLayout";
import useMobileHeaderHeight from "../hooks/useMobileHeaderHeight";
import MegaRewardSheet from "../components/MegaRewardSheet";

const MobileReels = ({ isEmbedded = false, defaultType = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showMuteIcon, setShowMuteIcon] = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [videoStatus, setVideoStatus] = useState({}); // { [id]: { loading: boolean, error: boolean } }

  // New State for Interactions
  const [likedReels, setLikedReels] = useState({}); // { [id]: boolean }
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const videoRefs = useRef([]);
  const containerRef = useRef(null);
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);
  const muteIconTimeout = useRef(null);
  const headerHeight = useMobileHeaderHeight();

  // Load reels data from backend API
  useEffect(() => {
    const loadReels = async () => {
      const type = defaultType || searchParams.get("type");
      let loadedReels = [];

      if (type === "promotional") {
        // Promotional reels from localStorage (admin-created)
        const promoReels = localStorage.getItem("promotional_reels");
        if (promoReels) {
          loadedReels = JSON.parse(promoReels);
        }
      } else {
        // Fetch active reels from backend API
        try {
          const response = await api.get('/user/reels', {
            params: {
              page: 1,
              limit: 50, // Load more reels for smooth scrolling
              sortBy: 'createdAt',
              sortOrder: 'desc'
            }
          });

          if (response?.success && response?.data?.reels) {
            loadedReels = response.data.reels.map(reel => ({
              ...reel,
              id: reel._id || reel.id, // Ensure id field exists
            }));
          }
        } catch (error) {
          console.error('Error loading reels:', error);
          toast.error('Failed to load reels');
          loadedReels = [];
        }
      }

      // Check for specific reel query param
      const reelId = searchParams.get("reel");
      if (reelId && loadedReels.length > 0) {
        const foundIndex = loadedReels.findIndex(r => 
          (r._id || r.id)?.toString() === reelId.toString()
        );
        if (foundIndex !== -1) {
          setCurrentIndex(foundIndex);
        }
      }

      setReels(loadedReels);
    };

    loadReels();
  }, [searchParams, defaultType]);

  // Handle Play/Pause on visibility change
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          // Reset and play current video
          video.currentTime = 0;
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              if (e.name !== 'AbortError') {
                console.error("Video playback error:", e);
              }
            });
          }
        } else {
          // Pause others
          video.pause();
        }
      }
    });
  }, [currentIndex, reels]);

  const handleScroll = (e) => {
    const container = e.target;
    // Check if we are near a snap point
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (currentIndex !== index) {
      setCurrentIndex(index);
      // Reset heart animation when scrolling
      setShowHeartAnimation(false);
    }
  };

  const handleLike = (reel) => {
    const reelId = reel._id || reel.id;
    setLikedReels(prev => {
      const isLiked = !prev[reelId];
      if (isLiked) {
        // Show animation only on like
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 1200);
      }
      return { ...prev, [reelId]: isLiked };
    });
  };

  const handleShare = (reel) => {
    // Increment share count for Mega Reward
    const currentShares = parseInt(localStorage.getItem('mega_reward_shares') || '0');
    localStorage.setItem('mega_reward_shares', (currentShares + 1).toString());

    if (navigator.share) {
      navigator.share({
        title: reel.productName || reel.title,
        text: reel.description,
        url: window.location.href
      }).then(() => {
        toast.success("Shared successfully! +1 Step for Mega Reward 🎁");
      }).catch((e) => {
        console.error(e);
        // Even if cancelled, we counted the 'attempt' or click for simplicity in web context
        // But optimally we waiting for .then. 
        // For now, let's keep the count consistent with the click action.
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied! +1 Step for Mega Reward 🎁");
    }
  };

  if (reels.length === 0) {
    return (
      <MobileLayout showBottomNav={true} showCartBar={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FiVideo className="text-2xl text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No Reels Available</h3>
          <p className="text-gray-500 mt-2">Check back later for exciting video content!</p>
          <button
            onClick={() => navigate('/app')}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full font-medium"
          >
            Back to Home
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className={isEmbedded ? "relative w-full h-full bg-black rounded-xl overflow-hidden" : "fixed inset-0 bg-black z-50"}>
      {/* Top Header Overlay */}
      {!isEmbedded && (
        <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={() => navigate(-1)} className="text-white p-2">
            <FiArrowLeft className="text-2xl" />
          </button>
          <span className="text-white font-bold tracking-wide">Reels</span>
          <div className="w-8"></div> {/* Spacer */}
        </div>
      )}

      {/* Vertical Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {reels.map((reel, index) => (
          <div key={reel._id || reel.id} className="h-full w-full snap-start snap-always relative bg-gray-900 flex items-center justify-center">
            {/* Video Player */}
            <video
              ref={el => videoRefs.current[index] = el}
              src={Math.abs(index - currentIndex) <= 1 ? reel.videoUrl : ""}
              poster={reel.thumbnail}
              className={`h-full w-full object-cover transition-opacity duration-300 ${videoStatus[reel.id]?.loading ? 'opacity-50' : 'opacity-100'}`}
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
              onLoadStart={() => {
                const reelId = reel._id || reel.id;
                setVideoStatus(prev => ({ ...prev, [reelId]: { ...prev[reelId], loading: true, error: false } }));
              }}
              onCanPlay={() => {
                const reelId = reel._id || reel.id;
                setVideoStatus(prev => ({ ...prev, [reelId]: { ...prev[reelId], loading: false } }));
              }}
              onEnded={(e) => {
                e.target.currentTime = 0;
                e.target.play().catch(() => {});
              }}
              onError={(e) => {
                const video = e.target;
                const src = video.getAttribute('src');
                
                // If src attribute is missing, empty, or hasn't been set yet, ignore the error
                if (!src || src === "" || src === "undefined") return;
                
                // Check if it's a real error
                const error = video.error;
                if (error) {
                  // Ignore "Empty src attribute" or similar errors that occur during lazy loading transitions
                  if (error.code === 4 && (!video.src || video.src === window.location.href || video.src === window.location.origin + '/')) {
                    return;
                  }

                  const reelId = reel._id || reel.id;
                  console.error(`Video Error (ID: ${reelId}):`, {
                    code: error.code,
                    message: error.message,
                    src: video.src
                  });
                  setVideoStatus(prev => ({ ...prev, [reelId]: { loading: false, error: true } }));
                }
              }}
              onMouseDown={(e) => {
                const video = e.target;
                isLongPress.current = false;
                pressTimer.current = setTimeout(() => {
                  isLongPress.current = true;
                  video.pause();
                }, 200);
              }}
              onMouseUp={(e) => {
                const video = e.target;
                if (pressTimer.current) clearTimeout(pressTimer.current);
                if (isLongPress.current) {
                  video.play();
                }
                setTimeout(() => { isLongPress.current = false; }, 100);
              }}
              onMouseLeave={(e) => {
                const video = e.target;
                if (pressTimer.current) clearTimeout(pressTimer.current);
                if (isLongPress.current) {
                  video.play();
                }
                setTimeout(() => { isLongPress.current = false; }, 100);
              }}
              onTouchStart={(e) => {
                const video = e.target;
                isLongPress.current = false;
                pressTimer.current = setTimeout(() => {
                  isLongPress.current = true;
                  video.pause();
                }, 200);
              }}
              onTouchEnd={(e) => {
                const video = e.target;
                if (pressTimer.current) clearTimeout(pressTimer.current);
                if (isLongPress.current) {
                  video.play();
                }
                setTimeout(() => { isLongPress.current = false; }, 100);
              }}
              onClick={(e) => {
                if (!isLongPress.current) {
                  setIsMuted(prev => !prev);
                  setShowMuteIcon(true);
                  if (muteIconTimeout.current) clearTimeout(muteIconTimeout.current);
                  muteIconTimeout.current = setTimeout(() => setShowMuteIcon(false), 800);
                }
              }}
            />

            {/* Loading Spinner */}
            {videoStatus[reel._id || reel.id]?.loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-10">
                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}

            {/* Error Message */}
            {videoStatus[reel._id || reel.id]?.error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-20 px-6 text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <FiX className="text-3xl text-red-500" />
                </div>
                <h3 className="text-white font-bold mb-2">Failed to Load Video</h3>
                <p className="text-gray-400 text-sm mb-6">Something went wrong while trying to play this reel.</p>
                <button 
                  onClick={() => {
                    const reelId = reel._id || reel.id;
                    setVideoStatus(prev => ({ ...prev, [reelId]: { loading: true, error: false } }));
                    if (videoRefs.current[index]) {
                      videoRefs.current[index].load();
                    }
                  }}
                  className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm"
                >
                  Retry
                </button>
              </div>
            )}

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
                    {isMuted ? (
                      <FiVolumeX className="text-white text-3xl" />
                    ) : (
                      <FiVolume2 className="text-white text-3xl" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Heart Animation Overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
              <AnimatePresence>
                {showHeartAnimation && index === currentIndex && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1.2, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                  >
                    <FiHeart className="text-white text-9xl fill-red-600 text-red-600 drop-shadow-2xl opacity-90" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Overlay Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <div className="flex items-end justify-between">
                <div className="flex-1 mr-12">
                  {/* User/Vendor Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 border border-white">
                      <img src="https://ui-avatars.com/api/?name=Vendor" alt="Vendor" className="w-full h-full rounded-full" />
                    </div>
                    <span className="text-white font-bold text-sm">{reel.vendorName || reel.uploadedBy || "Dealing India"}</span>
                    <button className="text-xs border border-white/50 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">Follow</button>
                  </div>

                  {/* Description */}
                  <h3 className="text-white text-base font-medium mb-1 line-clamp-1">{reel.productName || reel.title}</h3>
                  <p className="text-white/80 text-sm line-clamp-2 mb-2">{reel.description}</p>

                  {/* Product Link Tag */}
                  {(reel.productPrice || reel.price) && (
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg mb-2">
                      <FiShoppingBag className="text-yellow-400 text-xs" />
                      <span className="text-white text-xs font-bold">Shop Now • ₹{reel.productPrice || reel.price}</span>
                    </div>
                  )}
                </div>

                {/* Right Actions Bar */}
                <div className="flex flex-col items-center gap-6">
                  <button onClick={() => handleLike(reel)} className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md group-active:scale-90 transition-transform">
                      <FiHeart
                        className={`text-2xl transition-colors ${likedReels[reel._id || reel.id] ? "text-red-500 fill-red-500" : "text-white"
                          }`}
                      />
                    </div>
                    <span className="text-white text-xs font-medium">{likedReels[reel._id || reel.id] ? (reel.likes + 1) : reel.likes}</span>
                  </button>

                  <button
                    onClick={() => setShowComments(true)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md">
                      <FiMessageCircle className="text-2xl text-white" />
                    </div>
                    <span className="text-white text-xs font-medium">{reel.comments}</span>
                  </button>

                  <button onClick={() => handleShare(reel)} className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md">
                      <FiSend className="text-2xl text-white" />
                    </div>
                    <span className="text-white text-xs font-medium">Share</span>
                  </button>

                  {/* Mega Reward Promo Button */}
                  {reel.isPromotional && (
                    <button onClick={() => setShowRewardPopup(true)} className="flex flex-col items-center gap-1 animate-pulse">
                      <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
                        <FiGift className="text-2xl text-white" />
                      </div>
                      <span className="text-white text-[10px] font-bold">Win Big</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Using MobileLayout context just for bottom nav if needed, but here we want full screen immersive */}
      {/* We can manually render bottom nav if we want it over the video, or just rely on back button */}

      {/* Comment Sheet */}
      <AnimatePresence>
        {showComments && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="absolute inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 h-[60vh] bg-white rounded-t-3xl z-50 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Comments ({reels[currentIndex]?.comments || 0})</h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="text-xl text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Dummy Comments */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                    JS
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">John Smith <span className="text-gray-400 font-normal ml-1">2h ago</span></p>
                    <p className="text-sm text-gray-700">This looks amazing! 🔥 Need to buy this asap.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-xs shrink-0">
                    MD
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Maria D <span className="text-gray-400 font-normal ml-1">5h ago</span></p>
                    <p className="text-sm text-gray-700">Is this available in size M?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs shrink-0">
                    AK
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Arun Kumar <span className="text-gray-400 font-normal ml-1">1d ago</span></p>
                    <p className="text-sm text-gray-700">Great quality products usually from this vendor.</p>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    disabled={!commentText.trim()}
                    onClick={() => {
                      if (commentText.trim()) {
                        toast.success("Comment posted!");
                        setCommentText("");
                      }
                    }}
                    className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md disabled:opacity-50 disabled:shadow-none"
                  >
                    <FiSend className="text-sm transform translate-x-0.5 translate-y-0.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mega Reward Popup Sheet */}
      <MegaRewardSheet
        isOpen={showRewardPopup}
        onClose={() => setShowRewardPopup(false)}
        reel={reels[currentIndex]}
      />
    </div>
  );
};



export default MobileReels;
