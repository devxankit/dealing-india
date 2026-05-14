import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiHeart, FiVideo, FiShare2, FiEye, FiCopy, FiX, FiFilter, FiChevronDown, FiVolume2, FiVolumeX, FiFlag, FiPlay, FiPause, FiSkipBack, FiSkipForward } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import { useAuthStore } from "../../../shared/store/authStore";
import { useB2BCategoryStore } from "../../../shared/store/b2bCategoryStore";
import { getWhatsAppUserDetailsSuffix } from "../../../shared/utils/helpers";
import { handleShare } from "../../../shared/utils/share";

export default function ReelFeed() {
  const navigate = useNavigate();
  const { reelId: reelIdFromUrl } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const { categories: allCategories, initialize: fetchB2BCategories } = useB2BCategoryStore();
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const isShowingGeneralFeed = useRef(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [initialMetadata, setInitialMetadata] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytApiLoadedRef = useRef(false);

  // Debounce category search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearch(categorySearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [categorySearch]);

  // Handle URL category changes
  useEffect(() => {
    const cat = searchParams.get("category") || "";
    if (cat !== activeCategory) {
      setActiveCategory(cat);
    }
  }, [searchParams, activeCategory]);

  const viewedRef = useRef(new Set());
  const wheelLockRef = useRef(false);
  const touchStartYRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const hasAppliedInitialReelRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);

  const fetchFeed = useCallback(async (pageNum = 1, append = false, pageToken = null, forceCategory = null) => {
    try {
      if (!append) setLoading(true);
      if (append) loadingMoreRef.current = true;

      const currentCat = forceCategory !== null ? forceCategory : activeCategory;
      const params = new URLSearchParams({ limit: "10" });

      if (currentCat && !isShowingGeneralFeed.current) {
        params.set("category", currentCat);
      }

      if (pageToken) params.set("pageToken", pageToken);
      else params.set("page", String(pageNum));

      const res = await api.get(`/reels/feed?${params.toString()}`);

      if (res.success && res.data?.reels) {
        const newReels = res.data.reels;
        const pagination = res.pagination || {};
        const token = pagination.nextPageToken;
        const pages = pagination.pages ?? null;
        const currentPage = pagination.page ?? pageNum;

        if (append) {
          setReels((prev) => (newReels.length ? [...prev, ...newReels] : prev));
        } else {
          setReels(newReels);
          // If reelIdFromUrl is in the new batch, jump to it immediately
          const foundIdx = reelIdFromUrl ? newReels.findIndex(r => r._id === reelIdFromUrl) : -1;
          if (foundIdx >= 0) {
            setCurrentIndex(foundIdx);
            hasAppliedInitialReelRef.current = true;
          } else {
            setCurrentIndex(0);
          }
          setNextPageToken(null);
        }

        let stillHasMore = false;
        if (token != null) {
          setNextPageToken(token);
          stillHasMore = !!token;
        } else if (pages != null) {
          stillHasMore = currentPage < pages;
        } else {
          stillHasMore = newReels.length > 0;
        }

        if (!stillHasMore && currentCat && !isShowingGeneralFeed.current) {
          isShowingGeneralFeed.current = true;
          // Load general feed immediately to provide seamless experience
          const generalRes = await api.get(`/reels/feed?limit=10&page=1`);
          if (generalRes.success && generalRes.data?.reels) {
            setReels(prev => [...prev, ...generalRes.data.reels]);
            const genPagination = generalRes.pagination || {};
            setNextPageToken(genPagination.nextPageToken || null);
            setHasMore(genPagination.nextPageToken ? true : (generalRes.data.reels.length > 0));
            setPage(1);
          }
        } else {
          setHasMore(stillHasMore);
        }
      } else if (!append) {
        setReels([]);
        setHasMore(false);
        setNextPageToken(null);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load reels");
      if (!append) {
        setReels([]);
        setHasMore(false);
        setNextPageToken(null);
      }
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  }, [activeCategory, reelIdFromUrl]);

  // Priority fetch for deep-linked reel metadata to show thumbnail immediately
  useEffect(() => {
    if (reelIdFromUrl && !reels.some(r => r._id === reelIdFromUrl)) {
      setMetadataLoading(true);
      api.get(`/reels/${reelIdFromUrl}`)
        .then(res => {
          if (res.success && res.data?.reel) {
            setInitialMetadata(res.data.reel);
          }
        })
        .finally(() => setMetadataLoading(false));
    }
  }, [reelIdFromUrl, reels.length === 0]); // Only if we don't have it yet

  const playlistCategories = useMemo(() => {
    const subs = allCategories.flatMap((cat) => cat.subcategories || []);
    const names = subs
      .map((s) => (typeof s === "string" ? s : s?.name))
      .filter(Boolean);

    const extra = ["Flat Properties", "Villa / Row house Properties", "Commercial Properties"];
    const merged = [...names, ...extra];

    const unique = Array.from(
      new Map(
        merged
          .map((name) => (name || "").trim())
          .filter(Boolean)
          .map((name) => [name.toLowerCase(), name])
      ).values()
    );

    const sorted = unique.sort((a, b) => a.localeCompare(b));

    if (!debouncedCategorySearch) return sorted;
    const q = debouncedCategorySearch.toLowerCase();
    return sorted.filter(name => name.toLowerCase().includes(q));
  }, [allCategories, debouncedCategorySearch]);

  useEffect(() => {
    fetchB2BCategories();
  }, [fetchB2BCategories]);

  useEffect(() => {
    hasAppliedInitialReelRef.current = false;
    isShowingGeneralFeed.current = false;
    fetchFeed(1, false, null, activeCategory);
  }, [activeCategory, fetchFeed]);

  // Update URL as user scrolls to keep current reel reflected in the address bar
  useEffect(() => {
    // Only update URL if we've successfully settled on the initial shared reel (if any)
    if (reelIdFromUrl && !hasAppliedInitialReelRef.current) return;

    if (reels.length > 0 && reels[currentIndex]?._id) {
      const currentId = reels[currentIndex]._id;
      setIsPlaying(true); // Reset play state for new reel
      if (currentId !== reelIdFromUrl) {
        const search = searchParams.toString();
        // Use replace: true so that we don't pollute the history stack with every scroll
        navigate(`/b2b/reels/${currentId}${search ? `?${search}` : ""}`, { replace: true });
      }
    }
  }, [currentIndex, reels, navigate, reelIdFromUrl, searchParams]);

  /* When opened via shared link /b2b/reels/:reelId – show that reel */
  useEffect(() => {
    if (loading || hasAppliedInitialReelRef.current) return;

    if (!reelIdFromUrl) {
      hasAppliedInitialReelRef.current = true;
      return;
    }

    const idx = reels.findIndex((r) => r._id === reelIdFromUrl);
    if (idx >= 0) {
      setCurrentIndex(idx);
      hasAppliedInitialReelRef.current = true;
      return;
    }

    // If not found in current batch, fetch and prepend it
    hasAppliedInitialReelRef.current = true;
    api
      .get(`/reels/${reelIdFromUrl}`)
      .then((res) => {
        if (res.success && res.data?.reel) {
          const single = res.data.reel;
          setReels((prev) =>
            prev.some(r => r._id === single._id) ? prev : [single, ...prev]
          );
          setCurrentIndex(0);
        }
      })
      .catch((err) => console.error("Error fetching shared reel:", err));
  }, [loading, reelIdFromUrl, reels]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore) return;
    if (nextPageToken) {
      fetchFeed(page, true, nextPageToken);
    } else {
      const nextPage = page + 1;
      fetchFeed(nextPage, true);
      setPage(nextPage);
    }
  }, [fetchFeed, page, hasMore, nextPageToken]);

  const currentReel = reels[currentIndex];
  const hasNext = currentIndex < reels.length - 1;
  const hasPrev = currentIndex > 0;

  useEffect(() => {
    if (!currentReel?._id) return;
    if (viewedRef.current.has(currentReel._id)) return;
    viewedRef.current.add(currentReel._id);
    api.post(`/reels/${currentReel._id}/view`).catch(() => { });
  }, [currentReel]);

  // Use a ref to store current state for the stable event listener
  const stateRef = useRef({ hasNext, hasPrev, hasMore, currentIndex, reelsCount: reels.length });
  useEffect(() => {
    stateRef.current = { hasNext, hasPrev, hasMore, currentIndex, reelsCount: reels.length };
  }, [hasNext, hasPrev, hasMore, currentIndex, reels.length]);

  const handleWheel = useCallback(
    (e) => {
      if (wheelLockRef.current) return;

      const { hasNext: canNext, hasPrev: canPrev, hasMore: moreAvailable } = stateRef.current;

      if (e.deltaY > 0) {
        if (canNext) {
          wheelLockRef.current = true;
          setCurrentIndex((i) => i + 1);
          setTimeout(() => { wheelLockRef.current = false; }, 500);
        } else if (moreAvailable) {
          wheelLockRef.current = true;
          loadMore();
          setTimeout(() => { wheelLockRef.current = false; }, 800);
        }
      } else if (e.deltaY < 0 && canPrev) {
        wheelLockRef.current = true;
        setCurrentIndex((i) => i - 1);
        setTimeout(() => { wheelLockRef.current = false; }, 500);
      }
    },
    [loadMore]
  );

  useEffect(() => {
    const wheelListener = (e) => handleWheel(e);
    window.addEventListener("wheel", wheelListener, { passive: true });
    return () => window.removeEventListener("wheel", wheelListener);
  }, [handleWheel]);

  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartYRef.current) return;
    const diff = touchStartYRef.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) < 40) return;
    if (diff > 0) {
      if (hasNext) setCurrentIndex((i) => i + 1);
      else if (hasMore) loadMore();
    } else if (diff < 0 && hasPrev) {
      setCurrentIndex((i) => i - 1);
    }
    touchStartYRef.current = null;
  };

  const toggleLike = async (reel) => {
    try {
      if (reel.userLiked) {
        await api.delete(`/reels/${reel._id}/like`);
        setReels((prev) =>
          prev.map((r) =>
            r._id === reel._id
              ? { ...r, userLiked: false, likeCount: r.likeCount - 1 }
              : r
          )
        );
      } else {
        await api.post(`/reels/${reel._id}/like`);
        setReels((prev) =>
          prev.map((r) =>
            r._id === reel._id
              ? { ...r, userLiked: true, likeCount: r.likeCount + 1 }
              : r
          )
        );
      }
    } catch {
      toast.error("Like failed");
    }
  };

  const getShareUrl = useCallback(() => {
    if (!currentReel) return "";
    const apiBase = api.defaults.baseURL;
    const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    return `${baseUrl}/api/reels/share/${currentReel._id}`;
  }, [currentReel]);

  const getResourceTypeText = () => {
    if (!currentReel || !currentReel.categoryName) return "reel";
    const cat = currentReel.categoryName.toLowerCase();
    const propertyKeywords = ["flat", "row house", "villa", "commercial", "shop", "office", "showroom", "godown", "factory", "plot", "building", "real estate", "property"];
    if (propertyKeywords.some(keyword => cat.includes(keyword))) {
      return "property";
    }
    return "product";
  }

  const getDisplayType = () => {
    const type = getResourceTypeText();
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  const getReelYoutubeId = (reel) => {
    if (!reel) return null;
    if (reel.youtubeVideoId) return reel.youtubeVideoId;
    if (reel.reelType === 'link' && reel.externalLinkType === 'youtube') {
      const url = reel.videoUrl;
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|embed\/|shorts\/))([^&?\/ ]{11})/);
      return match ? match[1] : null;
    }
    return null;
  };

  const handleShareClick = async () => {
    if (!currentReel) return;
    const url = getShareUrl();
    const typeText = getDisplayType();
    
    await handleShare({
      title: currentReel?.title || typeText,
      text: currentReel?.description || `Check out this ${typeText.toLowerCase()} on Dealing India`,
      url: url
    });
  };

  const trackContactClick = async (type) => {
    try {
      const vendorId = currentReel?.vendorId;
      if (!vendorId) return;
      await api.post("/vendor/analytics/track-click", {
        vendorId,
        clickType: type,
        itemType: "reel",
        itemId: currentReel._id,
        category: currentReel.categoryName
      });
    } catch (err) {
      console.error("Error tracking reel click:", err);
    }
  };

  const handleWhatsApp = () => {
    if (!currentReel?.vendorPhone) return;
    trackContactClick("whatsapp");
    const phone = currentReel.vendorPhone.replace(/\D/g, "");
    const formatted = phone.startsWith("91") ? phone : `91${phone}`;
    const siteUrl = getShareUrl();
    const typeText = getResourceTypeText();
    const lines = [
      `🎥 I'm interested in your ${typeText}`,
      currentReel?.title ? `${typeText.charAt(0).toUpperCase() + typeText.slice(1)}: ${currentReel.title}` : null,
      "",
      siteUrl ? `Dealing India link: ${siteUrl}` : null,
    ].filter(Boolean);
    const userDetails = getWhatsAppUserDetailsSuffix(user);
    const msg = encodeURIComponent(`${lines.join("\n")}${userDetails ? `\n${userDetails}` : ""}`);
    window.open(`https://api.whatsapp.com/send?phone=${formatted}&text=${msg}`, "_blank");
  };

  const isYoutubeRef = useRef(false);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(tag, firstScript);
  }, []);

  // Initialize YouTube player when youtube ID changes
  const currentYoutubeId = getReelYoutubeId(currentReel || initialMetadata);
  useEffect(() => {
    if (!currentYoutubeId) return;
    isYoutubeRef.current = false;
    ytApiLoadedRef.current = false;

    const checkYT = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkYT);

        // Destroy old player if exists
        if (ytPlayerRef.current) {
          ytPlayerRef.current.destroy();
          ytPlayerRef.current = null;
        }

        const container = document.getElementById('youtube-player-container');
        if (container) {
          container.innerHTML = '';
          isYoutubeRef.current = true;
          ytPlayerRef.current = new window.YT.Player(container, {
            videoId: currentYoutubeId,
            playerVars: {
              autoplay: 1,
              mute: isMuted ? 1 : 0,
              loop: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              rel: 0,
              modestbranding: 1,
              iv_load_policy: 3,
              showinfo: 0,
              playlist: currentYoutubeId,
            },
            events: {
              onReady: () => {
                setIsBuffering(false);
                // Auto-play when ready
                if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
                  ytPlayerRef.current.playVideo();
                }
              },
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                  setIsBuffering(false);
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  setIsPlaying(false);
                } else if (event.data === window.YT.PlayerState.BUFFERING) {
                  setIsBuffering(true);
                }
              }
            }
          });
        }
      }
    }, 100);

    return () => clearInterval(checkYT);
  }, [currentYoutubeId, isMuted]);

  const togglePlay = useCallback(() => {
    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);

    // Handle native video element
    if (videoRef.current && !isYoutubeRef.current) {
      if (newPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }

    // Handle YouTube player via API - Added safety checks for methods
    if (ytPlayerRef.current && isYoutubeRef.current) {
      try {
        if (newPlaying) {
          if (typeof ytPlayerRef.current.playVideo === 'function') {
            ytPlayerRef.current.playVideo();
          }
        } else {
          if (typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          }
        }
      } catch (err) {
        console.warn("YouTube player error:", err);
      }
    }
  }, [isPlaying]);

  const handleSkip = useCallback((direction) => {
    if (direction === 'next') {
      if (hasNext) setCurrentIndex(i => i + 1);
      else if (hasMore) loadMore();
    } else {
      if (hasPrev) setCurrentIndex(i => i - 1);
    }
    setIsPlaying(true);
  }, [hasNext, hasPrev, hasMore, loadMore]);

  const submitReport = async () => {
    if (!reportReason) return;
    setIsReporting(true);
    try {
      const res = await api.post(`/reels/${currentReel._id}/report`, {
        reason: reportReason,
        comment: reportComment
      });
      if (res.success) {
        toast.success("Thank you for your report. We will review it shortly.");
        setShowReportModal(false);
        setReportReason("");
        setReportComment("");
      }
    } catch (err) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  };

  // Smooth Loading Render Strategy:
  // Instead of early return, we render the full layout. 
  // If we have no reels yet, the AnimatePresence will simply be empty or show a placeholder.
  const showInitialLoader = loading && reels.length === 0 && !initialMetadata;

  return (
    <div
      className="h-[100dvh] w-full bg-black relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {showInitialLoader && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-4 text-center p-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Initializing Feed</p>
        </div>
      )}

      {/* Background Video Layer - Starts below status bar */}
      <div className="absolute inset-x-0 bottom-0 top-[env(safe-area-inset-top)] z-0 bg-black">
        <AnimatePresence>
          {(currentReel || initialMetadata) && (
            <motion.div
              key={currentReel?._id || "initial"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <div className="h-full w-full flex items-center justify-center bg-black relative">
                {/* Immediate Feedback Thumbnail layer - stays visible until video is ready */}
                <div className={`absolute inset-0 z-20 transition-opacity duration-500 ${(isBuffering || loading) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <img
                    src={getReelYoutubeId(currentReel || initialMetadata) 
                      ? `https://img.youtube.com/vi/${getReelYoutubeId(currentReel || initialMetadata)}/maxresdefault.jpg` 
                      : ((currentReel || initialMetadata)?.thumbnailUrl || "/placeholder-reel.jpg")
                    }
                    className="w-full h-full object-cover blur-sm brightness-50"
                    alt=""
                  />
                  {(isBuffering || loading) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {getReelYoutubeId(currentReel || initialMetadata) ? (
                  <div className="w-full h-full relative z-10 bg-transparent">
                    <div id="youtube-player-container" className="w-full h-full" />
                  </div>
                ) : (
                  <>
                    {(() => { isYoutubeRef.current = false; })()}
                    {(currentReel || initialMetadata)?.videoUrl && (
                      <video
                        ref={videoRef}
                        src={(currentReel || initialMetadata).videoUrl}
                        poster={(currentReel || initialMetadata).thumbnailUrl}
                        className="w-full h-full object-cover relative z-10"
                        autoPlay
                        loop
                        preload="auto"
                        playsInline
                        muted={isMuted}
                        crossOrigin="anonymous"
                        onPlaying={() => {
                          setIsBuffering(false);
                          setIsPlaying(true);
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onWaiting={() => setIsBuffering(true)}
                        onLoadStart={() => setIsBuffering(true)}
                      />
                    )}
                  </>
                )}

                {/* Interaction blocker/event catcher for iframes */}
                <div 
                  className="absolute inset-0 z-[15] cursor-pointer" 
                  onClick={togglePlay}
                />

                {/* Play/Pause/Skip Controls Overlay - Always visible except during auto-play */}
                <div
                  className="absolute inset-0 z-[25] flex items-center justify-center gap-8"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSkip('prev'); }}
                    className={`p-4 rounded-full bg-black/20 backdrop-blur-md text-white border border-white/10 transition-all active:scale-90 ${!hasPrev ? 'opacity-30' : 'hover:bg-black/40'}`}
                    disabled={!hasPrev}
                  >
                    <FiSkipBack className="text-2xl" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="w-20 h-20 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-xl text-white border border-white/20 shadow-2xl transition-all hover:scale-110 active:scale-95"
                  >
                    {isPlaying ? (
                      <FiPause className="text-4xl" />
                    ) : (
                      <FiPlay className="text-4xl ml-1" />
                    )}
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleSkip('next'); }}
                    className={`p-4 rounded-full bg-black/20 backdrop-blur-md text-white border border-white/10 transition-all active:scale-90 ${(!hasNext && !hasMore) ? 'opacity-30' : 'hover:bg-black/40'}`}
                    disabled={!hasNext && !hasMore}
                  >
                    <FiSkipForward className="text-2xl" />
                  </button>
                </div>
              </div>

              {/* OVERLAYS INSIDE MOTION DIV */}
              <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(110px+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/80 z-20 transition-opacity duration-300" style={{ opacity: (currentReel || initialMetadata) ? 1 : 0 }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold truncate max-w-[70%]">{(currentReel || initialMetadata)?.title}</p>
                      {(currentReel || initialMetadata)?.price > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-primary-500 text-white text-[10px] font-bold whitespace-nowrap shadow-sm">
                          ₹{(currentReel || initialMetadata).price}
                        </span>
                      )}
                      {(currentReel || initialMetadata)?.minimum && (
                        <span className="px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-white text-[10px] font-bold whitespace-nowrap border border-white/20 shadow-sm">
                          Min: {(currentReel || initialMetadata).minimum}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm truncate">
                      {(currentReel || initialMetadata)?.uploaderName} • {(currentReel || initialMetadata)?.viewCount ?? 0} views
                    </p>
                  </div>
                  {(currentReel || initialMetadata)?.vendorId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/b2b/vendor/${(currentReel || initialMetadata).vendorId}`, { state: { fromReel: true } })}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-white/90 text-gray-900 text-xs font-semibold hover:bg-white"
                    >
                      Visit Store
                    </button>
                  )}
                </div>
              </div>

              <div className="absolute right-3 bottom-[calc(170px+env(safe-area-inset-bottom))] flex flex-col gap-6 z-30 transition-opacity duration-300" style={{ opacity: (currentReel || initialMetadata) ? 1 : 0 }}>
                <button
                  onClick={() => (currentReel || initialMetadata) && toggleLike(currentReel || initialMetadata)}
                  className="flex flex-col items-center text-white"
                >
                  <FiHeart className={`text-3xl ${(currentReel || initialMetadata)?.userLiked ? "text-red-500 fill-red-500" : ""}`} />
                  <span className="text-xs">{(currentReel || initialMetadata)?.likeCount ?? 0}</span>
                </button>
                <div className="flex flex-col items-center text-white">
                  <FiEye className="text-3xl" />
                  <span className="text-xs">{(currentReel || initialMetadata)?.viewCount ?? 0}</span>
                </div>
                <button
                  onClick={handleShareClick}
                  className="flex flex-col items-center text-white"
                >
                  <FiShare2 className="text-3xl" />
                  <span className="text-xs">Share</span>
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex flex-col items-center text-white"
                >
                  {isMuted ? (
                    <FiVolumeX className="text-3xl" />
                  ) : (
                    <FiVolume2 className="text-3xl text-primary-500" />
                  )}
                  <span className="text-xs">{isMuted ? "Mute" : "Sound"}</span>
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex flex-col items-center text-white/70 hover:text-white transition-colors"
                >
                  <FiFlag className="text-3xl" />
                  <span className="text-xs">Report</span>
                </button>
                {(currentReel || initialMetadata)?.vendorPhone && (
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={handleWhatsApp} 
                      disabled={currentReel?.enquiryStatus && !currentReel.enquiryStatus.canAcceptEnquiries}
                      className={`flex flex-col items-center transition-all ${
                        currentReel?.enquiryStatus && !currentReel.enquiryStatus.canAcceptEnquiries
                          ? "grayscale opacity-50 cursor-not-allowed"
                          : "text-[#25D366] hover:scale-110 active:scale-95"
                      }`}
                    >
                      <FaWhatsapp className="text-5xl shadow-glow-green" />
                    </button>
                    {currentReel?.enquiryStatus && !currentReel.enquiryStatus.canAcceptEnquiries && (
                      <p className="text-[7px] text-white/40 font-bold uppercase tracking-tighter mt-1 text-center bg-black/40 px-1 rounded">
                        Gated
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-full w-full relative z-40 pointer-events-none">
        {/* Category Dropdown Filter - Positioned relative to the shifted video area */}
        <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 z-[40] pointer-events-auto">
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black/60 transition-all shadow-2xl"
            >
              <FiFilter className="text-primary-500" />
              <span className="max-w-[120px] truncate">{activeCategory || "All Reels"}</span>
              <FiChevronDown className={`transition-transform duration-300 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showCategoryDropdown && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[-1]"
                    onClick={() => setShowCategoryDropdown(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-64 max-h-[60vh] overflow-y-auto bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col no-scrollbar"
                  >
                    <div className="sticky top-0 p-3 bg-gray-900/90 backdrop-blur-md border-b border-white/5 z-10">
                      <div className="relative">
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="Search categories..."
                          className="w-full pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-white placeholder:text-gray-500 outline-none focus:border-primary-500/50 transition-all"
                        />
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                      <button
                        onClick={() => {
                          navigate("/b2b/reels");
                          setShowCategoryDropdown(false);
                          setCategorySearch("");
                        }}
                        className={`w-full px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider transition-colors ${activeCategory === "" ? "text-primary-500 bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                      >
                        All Reels
                      </button>
                      {playlistCategories.length > 0 ? (
                        playlistCategories.map((name) => (
                          <button
                            key={name}
                            onClick={() => {
                              navigate(`/b2b/reels?category=${encodeURIComponent(name)}`);
                              setShowCategoryDropdown(false);
                              setCategorySearch("");
                            }}
                            className={`w-full px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider transition-colors ${activeCategory === name ? "text-primary-500 bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                              }`}
                          >
                            {name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">
                          No categories found
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>


        {/* Report Modal */}
        <AnimatePresence>
          {showReportModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl overflow-y-auto max-h-[85vh] shadow-2xl custom-scrollbar"
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Report Reel</h3>
                  <button onClick={() => { setShowReportModal(false); setReportReason(""); setReportComment(""); }} className="text-gray-400 hover:text-white transition-colors">
                    <FiX className="text-2xl" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm text-gray-400 mb-2">Why are you reporting this reel?</p>

                  <div className="grid grid-cols-1 gap-2">
                    {["Spam", "Inappropriate", "Harassment", "False Info", "IP Violation", "Other"].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setReportReason(reason)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-semibold ${reportReason === reason
                          ? "bg-primary-500/10 border-primary-500 text-primary-500"
                          : "bg-white/5 border-white/5 text-white hover:bg-white/10"
                          }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  {reportReason && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <textarea
                        value={reportComment}
                        onChange={(e) => setReportComment(e.target.value)}
                        placeholder="Tell us more (optional)..."
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 outline-none transition-all resize-none"
                      />
                    </motion.div>
                  )}

                  <button
                    disabled={!reportReason || isReporting}
                    onClick={submitReport}
                    className="w-full py-4 bg-primary-600 disabled:bg-gray-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-primary-900/20 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
                  >
                    {isReporting ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : "Submit Report"}
                  </button>
                  <div className="h-4" /> {/* Extra space at bottom */}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {!showReportModal && !showShareModal && <B2BBottomNav />}
    </div>
  );
}
