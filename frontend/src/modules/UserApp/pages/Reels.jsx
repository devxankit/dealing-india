import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { FiHeart, FiMessageCircle, FiSend, FiArrowLeft, FiGift, FiShoppingBag, FiMoreVertical, FiVideo } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { getActiveReels } from "../../../shared/utils/reelHelpers";
import toast from "react-hot-toast";
import MobileLayout from "../components/Layout/MobileLayout";
import useMobileHeaderHeight from "../hooks/useMobileHeaderHeight";

const MobileReels = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRefs = useRef([]);
  const containerRef = useRef(null);
  const headerHeight = useMobileHeaderHeight();

  // Load reels data
  useEffect(() => {
    const type = searchParams.get("type");
    let loadedReels = [];

    if (type === "promotional") {
      const promoReels = localStorage.getItem("promotional_reels");
      if (promoReels) {
        loadedReels = JSON.parse(promoReels);
      }
    } else {
      loadedReels = getActiveReels();
    }

    // Fallback if no reels found
    if (loadedReels.length === 0 && type !== "promotional") {
      // Mock data if empty
      loadedReels = [
        {
          id: 101,
          videoUrl: "https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4",
          productName: "Summer Vibes",
          description: "Enjoy the summer with our new collection!",
          likes: 120,
          comments: 45,
          shares: 12,
          status: 'active'
        }
      ];
    }

    // Check for specific reel query param
    const reelId = searchParams.get("reel");
    if (reelId) {
      const foundIndex = loadedReels.findIndex(r => r.id === parseInt(reelId));
      if (foundIndex !== -1) {
        setCurrentIndex(foundIndex);
      }
    }

    setReels(loadedReels);
  }, [searchParams]);

  // Handle Play/Pause on visibility change
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.currentTime = 0;
          video.play().catch(e => console.log("Autoplay prevented", e));
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, reels]);

  const handleScroll = (e) => {
    const container = e.target;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (currentIndex !== index) {
      setCurrentIndex(index);
    }
  };

  const handleLike = (id) => {
    toast.success("Liked!");
    // Logic to update like count in storage would go here
  };

  const handleShare = (reel) => {
    if (navigator.share) {
      navigator.share({
        title: reel.productName || reel.title,
        text: reel.description,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
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
    <div className="fixed inset-0 bg-black z-50">
      {/* Top Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-12 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={() => navigate(-1)} className="text-white p-2">
          <FiArrowLeft className="text-2xl" />
        </button>
        <span className="text-white font-bold tracking-wide">Reels</span>
        <div className="w-8"></div> {/* Spacer */}
      </div>

      {/* Vertical Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {reels.map((reel, index) => (
          <div key={reel.id} className="h-full w-full snap-start relative bg-gray-900 flex items-center justify-center">
            {/* Video Player */}
            <video
              ref={el => videoRefs.current[index] = el}
              src={reel.videoUrl}
              className="h-full w-full object-cover"
              loop
              muted={false}
              playsInline
              onClick={(e) => e.target.paused ? e.target.play() : e.target.pause()}
            />

            {/* Overlay Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
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
                  <button onClick={() => handleLike(reel.id)} className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md group-active:scale-90 transition-transform">
                      <FiHeart className="text-2xl text-white" />
                    </div>
                    <span className="text-white text-xs font-medium">{reel.likes}</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md">
                      <FiMessageCircle className="text-2xl text-white" />
                    </div>
                    <span className="text-white text-xs font-medium">{reel.comments}</span>
                  </button>

                  <button onClick={() => handleShare(reel)} className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md">
                      <FiSend className="text-2xl text-white transform -rotate-45 translate-x-1" />
                    </div>
                    <span className="text-white text-xs font-medium">Share</span>
                  </button>

                  {/* Mega Reward Promo Button */}
                  {reel.isPromotional && (
                    <button className="flex flex-col items-center gap-1 animate-pulse">
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
    </div>
  );
};



export default MobileReels;
