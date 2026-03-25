import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiHeart, FiVideo, FiShare2, FiEye, FiCopy, FiX, FiFilter, FiChevronDown, FiVolume2, FiVolumeX } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import { useAuthStore } from "../../../shared/store/authStore";
import { useB2BCategoryStore } from "../../../shared/store/b2bCategoryStore";
import { getWhatsAppUserDetailsSuffix } from "../../../shared/utils/helpers";

export default function ReelFeed() {
  const navigate = useNavigate();
  const { reelId: reelIdFromUrl } = useParams();
  const [searchParams] = useSearchParams();
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
  const isShowingGeneralFeed = useRef(false);

  const viewedRef = useRef(new Set());
  const wheelLockRef = useRef(false);
  const touchStartYRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const hasAppliedInitialReelRef = useRef(false);
  const [isMuted, setIsMuted] = useState(true);

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
          setCurrentIndex(0);
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
  }, [activeCategory]);
  const playlistCategories = useMemo(() => {
    const subs = allCategories.flatMap((cat) => cat.subcategories || []);
    const names = subs
      .map((s) => (typeof s === "string" ? s : s?.name))
      .filter(Boolean);

    const extra = ["Flat", "Villa/Row House", "Commercial Property"];
    const merged = [...names, ...extra];

    const unique = Array.from(
      new Map(
        merged
          .map((name) => (name || "").trim())
          .filter(Boolean)
          .map((name) => [name.toLowerCase(), name])
      ).values()
    );

    return unique.sort((a, b) => a.localeCompare(b));
  }, [allCategories]);

  useEffect(() => {
    fetchB2BCategories();
  }, [fetchB2BCategories]);

  useEffect(() => {
    hasAppliedInitialReelRef.current = false;
    isShowingGeneralFeed.current = false;
    fetchFeed(1, false, null, activeCategory);
  }, [activeCategory, reelIdFromUrl, fetchFeed]);

  /* When opened via shared link /b2b/reels/:reelId – show that reel */
  useEffect(() => {
    if (loading || !reelIdFromUrl) return;
    if (hasAppliedInitialReelRef.current) return;

    const idx = reels.findIndex((r) => r._id === reelIdFromUrl);
    if (idx >= 0) {
      setCurrentIndex(idx);
      hasAppliedInitialReelRef.current = true;
      return;
    }

    hasAppliedInitialReelRef.current = true;
    api
      .get(`/reels/${reelIdFromUrl}`)
      .then((res) => {
        if (res.success && res.data?.reel) {
          const single = res.data.reel;
          setReels((prev) =>
            prev.some((r) => r._id === single._id) ? prev : [single, ...prev]
          );
          setCurrentIndex(0);
        }
      })
      .catch(() => toast.error("Reel not found"));
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
    // We send them to the backend /api/reels/share/:id endpoint
    // This allows the backend to serve OG meta tags dynamically before redirecting to the app
    const apiBase = api.defaults.baseURL; // Usually ends with /api
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

  const openShareModal = () => {
    if (!currentReel) return;
    setShowShareModal(true);
  };
  const closeShareModal = () => setShowShareModal(false);

  const copyLink = async () => {
    const url = getShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
      closeShareModal();
    } catch {
      toast.error("Could not copy link");
    }
  };

  const shareOnWhatsApp = () => {
    const url = getShareUrl();
    if (!url) return;
    const typeText = getDisplayType();
    const baseText = `Check out this ${typeText.toLowerCase()}: ${currentReel?.title || typeText}\n\n${url}`;
    const text = encodeURIComponent(baseText);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    closeShareModal();
  };

  const nativeShare = async () => {
    const url = getShareUrl();
    if (!url || !navigator.share) return;
    const typeText = getDisplayType();
    try {
      await navigator.share({
        title: currentReel?.title || typeText,
        text: currentReel?.description || `Check out this ${typeText.toLowerCase()}`,
        url,
      });
      closeShareModal();
      toast.success("Shared!");
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Share failed");
    }
  };

  const handleWhatsApp = () => {
    if (!currentReel?.vendorPhone) return;
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

  if (loading && reels.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black flex flex-col pb-16"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <B2BHeader hideSearch sticky />

      <div className="flex-1 relative overflow-hidden">
        {/* Category Dropdown Filter - Floating Over Reel */}
        <div className="absolute top-4 left-4 z-[40]">
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
                    className="absolute top-full left-0 mt-2 w-56 max-h-[60vh] overflow-y-auto bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 no-scrollbar"
                  >
                    <button
                      onClick={() => { setActiveCategory(""); setShowCategoryDropdown(false); }}
                      className={`w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        activeCategory === "" ? "text-primary-500 bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      All Reels
                    </button>
                    {playlistCategories.map((name) => (
                      <button
                        key={name}
                        onClick={() => { setActiveCategory(name); setShowCategoryDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider transition-colors ${
                          activeCategory === name ? "text-primary-500 bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {currentReel && (
            <motion.div
              key={currentReel._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="flex-1 flex items-center justify-center bg-black relative">
                {getReelYoutubeId(currentReel) ? (
                  <div className="w-full h-full pointer-events-none">
                    <iframe
                      title={currentReel.title}
                      src={`https://www.youtube.com/embed/${getReelYoutubeId(currentReel)}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${getReelYoutubeId(currentReel)}&rel=0&modestbranding=1&controls=0&disablekb=1&enablejsapi=1`}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <video
                    src={currentReel.videoUrl}
                    className="w-full h-full object-contain"
                    autoPlay
                    loop
                    controls
                    playsInline
                    muted={isMuted}
                  />
                )}
                
                {/* Interaction blocker/event catcher for iframes */}
                <div className="absolute inset-0 z-10" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/80 z-20">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold truncate max-w-[70%]">{currentReel.title}</p>
                      {currentReel.price > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-primary-500 text-white text-[10px] font-bold whitespace-nowrap shadow-sm">
                          ₹{currentReel.price}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm truncate">
                      {currentReel.uploaderName} • {currentReel.viewCount ?? 0} views
                    </p>
                  </div>
                  {currentReel.vendorId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/b2b/vendor/${currentReel.vendorId}`)}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-white/90 text-gray-900 text-xs font-semibold hover:bg-white"
                    >
                      Visit Store
                    </button>
                  )}
                </div>
              </div>

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-30">
                <button
                  onClick={() => toggleLike(currentReel)}
                  className="flex flex-col items-center text-white"
                >
                  <FiHeart className={`text-3xl ${currentReel.userLiked ? "text-red-500 fill-red-500" : ""}`} />
                  <span className="text-xs">{currentReel.likeCount ?? 0}</span>
                </button>
                <div className="flex flex-col items-center text-white">
                  <FiEye className="text-3xl" />
                  <span className="text-xs">{currentReel.viewCount ?? 0}</span>
                </div>
                <button
                  onClick={openShareModal}
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
                {currentReel.vendorPhone && (
                  <button onClick={handleWhatsApp} className="flex flex-col items-center text-[#25D366]">
                    <FaWhatsapp className="text-3xl" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showShareModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[45] backdrop-blur-[2px]"
              style={{ bottom: '64px' }}
              onClick={closeShareModal}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-[72px] left-3 right-3 z-[45] bg-gray-900 rounded-2xl px-5 pt-5 pb-6 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white">Share this reel</h3>
                <button onClick={closeShareModal} className="p-2 text-gray-400 hover:text-white">
                  <FiX className="text-xl" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <button onClick={copyLink} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 text-white">
                  <FiCopy className="text-2xl" />
                  <span className="text-sm">Copy link</span>
                </button>
                <button onClick={shareOnWhatsApp} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 text-white">
                  <FaWhatsapp className="text-2xl text-[#25D366]" />
                  <span className="text-sm">WhatsApp</span>
                </button>
                {typeof navigator !== "undefined" && navigator.share && (
                  <button onClick={nativeShare} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 text-white">
                    <FiShare2 className="text-2xl" />
                    <span className="text-sm">More</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <B2BBottomNav />
    </div>
  );
}
