// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import { FiHeart, FiVideo, FiShare2, FiEye } from 'react-icons/fi';
// import { FaWhatsapp } from 'react-icons/fa';
// import toast from 'react-hot-toast';
// import api from '../../../shared/utils/api';
// import B2BHeader from '../components/Layout/B2BHeader';
// import B2BBottomNav from '../components/Layout/B2BBottomNav';
// import { useAuthStore } from '../../../shared/store/authStore';
// import { getWhatsAppUserDetailsSuffix } from '../../../shared/utils/helpers';

// export default function ReelFeed() {
//   const navigate = useNavigate();
//   const [reels, setReels] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const viewedRef = useRef(new Set());
//   const wheelLockRef = useRef(false);
//   const touchStartYRef = useRef(null);
//   const loadingMoreRef = useRef(false);
//   const scrollStateRef = useRef({ hasNext: false, hasPrev: false, loadMore: () => {} });
//   const { user } = useAuthStore();

//   const fetchFeed = useCallback(async (pageNum = 1, append = false) => {
//     try {
//       if (!append) setLoading(true);
//       if (append) loadingMoreRef.current = true;
//       const res = await api.get(`/reels/feed?page=${pageNum}&limit=10`);
//       if (res.success && res.data?.reels) {
//         const newReels = res.data.reels;
//         if (append) {
//           setReels((prev) => (newReels.length ? [...prev, ...newReels] : prev));
//         } else {
//           setReels(newReels.length ? newReels : []);
//           setCurrentIndex(0);
//         }
//         if (!newReels.length && !append) setReels([]);
//       } else if (!append) {
//         setReels([]);
//       }
//     } catch (err) {
//       toast.error(err.message || 'Failed to load reels');
//       if (!append) setReels([]);
//     } finally {
//       setLoading(false);
//       loadingMoreRef.current = false;
//     }
//   }, []);

//   useEffect(() => {
//     fetchFeed(1, false);
//   }, [fetchFeed]);

//   const loadMore = useCallback(() => {
//     if (loadingMoreRef.current) return;
//     const nextPage = page + 1;
//     fetchFeed(nextPage, true);
//     setPage(nextPage);
//   }, [fetchFeed, page]);

//   const toggleLike = async (reel) => {
//     try {
//       if (reel.userLiked) {
//         await api.delete(`/reels/${reel._id}/like`);
//         setReels((prev) =>
//           prev.map((r) =>
//             r._id === reel._id
//               ? { ...r, userLiked: false, likeCount: Math.max(0, (r.likeCount || 0) - 1) }
//               : r
//           )
//         );
//       } else {
//         await api.post(`/reels/${reel._id}/like`);
//         setReels((prev) =>
//           prev.map((r) =>
//             r._id === reel._id
//               ? { ...r, userLiked: true, likeCount: (r.likeCount || 0) + 1 }
//               : r
//           )
//         );
//       }
//     } catch (err) {
//       toast.error(err.message || 'Could not update like');
//     }
//   };

//   const currentReel = reels[currentIndex];
//   const hasNext = currentIndex < reels.length - 1;
//   const hasPrev = currentIndex > 0;

//   scrollStateRef.current = { hasNext, hasPrev, loadMore };

//   // Track a view when a reel becomes active (once per reel per session)
//   useEffect(() => {
//     if (!currentReel?._id) return;
//     const id = currentReel._id;
//     if (viewedRef.current.has(id)) return;
//     viewedRef.current.add(id);
//     api
//       .post(`/reels/${id}/view`)
//       .then((res) => {
//         if (res?.data?.viewCount != null) {
//           setReels((prev) =>
//             prev.map((r) => (r._id === id ? { ...r, viewCount: res.data.viewCount } : r))
//           );
//         }
//       })
//       .catch(() => {});
//   }, [currentReel?._id]);

//   const handleWheel = useCallback((e) => {
//     const { hasNext: next, hasPrev: prev, loadMore: load } = scrollStateRef.current;
//     if (wheelLockRef.current) return;
//     wheelLockRef.current = true;
//     setTimeout(() => {
//       wheelLockRef.current = false;
//     }, 280);

//     if (e.deltaY > 0) {
//       if (next) {
//         setCurrentIndex((i) => i + 1);
//       } else {
//         load();
//       }
//     } else if (e.deltaY < 0 && prev) {
//       setCurrentIndex((i) => Math.max(0, i - 1));
//     }
//   }, []);

//   const handleTouchStart = useCallback((e) => {
//     if (!e.touches || !e.touches[0]) return;
//     touchStartYRef.current = e.touches[0].clientY;
//   }, []);

//   const handleTouchEnd = useCallback(
//     (e) => {
//       if (touchStartYRef.current == null) return;
//       const endY = e.changedTouches?.[0]?.clientY ?? touchStartYRef.current;
//       const diff = touchStartYRef.current - endY;
//       touchStartYRef.current = null;
//       const threshold = 40;
//       if (Math.abs(diff) < threshold) return;

//       if (diff > 0) {
//         // swipe up → next reel
//         if (hasNext) {
//           setCurrentIndex((i) => i + 1);
//         } else {
//           loadMore();
//         }
//       } else if (diff < 0 && hasPrev) {
//         // swipe down → previous reel
//         setCurrentIndex((i) => Math.max(0, i - 1));
//       }
//     },
//     [hasNext, hasPrev, loadMore]
//   );

//   const handleShare = () => {
//     if (!currentReel) return;
//     const youtubeUrl = currentReel.youtubeVideoId
//       ? `https://www.youtube.com/watch?v=${currentReel.youtubeVideoId}`
//       : window.location.href;
//     const shareData = {
//       title: currentReel.title || 'Reel',
//       text: currentReel.description || `Check out this reel from ${currentReel.uploaderName || 'vendor'}`,
//       url: youtubeUrl,
//     };

//     if (navigator.share) {
//       navigator
//         .share(shareData)
//         .catch(() => {});
//     } else {
//       navigator.clipboard
//         ?.writeText(youtubeUrl)
//         .then(() => toast.success('Link copied to clipboard'))
//         .catch(() => toast.success('Share this link: ' + youtubeUrl));
//     }
//   };

//   const handleWhatsApp = () => {
//     if (!currentReel) return;
//     const rawPhone = currentReel.vendorPhone || '';
//     const cleanedPhone = rawPhone.replace(/\D/g, '');
//     if (!cleanedPhone) {
//       toast.error('Vendor phone number not available');
//       return;
//     }
//     const formattedPhone = cleanedPhone.startsWith('91') ? cleanedPhone : '91' + cleanedPhone;
//     const youtubeUrl = currentReel.youtubeVideoId
//       ? `https://www.youtube.com/watch?v=${currentReel.youtubeVideoId}`
//       : window.location.href;

//     const baseMsg =
//       `🎥 *I'm interested in your reel!*` +
//       `\n\n📌 *Title:* ${currentReel.title || 'Reel'}` +
//       `\n🏷️ *Category:* ${currentReel.categoryName || 'N/A'}` +
//       `\n🏢 *Store:* ${currentReel.vendorStoreName || currentReel.uploaderName || 'Vendor'}` +
//       `\n\n🔗 *Watch Reel:* ${youtubeUrl}` +
//       getWhatsAppUserDetailsSuffix(user);

//     const message = encodeURIComponent(baseMsg);
//     window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${message}`, '_blank');
//   };

//   if (loading && reels.length === 0) {
//     return (
//       <div className="min-h-screen bg-black flex items-center justify-center">
//         <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
//       </div>
//     );
//   }

//   if (!loading && reels.length === 0) {
//     return (
//       <div className="min-h-screen bg-gray-900">
//         <B2BHeader />
//         <div className="flex flex-col items-center justify-center py-32 px-4">
//           <FiVideo className="text-6xl text-gray-500 mb-4" />
//           <p className="text-gray-400 font-medium">No reels right now</p>
//           <p className="text-sm text-gray-500 mt-1">Check back later for short videos from sellers.</p>
//           <button
//             type="button"
//             onClick={() => navigate('/b2b/landing')}
//             className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium"
//           >
//             Back to home
//           </button>
//         </div>
//         <B2BBottomNav />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black flex flex-col pb-16">
//       <B2BHeader hideSearch />
//       <div
//         className="flex-1 relative overflow-hidden"
//         onWheelCapture={handleWheel}
//         onTouchStart={handleTouchStart}
//         onTouchEnd={handleTouchEnd}
//       >
//         <AnimatePresence initial={false} mode="wait">
//           {currentReel && (
//             <motion.div
//               key={currentReel._id}
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               className="absolute inset-0 flex flex-col"
//             >
//               <div className="flex-1 flex items-center justify-center bg-black min-h-0">
//                 {currentReel.youtubeVideoId ? (
//                   <iframe
//                     title={currentReel.title}
//                     src={`https://www.youtube.com/embed/${currentReel.youtubeVideoId}?autoplay=1`}
//                     className="w-full h-full max-h-full object-contain"
//                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//                     allowFullScreen
//                   />
//                 ) : currentReel.videoUrl ? (
//                   <video
//                     src={currentReel.videoUrl}
//                     className="w-full h-full max-h-full object-contain"
//                     controls
//                     autoPlay
//                     playsInline
//                     muted={false}
//                   />
//                 ) : (
//                   <div className="text-gray-500 flex flex-col items-center gap-2">
//                     <FiVideo className="text-5xl" />
//                     <span>Video unavailable</span>
//                   </div>
//                 )}
//               </div>

//               <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/80 to-transparent">
//                 <div className="flex items-center justify-between gap-3">
//                   <div className="min-w-0">
//                     <p className="text-white font-semibold truncate">{currentReel.title}</p>
//                     <p className="text-gray-300 text-sm truncate">
//                       {currentReel.uploaderName} · {currentReel.categoryName}
//                       {typeof currentReel.viewCount === 'number' && (
//                         <> · {currentReel.viewCount} views</>
//                       )}
//                     </p>
//                   </div>
//                   {currentReel.vendorId && (
//                     <button
//                       type="button"
//                       onClick={() => navigate(`/b2b/vendor/${currentReel.vendorId}`)}
//                       className="shrink-0 px-3 py-1.5 rounded-full bg-white/90 text-gray-900 text-xs font-semibold hover:bg-white"
//                     >
//                       Visit Store
//                     </button>
//                   )}
//                 </div>
//               </div>

//               <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-6">
//                 <button
//                   type="button"
//                   onClick={() => toggleLike(currentReel)}
//                   className="flex flex-col items-center gap-1 text-white"
//                 >
//                   <FiHeart
//                     className={`text-3xl ${currentReel.userLiked ? 'fill-red-500 text-red-500' : ''}`}
//                   />
//                   <span className="text-xs">{currentReel.likeCount ?? 0}</span>
//                 </button>
//                 <div className="flex flex-col items-center gap-1 text-white">
//                   <FiEye className="text-3xl text-white/90" />
//                   <span className="text-xs">{currentReel.viewCount ?? 0}</span>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={handleShare}
//                   className="flex flex-col items-center gap-1 text-white"
//                 >
//                   <FiShare2 className="text-3xl" />
//                   <span className="text-xs">Share</span>
//                 </button>
//                 {currentReel.vendorPhone && (
//                   <button
//                     type="button"
//                     onClick={handleWhatsApp}
//                     className="flex flex-col items-center gap-1 text-[#25D366]"
//                   >
//                     <FaWhatsapp className="text-3xl" />
//                     <span className="text-xs text-white">WhatsApp</span>
//                   </button>
//                 )}
//               </div>

//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>

//       <B2BBottomNav />
//     </div>
//   );
// }
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiHeart, FiVideo, FiShare2, FiEye, FiCopy, FiX } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import { useAuthStore } from "../../../shared/store/authStore";
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

  const viewedRef = useRef(new Set());
  const wheelLockRef = useRef(false);
  const touchStartYRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const hasAppliedInitialReelRef = useRef(false);

  const categoryFilter = searchParams.get("category") || "";

  const fetchFeed = useCallback(async (pageNum = 1, append = false, pageToken = null) => {
    try {
      if (!append) setLoading(true);
      if (append) loadingMoreRef.current = true;

      const params = new URLSearchParams({ limit: "10" });
      if (categoryFilter) params.set("category", categoryFilter);
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

        if (token != null) {
          setNextPageToken(token);
          setHasMore(!!token);
        } else if (pages != null) {
          setHasMore(currentPage < pages);
        } else {
          setHasMore(newReels.length > 0);
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
  }, [categoryFilter]);

  useEffect(() => {
    hasAppliedInitialReelRef.current = false;
    fetchFeed(1, false);
  }, [fetchFeed, reelIdFromUrl]);

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

  /* ---------------- VIEW TRACK ---------------- */

  useEffect(() => {
    if (!currentReel?._id) return;

    if (viewedRef.current.has(currentReel._id)) return;

    viewedRef.current.add(currentReel._id);

    api.post(`/reels/${currentReel._id}/view`).catch(() => { });
  }, [currentReel]);

  /* ---------------- SCROLL HANDLER ---------------- */

  const handleWheel = useCallback(
    (e) => {
      if (wheelLockRef.current) return;

      wheelLockRef.current = true;

      setTimeout(() => {
        wheelLockRef.current = false;
      }, 500);

      if (e.deltaY > 0) {
        if (hasNext) {
          setCurrentIndex((i) => i + 1);
        } else if (hasMore) {
          loadMore();
        }
      } else if (e.deltaY < 0 && hasPrev) {
        setCurrentIndex((i) => i - 1);
      }
    },
    [hasNext, hasPrev, hasMore, loadMore]
  );

  /* Global wheel listener */

  useEffect(() => {
    const wheelListener = (e) => handleWheel(e);

    window.addEventListener("wheel", wheelListener, { passive: true });

    return () => window.removeEventListener("wheel", wheelListener);
  }, [handleWheel]);

  /* ---------------- TOUCH SUPPORT ---------------- */

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

  /* ---------------- LIKE ---------------- */

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

  /* ---------------- SHARE ---------------- */

  const getShareUrl = useCallback(() => {
    if (!currentReel) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/b2b/reels/${currentReel._id}`;
  }, [currentReel]);

  const getResourceTypeText = () => {
    if (!currentReel || !currentReel.categoryName) return "reel";
    const cat = currentReel.categoryName.toLowerCase();
    const propertyKeywords = ["flat", "row house", "villa", "commercial", "shop", "office", "showroom", "godown", "factory", "plot", "building", "real estate", "property"];
    if (propertyKeywords.some(keyword => cat.includes(keyword))) {
      return "property";
    }
    // Default to product for B2B reels unless it matches property keywords
    return "product";
  }

  const getDisplayType = () => {
    const type = getResourceTypeText();
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

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
    const text = encodeURIComponent(
      `Check out this ${typeText.toLowerCase()}: ${currentReel?.title || typeText}\n\n${url}`
    );
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

  /* ---------------- WHATSAPP ---------------- */

  const handleWhatsApp = () => {
    if (!currentReel?.vendorPhone) return;

    const phone = currentReel.vendorPhone.replace(/\D/g, "");
    const formatted = phone.startsWith("91") ? phone : `91${phone}`;

    const siteUrl = getShareUrl();
    const typeText = getResourceTypeText(); // use lowercase version

    const lines = [
      `🎥 I'm interested in your ${typeText}`,
      currentReel?.title ? `${typeText.charAt(0).toUpperCase() + typeText.slice(1)}: ${currentReel.title}` : null,
      "",
      siteUrl ? `Dealing India link: ${siteUrl}` : null,
    ].filter(Boolean);

    const msg = encodeURIComponent(
      `${lines.join("\n")}${getWhatsAppUserDetailsSuffix(user)}`
    );

    window.open(
      `https://api.whatsapp.com/send?phone=${formatted}&text=${msg}`,
      "_blank"
    );
  };

  /* ---------------- LOADING ---------------- */

  if (loading && reels.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div
      className="min-h-screen bg-black flex flex-col pb-16"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <B2BHeader hideSearch />

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {currentReel && (
            <motion.div
              key={currentReel._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* VIDEO */}
              <div className="flex-1 flex items-center justify-center bg-black">

                {currentReel.youtubeVideoId ? (
                  <div className="w-full h-full pointer-events-none">
                    <iframe
                      title={currentReel.title}
                      // Added mute=1 for autoplay to work more reliably on modern browsers, updated autoplay logic
                      src={`https://www.youtube.com/embed/${currentReel.youtubeVideoId}?autoplay=1&mute=1&loop=1&playlist=${currentReel.youtubeVideoId}&rel=0&modestbranding=1&controls=0`}
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
                    muted // Browsers require muted for autoplay to work without user interaction
                  />
                )}

              </div>

              {/* INFO */}
              <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/80">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">
                      {currentReel.title}
                    </p>
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

              {/* ACTIONS */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-6">

                <button
                  onClick={() => toggleLike(currentReel)}
                  className="flex flex-col items-center text-white"
                >
                  <FiHeart
                    className={`text-3xl ${currentReel.userLiked ? "text-red-500 fill-red-500" : ""
                      }`}
                  />
                  <span className="text-xs">{currentReel.likeCount ?? 0}</span>
                </button>

                <div className="flex flex-col items-center text-white">
                  <FiEye className="text-3xl" />
                  <span className="text-xs">{currentReel.viewCount ?? 0}</span>
                </div>

                <button
                  onClick={openShareModal}
                  className="flex flex-col items-center text-white"
                  aria-label="Share reel"
                >
                  <FiShare2 className="text-3xl" />
                  <span className="text-xs">Share</span>
                </button>

                {currentReel.vendorPhone && (
                  <button
                    onClick={handleWhatsApp}
                    className="flex flex-col items-center text-[#25D366]"
                  >
                    <FaWhatsapp className="text-3xl" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share options modal */}
      <AnimatePresence>
        {showShareModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={closeShareModal}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-2xl shadow-xl border-t border-gray-700 px-4 pt-4 pb-8 safe-area-pb"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white">Share this reel</h3>
                <button
                  type="button"
                  onClick={closeShareModal}
                  className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                  aria-label="Close"
                >
                  <FiX className="text-xl" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-700">
                    <FiCopy className="text-2xl" />
                  </span>
                  <span className="text-sm font-medium">Copy link</span>
                </button>
                <button
                  type="button"
                  onClick={shareOnWhatsApp}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366]/20">
                    <FaWhatsapp className="text-2xl text-[#25D366]" />
                  </span>
                  <span className="text-sm font-medium">WhatsApp</span>
                </button>
                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                  >
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-700">
                      <FiShare2 className="text-2xl" />
                    </span>
                    <span className="text-sm font-medium">More options</span>
                  </button>
                )}
              </div>
              <p className="mt-4 text-center text-gray-500 text-sm">
                Share with anyone via link or apps
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <B2BBottomNav />
    </div>
  );
}
