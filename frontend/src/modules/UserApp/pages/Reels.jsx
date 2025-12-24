import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiShare2, FiMoreVertical, FiX, FiFlag, FiAlertCircle, FiSend, FiStar, FiCopy, FiGift, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { FaWhatsapp, FaInstagram, FaFacebook } from 'react-icons/fa';
import { useWishlistStore } from '../../../shared/store/wishlistStore';
import { useReviewsStore } from '../../../shared/store/reviewsStore';
import { getProductById } from '../../../data/products';
import { getActiveReels } from '../../../shared/utils/reelHelpers';
import MobileLayout from '../components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';
import toast from 'react-hot-toast';

// Mock reel data - fallback when no vendor reels exist
import reel1 from '../../../../data/Reels/reel1.mp4';
import reel2 from '../../../../data/Reels/reel2.mp4';

const mockReels = [
  {
    id: 1001,
    videoUrl: reel1,
    thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
    productId: 1001,
    productName: 'Trending Reel 1',
    productPrice: 199.99,
    vendorName: 'Featured Seller',
    likes: 150,
    comments: 10,
    shares: 5,
  },
  {
    id: 1002,
    videoUrl: reel2,
    thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    productId: 1002,
    productName: 'Trending Reel 2',
    productPrice: 299.99,
    vendorName: 'Featured Seller',
    likes: 120,
    comments: 8,
    shares: 3,
  },
  {
    id: 1,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    productId: 1,
    productName: 'Classic White T-Shirt',
    productPrice: 24.99,
    vendorName: 'Fashion Hub',
    likes: 1234,
    comments: 56,
    shares: 12,
  },
  {
    id: 2,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
    productId: 4,
    productName: 'Leather Crossbody Bag',
    productPrice: 89.99,
    vendorName: 'Fashion Hub',
    likes: 2345,
    comments: 89,
    shares: 23,
  },
  {
    id: 3,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400',
    productId: 5,
    productName: 'Casual Canvas Sneakers',
    productPrice: 49.99,
    vendorName: 'Tech Gear Pro',
    likes: 3456,
    comments: 123,
    shares: 45,
  },
  {
    id: 4,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    productId: 6,
    productName: 'Designer Sunglasses',
    productPrice: 125.99,
    vendorName: 'Fashion Hub',
    likes: 4567,
    comments: 234,
    shares: 67,
  },
  {
    id: 5,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
    productId: 3,
    productName: 'Floral Summer Dress',
    productPrice: 59.99,
    vendorName: 'Fashion Hub',
    likes: 5678,
    comments: 345,
    shares: 89,
  },
  {
    id: 6,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400',
    productId: 8,
    productName: 'Formal Blazer Jacket',
    productPrice: 149.99,
    vendorName: 'Fashion Hub',
    likes: 3456,
    comments: 178,
    shares: 45,
  },
  {
    id: 7,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
    productId: 10,
    productName: 'High Heel Pumps',
    productPrice: 89.99,
    vendorName: 'Fashion Hub',
    likes: 4321,
    comments: 267,
    shares: 78,
  },
  {
    id: 8,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    productId: 13,
    productName: 'Leather Ankle Boots',
    productPrice: 119.99,
    vendorName: 'Fashion Hub',
    likes: 3890,
    comments: 189,
    shares: 56,
  },
  {
    id: 9,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    productId: 14,
    productName: 'Designer Wristwatch',
    productPrice: 249.99,
    vendorName: 'Tech Gear Pro',
    likes: 5123,
    comments: 412,
    shares: 123,
  },
  {
    id: 10,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
    productId: 9,
    productName: 'Denim Jacket',
    productPrice: 69.99,
    vendorName: 'Fashion Hub',
    likes: 2987,
    comments: 145,
    shares: 34,
  },
  {
    id: 11,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400',
    productId: 12,
    productName: 'Knit Cardigan Sweater',
    productPrice: 74.99,
    vendorName: 'Fashion Hub',
    likes: 3456,
    comments: 201,
    shares: 67,
  },
  {
    id: 12,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
    productId: 15,
    productName: 'Silk Evening Gown',
    productPrice: 189.99,
    vendorName: 'Fashion Hub',
    likes: 4123,
    comments: 298,
    shares: 89,
  },
  {
    id: 13,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400',
    productId: 16,
    productName: 'Casual Flannel Shirt',
    productPrice: 44.99,
    vendorName: 'Fashion Hub',
    likes: 2678,
    comments: 134,
    shares: 45,
  },
  {
    id: 14,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
    productId: 17,
    productName: 'Boho Maxi Skirt',
    productPrice: 64.99,
    vendorName: 'Fashion Hub',
    likes: 3789,
    comments: 192,
    shares: 56,
  },
  {
    id: 15,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400',
    productId: 2,
    productName: 'Slim Fit Blue Jeans',
    productPrice: 79.99,
    vendorName: 'Fashion Hub',
    likes: 4567,
    comments: 289,
    shares: 78,
  },
];

// Get reels from vendor management or use mock data as fallback
const getReelsData = () => {
  const vendorReels = getActiveReels();
  if (vendorReels && vendorReels.length > 0) {
    return vendorReels;
  }
  // Fallback to mock data if no vendor reels exist
  return mockReels;
};

const Reels = () => {
  const navigate = useNavigate();
  const [reelsData, setReelsData] = useState(() => getReelsData());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // State for interactions
  const [likedReels, setLikedReels] = useState(new Set());
  const [shareCount, setShareCount] = useState({});
  const [activeCommentReel, setActiveCommentReel] = useState(null); // ID of reel whose comments are open
  const [activeOptionsReel, setActiveOptionsReel] = useState(null); // ID of reel whose options are open

  // Share & Reward State
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeShareReel, setActiveShareReel] = useState(null);
  const [shareStep, setShareStep] = useState('options'); // 'options' | 'tasks' | 'success'
  const [rewardTasks, setRewardTasks] = useState({ instagram: false, facebook: false, whatsapp: false });
  const [whatsappCount, setWhatsappCount] = useState(0); // Need to share to 5 friends
  const [ticketId, setTicketId] = useState(null);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [commentsUpdateTrigger, setCommentsUpdateTrigger] = useState(0);

  const videoRefs = useRef({});
  const containerRef = useRef(null);
  const commentsEndRef = useRef(null);
  const observerRef = useRef(null);

  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();
  const { getReviews, addReview } = useReviewsStore(state => state);

  // Refresh reels data when component mounts
  useEffect(() => {
    const updatedReels = getReelsData();
    setReelsData(updatedReels);
  }, []);

  // Prevent body scroll and enforce black background on reels page
  useEffect(() => {
    // Use setTimeout to override any styles set by parent MobileLayout
    const timer = setTimeout(() => {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';
      document.body.style.overscrollBehavior = 'none'; // Prevent bounce
    }, 100);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
      document.body.style.overscrollBehavior = '';
    };
  }, []);

  // Intersection Observer to detect active reel
  useEffect(() => {
    const options = {
      root: containerRef.current,
      threshold: 0.6, // Trigger when 60% of video is visible
    };

    const handleIntersection = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.dataset.index);
          if (!isNaN(index)) {
            setCurrentIndex(index);
          }
        }
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, options);

    const elements = containerRef.current?.querySelectorAll('.reel-item');
    elements?.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [reelsData]);

  // Handle Video Playback logic
  useEffect(() => {
    // Pause all other videos
    Object.keys(videoRefs.current).forEach((key) => {
      const index = parseInt(key);
      const video = videoRefs.current[index];

      if (video) {
        if (index === currentIndex) {
          if (isPlaying) {
            // Play current
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.log("Autoplay prevented:", error);
                video.muted = true;
                video.play().catch(e => console.error("Muted play failed", e));
              });
            }
            video.muted = false; // Try to unmute
          } else {
            video.pause();
          }
        } else {
          // Verify it's paused
          video.pause();
          if (Math.abs(index - currentIndex) > 1) {
            video.currentTime = 0; // Reset videos far away
          }
        }
      }
    });

  }, [currentIndex, isPlaying]);


  const getVendorIdFromProduct = (productId) => {
    const product = getProductById(productId);
    return product?.vendorId || 1;
  };

  const toggleLike = (reelId) => {
    const newLikedReels = new Set(likedReels);
    if (newLikedReels.has(reelId)) {
      newLikedReels.delete(reelId);
    } else {
      newLikedReels.add(reelId);
    }
    setLikedReels(newLikedReels);
  };

  const handleShareButton = (reel) => {
    setActiveShareReel(reel);
    setShareStep('options');
    setRewardTasks({ instagram: false, facebook: false, whatsapp: false });
    setWhatsappCount(0);
    setShowShareModal(true);
  };

  const checkMonthlyLimit = () => {
    const lastEntryStr = localStorage.getItem('mega_reward_last_entry');
    if (lastEntryStr) {
      const lastEntry = new Date(lastEntryStr);
      const now = new Date();
      if (lastEntry.getMonth() === now.getMonth() && lastEntry.getFullYear() === now.getFullYear()) {
        return false;
      }
    }
    return true;
  };

  const handleMegaRewardClick = () => {
    if (checkMonthlyLimit()) {
      setShareStep('tasks');
    } else {
      toast.error('You have already entered the lucky draw this month!');
    }
  };

  const handleCopyLink = async () => {
    if (!activeShareReel) return;
    const reelUrl = `${window.location.origin}/app/reels?reel=${activeShareReel.id}`;
    try {
      await navigator.clipboard.writeText(reelUrl);
      toast.success('Link copied to clipboard!');

      // Update share count
      setShareCount(prev => ({
        ...prev,
        [activeShareReel.id]: (prev[activeShareReel.id] || activeShareReel.shares) + 1
      }));

      setShowShareModal(false);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleTaskClick = (platform) => {
    if (!activeShareReel) return;

    // In a real app, this would verify the share. For now, we simulate.
    const reelUrl = `${window.location.origin}/app/reels?reel=${activeShareReel.id}`;
    const text = `Check out this amazing product: ${activeShareReel.productName}`;

    let url = '';
    if (platform === 'instagram') {
      // Instagram sharing logic (simplified)
      url = 'https://instagram.com';
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reelUrl)}`;
    } else if (platform === 'whatsapp') {
      url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + reelUrl)}`;
    }

    // Open link
    window.open(url, '_blank');

    // Update state
    if (platform === 'whatsapp') {
      const newCount = whatsappCount + 1;
      setWhatsappCount(newCount);
      if (newCount >= 5) {
        setRewardTasks(prev => ({ ...prev, whatsapp: true }));
      } else {
        toast(`${5 - newCount} more friends to go!`);
      }
    } else {
      setRewardTasks(prev => ({ ...prev, [platform]: true }));
    }
  };

  // Check for completion
  useEffect(() => {
    if (shareStep === 'tasks' && rewardTasks.instagram && rewardTasks.facebook && rewardTasks.whatsapp) {
      // All tasks done
      localStorage.setItem('mega_reward_last_entry', new Date().toISOString());

      // Generate Unique Ticket ID
      const dateStr = new Date().toISOString().slice(0, 7).replace(/-/g, ''); // YYYYMM
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newTicketId = `MR-${dateStr}-${randomStr}`;
      localStorage.setItem('mega_reward_ticket_id', newTicketId);
      setTicketId(newTicketId);

      setTimeout(() => setShareStep('success'), 500);

      // Update share count massively for the effort ;)
      if (activeShareReel) {
        setShareCount(prev => ({
          ...prev,
          [activeShareReel.id]: (prev[activeShareReel.id] || activeShareReel.shares) + 20
        }));
      }
    }
  }, [rewardTasks, shareStep, activeShareReel]);

  // Comments Logic
  const mockComments = [
    {
      id: '1', user: 'Sarah M.', comment: 'Love this product!', rating: 5, date: new Date().toISOString(), helpfulCount: 12,
    },
    {
      id: '2', user: 'John D.', comment: 'Ordered one and it arrived quickly.', rating: 4, date: new Date().toISOString(), helpfulCount: 8,
    },
    {
      id: '3', user: 'Emma L.', comment: 'Musy buy!', rating: 5, date: new Date().toISOString(), helpfulCount: 15,
    },
  ];

  const currentReelForComments = reelsData.find(r => r.id === activeCommentReel);

  const displayComments = useMemo(() => {
    if (!currentReelForComments) return [];
    const reelComments = getReviews(currentReelForComments.productId) || [];
    const sortedUserComments = [...reelComments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return [...sortedUserComments, ...mockComments];
  }, [currentReelForComments, commentsUpdateTrigger]);

  const handleSubmitComment = () => {
    if (!newComment.trim() || !commentRating || !currentReelForComments) return;

    addReview(currentReelForComments.productId, {
      user: 'You',
      comment: newComment,
      rating: commentRating,
      date: new Date().toISOString(),
      title: `Review for ${currentReelForComments.productName}`,
    });

    setNewComment('');
    setCommentRating(5);
    setCommentsUpdateTrigger(prev => prev + 1);
    toast.success('Comment added!');
  };

  // Scroll to bottom of comments
  useEffect(() => {
    if (activeCommentReel) {
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [activeCommentReel]);


  return (
    <PageTransition>
      <MobileLayout>
        {/* Main Scroll Container */}
        <div
          ref={containerRef}
          id="reels-container"
          className="w-full h-[100vh] bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{
            position: 'fixed',
            top: 0, bottom: 0, left: 0, right: 0,
            zIndex: 1,
          }}
        >
          {reelsData.map((reel, index) => (
            <div
              key={reel.id}
              data-index={index}
              className="reel-item relative w-full h-full snap-start snap-always"
              style={{ height: '100vh' }}
            >
              {/* Video Layer */}
              <div className="absolute inset-0 bottom-16 bg-black">
                {(index === currentIndex || index === currentIndex + 1 || index === currentIndex - 1) ? (
                  <video
                    ref={el => videoRefs.current[index] = el}
                    src={reel.videoUrl}
                    className="w-full h-full object-cover"
                    loop
                    playsInline
                    muted={index !== currentIndex} // Mute if not active (preload)
                    poster={reel.thumbnail} // Show thumbnail while loading
                    onClick={() => setIsPlaying(!isPlaying)}
                  />
                ) : (
                  <img
                    src={reel.thumbnail}
                    alt={reel.productName}
                    className="w-full h-full object-cover opacity-80"
                  />
                )}
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none bottom-16" />

              {/* Overlays Wrapper - Positioned absolutely inside the reel item */}
              <div className="absolute bottom-16 left-0 right-0 p-4 pb-8 z-10 pointer-events-none">
                <div className="flex items-end justify-between">
                  {/* Left Side: Product Info */}
                  <div className="flex-1 pointer-events-auto">
                    <h3 className="text-white font-semibold text-lg mb-1 drop-shadow-md">
                      {reel.productName}
                    </h3>
                    <p className="text-white/90 text-sm mb-2 drop-shadow-md">
                      {reel.vendorName}
                    </p>
                    <p className="text-white font-bold text-xl drop-shadow-md">
                      ₹{reel.productPrice.toLocaleString()}
                    </p>
                  </div>

                  {/* Right Side: Actions */}
                  <div className="flex flex-col gap-6 items-center pointer-events-auto pl-4">
                    {/* Vendor Link */}
                    <Link
                      to={`/app/vendor/${getVendorIdFromProduct(reel.productId)}?productId=${reel.productId}`}
                      className="w-10 h-10 rounded-full border-2 border-white overflow-hidden"
                    >
                      <img src={reel.thumbnail} className="w-full h-full object-cover" alt="" />
                    </Link>

                    {/* Like */}
                    <button onClick={() => toggleLike(reel.id)} className="flex flex-col items-center gap-1">
                      <FiHeart className={`text-3xl ${likedReels.has(reel.id) ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                      <span className="text-white text-xs text-shadow-sm">{reel.likes + (likedReels.has(reel.id) ? 1 : 0)}</span>
                    </button>

                    {/* Comment */}
                    <button onClick={() => setActiveCommentReel(reel.id)} className="flex flex-col items-center gap-1">
                      <FiMessageCircle className="text-3xl text-white" />
                      <span className="text-white text-xs text-shadow-sm">{reel.comments}</span>
                    </button>

                    {/* Share */}
                    <button onClick={() => handleShareButton(reel)} className="flex flex-col items-center gap-1">
                      <FiShare2 className="text-3xl text-white" />
                      <span className="text-white text-xs text-shadow-sm">{shareCount[reel.id] || reel.shares}</span>
                    </button>

                    {/* More */}
                    <div className="relative">
                      <button onClick={() => setActiveOptionsReel(activeOptionsReel === reel.id ? null : reel.id)}>
                        <FiMoreVertical className="text-2xl text-white" />
                      </button>
                      {/* Popup Menu */}
                      <AnimatePresence>
                        {activeOptionsReel === reel.id && (
                          <>
                            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveOptionsReel(null)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-lg p-2 z-50 min-w-[150px]"
                            >
                              <button onClick={() => { setActiveOptionsReel(null); toast.success("Not interested"); }} className="w-full flex gap-2 p-2 hover:bg-gray-100 rounded text-sm text-black">
                                <FiX /> Not Interested
                              </button>
                              <button onClick={() => { setActiveOptionsReel(null); toast.success("Reported"); }} className="w-full flex gap-2 p-2 hover:bg-gray-100 rounded text-sm text-black">
                                <FiFlag /> Report
                              </button>
                              <button onClick={() => { navigate(`/app/product/${reel.productId}`); }} className="w-full flex gap-2 p-2 hover:bg-gray-100 rounded text-sm text-black">
                                <FiAlertCircle /> View Product
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Global Comments Modal (Outside scroll container) */}
        {createPortal(
          <AnimatePresence>
            {activeCommentReel && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveCommentReel(null)}
                  className="fixed inset-0 bg-black/80 z-[10000]"
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 rounded-t-2xl z-[10001] flex flex-col h-[70vh]"
                >
                  {/* Comments Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <h2 className="text-white">Comments</h2>
                    <button onClick={() => setActiveCommentReel(null)}>
                      <FiX className="text-white text-xl" />
                    </button>
                  </div>

                  {/* Comments Input */}
                  <div className="px-3 py-3 border-b border-gray-800">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => setCommentRating(star)} onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)}>
                          <FiStar className={`${star <= (hoveredRating || commentRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-gray-800 text-white rounded p-2 text-sm focus:outline-none"
                      />
                      <button onClick={handleSubmitComment} disabled={!newComment.trim()} className="bg-red-600 p-2 rounded text-white active:scale-95 transition-transform"><FiSend /></button>
                    </div>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {displayComments.map((c, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">{c.user[0]}</div>
                        <div>
                          <div className="flex gap-2 items-center">
                            <p className="text-white text-sm font-semibold">{c.user}</p>
                            <span className="text-gray-500 text-xs">{new Date(c.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-white text-sm">{c.comment.comment || c.comment}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Share Modal */}
        {createPortal(
          <AnimatePresence>
            {showShareModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowShareModal(false)}
                  className="fixed inset-0 bg-black/80 z-[10000]"
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[10001] p-6 pb-8"
                >
                  {/* Step 1: Initial Options */}
                  {shareStep === 'options' && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-xl font-bold text-center mb-2 text-black">Share</h3>

                      <button onClick={handleCopyLink} className="flex items-center gap-4 w-full p-4 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <FiCopy className="text-xl text-gray-700" />
                        </div>
                        <span className="font-semibold text-gray-800">Copy Link</span>
                      </button>

                      <button onClick={handleMegaRewardClick} className="flex items-center gap-4 w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white shadow-lg transform active:scale-98 transition-all">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <FiGift className="text-xl text-white" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-lg">Mega Reward</span>
                          <span className="text-xs text-white/80">Enter Lucky Draw!</span>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Step 2: Mega Reward Tasks */}
                  {shareStep === 'tasks' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold text-black">Complete Steps</h3>
                        <button onClick={() => setShowShareModal(false)}><FiX className="text-xl text-gray-500" /></button>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">Share this video on the following platforms to enter the lucky draw:</p>

                      {/* Instagram */}
                      <button
                        onClick={() => handleTaskClick('instagram')}
                        className={`flex items-center justify-between w-full p-4 rounded-xl border-2 transition-all ${rewardTasks.instagram ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <FaInstagram className="text-2xl text-pink-600" />
                          <span className="font-medium text-gray-800">Share on Instagram Story</span>
                        </div>
                        {rewardTasks.instagram && <FiCheckCircle className="text-green-500 text-xl" />}
                      </button>

                      {/* Facebook */}
                      <button
                        onClick={() => handleTaskClick('facebook')}
                        className={`flex items-center justify-between w-full p-4 rounded-xl border-2 transition-all ${rewardTasks.facebook ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <FaFacebook className="text-2xl text-blue-600" />
                          <span className="font-medium text-gray-800">Share on Facebook Story</span>
                        </div>
                        {rewardTasks.facebook && <FiCheckCircle className="text-green-500 text-xl" />}
                      </button>

                      {/* Whatsapp */}
                      <button
                        onClick={() => handleTaskClick('whatsapp')}
                        className={`flex items-center justify-between w-full p-4 rounded-xl border-2 transition-all ${rewardTasks.whatsapp ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <FaWhatsapp className="text-2xl text-green-600" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-gray-800">Share to 5 friends on WhatsApp</span>
                            <span className="text-xs text-gray-500">{Math.min(whatsappCount, 5)}/5 shared</span>
                          </div>
                        </div>
                        {rewardTasks.whatsapp && <FiCheckCircle className="text-green-500 text-xl" />}
                      </button>
                    </div>
                  )}

                  {/* Step 3: Success */}
                  {shareStep === 'success' && (
                    <div className="flex flex-col items-center justify-center py-8 text-center animate-bounce-in">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <FiGift className="text-4xl text-green-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h2>
                      <p className="text-gray-600 mb-4">You have successfully entered this month's lucky draw.</p>

                      {ticketId && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 w-full">
                          <p className="text-xs uppercase text-yellow-700 font-bold mb-1">Your Ticket Number</p>
                          <p className="text-2xl font-mono font-black text-gray-900 tracking-wider">{ticketId}</p>
                          <p className="text-[10px] text-gray-500 mt-1">Screenshot for future reference</p>
                        </div>
                      )}

                      <button
                        onClick={() => setShowShareModal(false)}
                        className="bg-black text-white px-8 py-3 rounded-xl font-medium"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

      </MobileLayout>
    </PageTransition>
  );
};

export default Reels;
