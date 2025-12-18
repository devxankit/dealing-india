import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiShare2, FiMoreVertical, FiX, FiFlag, FiAlertCircle, FiSend, FiStar } from 'react-icons/fi';
import { useWishlistStore } from '../../../shared/store/wishlistStore';
import { useReviewsStore } from '../../../shared/store/reviewsStore';
import { getProductById } from '../../../data/products';
import { getActiveReels } from '../../../shared/utils/reelHelpers';
import MobileLayout from '../components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';
import toast from 'react-hot-toast';

// Mock reel data - fallback when no vendor reels exist
// Using product-related sample videos that showcase fashion, accessories, and lifestyle products
const mockReels = [
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
  const [slideDirection, setSlideDirection] = useState(1); // 1 = next/down, -1 = prev/up
  const [posterMap, setPosterMap] = useState({});
  
  // Refresh reels data when component mounts
  useEffect(() => {
    const updatedReels = getReelsData();
    setReelsData(updatedReels);
  }, []);
  const [likedReels, setLikedReels] = useState(new Set());
  const [showProductInfo, setShowProductInfo] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [shareCount, setShareCount] = useState({});
  const [newComment, setNewComment] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [commentsUpdateTrigger, setCommentsUpdateTrigger] = useState(0);
  const videoRefs = useRef({});
  const containerRef = useRef(null);
  const commentsEndRef = useRef(null);
  const isSwipingRef = useRef(false); // Prevent multiple video changes during one swipe
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();
  const { getReviews, addReview } = useReviewsStore();

  // Prevent body scroll on reels page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  const currentReel = reelsData[currentIndex];
  
  // Get vendor ID from product
  const getVendorIdFromProduct = (productId) => {
    const product = getProductById(productId);
    return product?.vendorId || 1; // Default to vendor 1 if not found
  };

  // Handle video play/pause - pause ALL videos first, then play current
  useEffect(() => {
    // Immediately pause and mute ALL videos to prevent overlap
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.pause();
        video.muted = true;
      }
    });
    
    // Small delay to ensure previous video is stopped
    const timer = setTimeout(() => {
      const currentVideo = videoRefs.current[currentIndex];
      if (currentVideo) {
        if (isPlaying) {
          currentVideo.muted = false;
          const playPromise = currentVideo.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // Video is playing
              })
              .catch((error) => {
                console.error('Error playing video:', error);
                // Try again after a short delay
                setTimeout(() => {
                  currentVideo.play().catch(console.error);
                }, 100);
              });
          }
        } else {
          currentVideo.pause();
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentIndex, isPlaying]);

  // Handle video loaded data
  const handleVideoLoaded = (index) => {
    // Pause all videos first
    Object.entries(videoRefs.current).forEach(([idx, video]) => {
      if (video && parseInt(idx) !== index) {
        video.pause();
        video.muted = true;
      }
    });
    
    // Play only the current video
    const video = videoRefs.current[index];
    if (video && index === currentIndex && isPlaying) {
      video.muted = false;
      video.play().catch(console.error);

      // Capture a poster frame from the video to avoid black flashes
      const reel = reelsData[index];
      if (reel && !posterMap[reel.id] && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
            setPosterMap((prev) => ({ ...prev, [reel.id]: dataUrl }));
          }
        } catch (err) {
          // Ignore CORS or canvas errors; fallback to no poster
          console.warn("Poster capture failed", err);
        }
      }
    }
  };

  // Auto-play next reel when current ends
  const handleVideoEnd = () => {
    if (currentIndex < reelsData.length - 1) {
      Object.values(videoRefs.current).forEach((video) => {
        if (video) {
          video.pause();
          video.muted = true;
        }
      });
      setSlideDirection(1);
      setCurrentIndex((prev) => Math.min(prev + 1, reelsData.length - 1));
    }
  };

  // Handle swipe gestures
  const handleWheel = (e) => {
    if (isSwipingRef.current) return; // Prevent multiple triggers
    
    if (Math.abs(e.deltaY) > 50) {
      isSwipingRef.current = true;
      setSlideDirection(e.deltaY > 0 ? 1 : -1);
      
      // Pause all videos before switching
      Object.values(videoRefs.current).forEach((video) => {
        if (video) {
          video.pause();
          video.muted = true;
        }
      });
      
      if (e.deltaY > 0 && currentIndex < reelsData.length - 1) {
        setCurrentIndex((prev) => Math.min(prev + 1, reelsData.length - 1));
      } else if (e.deltaY < 0 && currentIndex > 0) {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
      
      // Reset flag after a short delay
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 500);
    }
  };

  // Touch swipe handling
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartElementRef = useRef(null); // Track which element touch started on

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    // Prevent new swipe if already processing one
    if (isSwipingRef.current) {
      return;
    }
    
    // Store the element where touch started
    touchStartElementRef.current = e.target;
    
    const touch = e.targetTouches[0];
    setTouchEnd(null);
    setTouchStart(touch.clientY);
    setIsSwiping(false);
  };

  const onTouchMove = (e) => {
    if (touchStart !== null && !isSwipingRef.current) {
      const touch = e.targetTouches[0];
      setTouchEnd(touch.clientY);
      setIsSwiping(true);
    }
  };

  const onTouchEnd = (e) => {
    // Prevent multiple triggers during one swipe
    if (isSwipingRef.current) {
      setTouchStart(null);
      setTouchEnd(null);
      setIsSwiping(false);
      touchStartElementRef.current = null;
      return;
    }
    
    if (touchStart === null) {
      return;
    }
    
    // Check if touch ended on a button or interactive element
    const touchEndElement = e.target || e.changedTouches[0]?.target;
    const isButtonClick = touchStartElementRef.current && (
      touchStartElementRef.current.closest('button') ||
      touchStartElementRef.current.closest('a') ||
      touchStartElementRef.current.closest('[role="button"]')
    ) && (
      touchEndElement?.closest('button') ||
      touchEndElement?.closest('a') ||
      touchEndElement?.closest('[role="button"]')
    );
    
    // If it's a button click, don't trigger swipe
    if (isButtonClick) {
      setTouchStart(null);
      setTouchEnd(null);
      setIsSwiping(false);
      touchStartElementRef.current = null;
      return;
    }
    
    // If touchEnd is null, use touchStart as fallback (no movement)
    const endY = touchEnd !== null ? touchEnd : touchStart;
    const distance = touchStart - endY;
    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isUpSwipe && currentIndex < reelsData.length - 1) {
      isSwipingRef.current = true;
      // Swipe up -> next reel (enter from bottom, exit to top)
      setSlideDirection(1);
      
      // Pause all videos before switching
      Object.values(videoRefs.current).forEach((video) => {
        if (video) {
          video.pause();
          video.muted = true;
        }
      });
      
      setCurrentIndex((prev) => Math.min(prev + 1, reelsData.length - 1));
      
      // Reset flag after transition completes
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 500);
    } else if (isDownSwipe && currentIndex > 0) {
      isSwipingRef.current = true;
      // Swipe down -> previous reel (enter from top, exit to bottom)
      setSlideDirection(-1);
      
      // Pause all videos before switching
      Object.values(videoRefs.current).forEach((video) => {
        if (video) {
          video.pause();
          video.muted = true;
        }
      });
      
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
      
      // Reset flag after transition completes
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 500);
    }

    setTouchStart(null);
    setTouchEnd(null);
    setIsSwiping(false);
    touchStartElementRef.current = null;
  };

  const toggleLike = () => {
    const newLikedReels = new Set(likedReels);
    if (newLikedReels.has(currentReel.id)) {
      newLikedReels.delete(currentReel.id);
    } else {
      newLikedReels.add(currentReel.id);
    }
    setLikedReels(newLikedReels);
  };

  const handleAddToWishlist = () => {
    if (isInWishlist(currentReel.productId)) {
      removeFromWishlist(currentReel.productId);
    } else {
      addToWishlist({
        id: currentReel.productId,
        name: currentReel.productName,
        price: currentReel.productPrice,
        image: currentReel.thumbnail,
      });
    }
  };

  // Handle share functionality
  const handleShare = async () => {
    const reelUrl = `${window.location.origin}/app/reels?reel=${currentReel.id}`;
    const shareText = `Check out ${currentReel.productName} from ${currentReel.vendorName}!`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: currentReel.productName,
          text: shareText,
          url: reelUrl,
        });
        // Increment share count
        setShareCount(prev => ({
          ...prev,
          [currentReel.id]: (prev[currentReel.id] || currentReel.shares) + 1
        }));
        toast.success('Shared successfully!');
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(reelUrl);
        toast.success('Link copied to clipboard!');
        setShareCount(prev => ({
          ...prev,
          [currentReel.id]: (prev[currentReel.id] || currentReel.shares) + 1
        }));
      }
    } catch (error) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  // Handle comment button
  const handleComment = () => {
    setShowComments(true);
  };

  // Mock comments - always show these
  const mockComments = [
    {
      id: '1',
      user: 'Sarah M.',
      comment: 'Love this product! The quality is amazing and it looks exactly like in the video. Highly recommend!',
      rating: 5,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      helpfulCount: 12,
    },
    {
      id: '2',
      user: 'John D.',
      comment: 'Great video showcasing the product. Ordered one and it arrived quickly. Very satisfied!',
      rating: 4,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      helpfulCount: 8,
    },
    {
      id: '3',
      user: 'Emma L.',
      comment: 'The video really shows the product well. I was hesitant at first but after seeing this, I had to get it!',
      rating: 5,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      helpfulCount: 15,
    },
  ];

  // Get comments for current reel/product - combine user comments with mock comments
  const displayComments = useMemo(() => {
    const reelComments = getReviews(currentReel.productId) || [];
    // Combine user comments with mock comments, user comments first (newest first)
    const sortedUserComments = [...reelComments].sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA; // Newest first
    });
    return [...sortedUserComments, ...mockComments];
  }, [currentReel.productId, commentsUpdateTrigger]);

  // Handle submit comment
  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (commentRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    addReview(currentReel.productId, {
      user: 'You',
      comment: newComment,
      rating: commentRating,
      date: new Date().toISOString(),
      title: `Review for ${currentReel.productName}`,
    });

    setNewComment('');
    setCommentRating(5); // Reset to default
    setHoveredRating(0);
    setCommentsUpdateTrigger(prev => prev + 1); // Trigger comments update
    toast.success('Comment added!');
    
    // Scroll to top to show the new comment (since it's added first)
    setTimeout(() => {
      const commentsContainer = document.querySelector('.comments-list-container');
      if (commentsContainer) {
        commentsContainer.scrollTop = 0;
      }
    }, 200);
  };

  // Scroll to bottom when comments open
  useEffect(() => {
    if (showComments) {
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [showComments]);

  // Handle more options
  const handleReport = () => {
    toast.success('Report submitted. Thank you for your feedback.');
    setShowMoreOptions(false);
  };

  const handleNotInterested = () => {
    // Remove this reel from view (in a real app, this would filter it out)
    toast.success('We\'ll show you less content like this.');
    setShowMoreOptions(false);
  };

  return (
    <PageTransition>
      <MobileLayout>
        <div
          ref={containerRef}
          className="relative w-full bg-black overflow-hidden"
          onWheel={handleWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ 
            touchAction: 'pan-y',
            height: 'calc(100vh - 64px)', // Account for bottom nav (h-16 = 64px)
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: '64px', // Bottom nav height (h-16 = 64px)
            zIndex: 1,
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}>
          {/* Video Container */}
          <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentReel.id}
                initial={{ opacity: 0, y: slideDirection === 1 ? 200 : -200, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: slideDirection === 1 ? -200 : 200, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute inset-0 w-full h-full"
                onAnimationStart={() => {
                  // Pause all videos when animation starts (switching)
                  Object.values(videoRefs.current).forEach((video) => {
                    if (video) {
                      video.pause();
                      video.muted = true;
                    }
                  });
                }}>
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs.current[currentIndex] = el;
                      // Immediately pause if this is not the current video
                      if (el && !isPlaying) {
                        el.pause();
                        el.muted = true;
                      }
                    }
                  }}
                  src={currentReel.videoUrl}
                  className="w-full h-full object-cover"
                  loop={false}
                  muted={false}
                  autoPlay
                  playsInline
                  poster={posterMap[currentReel.id]}
                  controls={false}
                  preload="auto"
                  onLoadedData={() => handleVideoLoaded(currentIndex)}
                  onEnded={handleVideoEnd}
                  onClick={() => setIsPlaying(!isPlaying)}
                />
              </motion.div>
            </AnimatePresence>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Product Info Overlay */}
            <AnimatePresence>
              {showProductInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-1">
                        {currentReel.productName}
                      </h3>
                      <p className="text-white/80 text-sm mb-2">
                        {currentReel.vendorName}
                      </p>
                      <p className="text-white font-bold text-xl">
                        ₹{currentReel.productPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center">
              {/* Profile Avatar - Link to Vendor Store */}
              <Link
                to={`/app/vendor/${getVendorIdFromProduct(currentReel.productId)}?productId=${currentReel.productId}`}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="w-12 h-12 rounded-full border-2 border-white overflow-hidden hover:border-red-500 transition-colors cursor-pointer">
                <img
                  src={currentReel.thumbnail}
                  alt={currentReel.vendorName}
                  className="w-full h-full object-cover"
                />
              </Link>

              {/* Like Button */}
              <button
                onClick={toggleLike}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1">
                <motion.div
                  animate={{ scale: likedReels.has(currentReel.id) ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3 }}>
                  <FiHeart
                    className={`text-3xl ${
                      likedReels.has(currentReel.id)
                        ? 'text-red-500 fill-red-500'
                        : 'text-white'
                    }`}
                  />
                </motion.div>
                <span className="text-white text-xs font-medium">
                  {currentReel.likes + (likedReels.has(currentReel.id) ? 1 : 0)}
                </span>
              </button>

              {/* Comment Button */}
              <button 
                onClick={handleComment}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity">
                <FiMessageCircle className="text-3xl text-white" />
                <span className="text-white text-xs font-medium">
                  {currentReel.comments}
                </span>
              </button>

              {/* Share Button */}
              <button 
                onClick={handleShare}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity">
                <FiShare2 className="text-3xl text-white" />
                <span className="text-white text-xs font-medium">
                  {shareCount[currentReel.id] || currentReel.shares}
                </span>
              </button>

              {/* More Options */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="hover:opacity-80 transition-opacity">
                  <FiMoreVertical className="text-2xl text-white" />
                </button>
                
                {/* More Options Menu */}
                <AnimatePresence>
                  {showMoreOptions && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMoreOptions(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 z-50 min-w-[180px]">
                        <button
                          onClick={handleNotInterested}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left">
                          <FiX className="text-gray-600 text-lg" />
                          <span className="font-medium text-gray-700 text-sm">Not Interested</span>
                        </button>
                        <button
                          onClick={handleReport}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left">
                          <FiFlag className="text-gray-600 text-lg" />
                          <span className="font-medium text-gray-700 text-sm">Report</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/app/product/${currentReel.productId}`);
                            setShowMoreOptions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left">
                          <FiAlertCircle className="text-gray-600 text-lg" />
                          <span className="font-medium text-gray-700 text-sm">View Product</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>

        {/* Comments Modal */}
        <AnimatePresence>
          {showComments && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowComments(false)}
                className="fixed inset-0 bg-black/80 z-[10000]"
              />

              {/* Comments Panel */}
              <motion.div
                key={`comments-${currentReel.id}`}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-black border-t border-l border-r border-gray-800 rounded-t-2xl z-[10001] flex flex-col shadow-[0_-2px_10px_rgba(255,255,255,0.1)]"
                style={{ 
                  height: '70vh',
                  maxHeight: '70vh',
                  minHeight: '70vh'
                }}
                onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <h2 className="text-white font-semibold text-base">
                    {displayComments.length} Comments
                  </h2>
                  <button
                    onClick={() => setShowComments(false)}
                    className="p-1.5 hover:bg-gray-800 rounded-full transition-colors">
                    <FiX className="text-white text-lg" />
                  </button>
                </div>

                {/* Comment Input - At Top */}
                <div className="px-3 py-3 border-b border-gray-800 bg-black">
                  {/* Rating Selector */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-400 text-xs">Rating:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCommentRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="focus:outline-none">
                          <FiStar
                            className={`text-base transition-colors ${
                              star <= (hoveredRating || commentRating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-500'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Comment Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                      placeholder="Write a comment..."
                      className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm border border-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || commentRating === 0}
                      className="p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                      <FiSend className="text-base" />
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-hide comments-list-container bg-black">
                  {displayComments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-800/30 border border-gray-800/50 rounded-lg p-3 hover:bg-gray-800/40 transition-colors">
                      {/* Comment Header */}
                      <div className="flex items-start gap-2.5 mb-1.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {comment.user?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-white font-medium text-xs">
                              {comment.user || 'Anonymous'}
                            </p>
                            {comment.rating && (
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <FiStar
                                    key={i}
                                    className={`text-[10px] ${
                                      i < comment.rating
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-500'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-gray-400 text-[10px]">
                            {comment.date
                              ? new Date(comment.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Recently'}
                          </p>
                        </div>
                      </div>

                      {/* Comment Text */}
                      <p className="text-white/90 text-xs leading-relaxed ml-[42px]">
                        {comment.comment || comment.text}
                      </p>

                      {/* Helpful Count */}
                      {comment.helpfulCount > 0 && (
                        <div className="mt-1.5 ml-[42px]">
                          <span className="text-gray-400 text-[10px]">
                            {comment.helpfulCount} helpful
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </MobileLayout>
    </PageTransition>
  );
};

export default Reels;

