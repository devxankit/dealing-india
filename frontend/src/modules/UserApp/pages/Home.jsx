import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import MobileLayout from "../components/Layout/MobileLayout";
import ProductCard from "../../../shared/components/ProductCard";
import AnimatedBanner from "../components/Mobile/AnimatedBanner";
import NewArrivalsSection from "../components/Mobile/NewArrivalsSection";
import DailyDealsSection from "../components/Mobile/DailyDealsSection";
import RecommendedSection from "../components/Mobile/RecommendedSection";
import FeaturedVendorsSection from "../components/Mobile/FeaturedVendorsSection";
import BrandLogosScroll from "../../UserWeb/components/Home/BrandLogosScroll";
import LazyImage from "../../../shared/components/LazyImage";
import {
  getMostPopular,
  getTrending,
  getFlashSale,
} from "../../../data/products";
import { categories } from "../../../data/categories";
import PageTransition from "../../../shared/components/PageTransition";
import usePullToRefresh from "../hooks/usePullToRefresh";
import toast from "react-hot-toast";
import heroSlide1 from "../../../../data/hero/slide1.png";
import heroSlide2 from "../../../../data/hero/slide2.png";
import heroSlide3 from "../../../../data/hero/slide3.png";
import heroSlide4 from "../../../../data/hero/slide4.png";
import heroBanner2 from "../../../../data/hero/banner2.png";
import babycareBanner from "../../../../data/banners/babycare-WEB.avif";
import pharmacyBanner from "../../../../data/banners/pharmacy-WEB.avif";
import petCareBanner from "../../../../data/banners/Pet-Care_WEB.avif";

const MobileHome = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [autoSlidePaused, setAutoSlidePaused] = useState(false);

  const slides = [
    { image: heroSlide1 },
    { image: heroSlide2 },
    { image: heroSlide3 },
    { image: heroSlide4 },
  ];

  const mostPopular = getMostPopular();
  const trending = getTrending();
  const flashSale = getFlashSale();

  // Auto-slide functionality (pauses when user is dragging)
  useEffect(() => {
    if (autoSlidePaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, autoSlidePaused]);

  // Minimum swipe distance (in pixels) to trigger slide change
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    e.stopPropagation(); // Prevent pull-to-refresh from interfering
    setTouchEnd(null);
    const touch = e.targetTouches[0];
    setTouchStart(touch.clientX);
    setDragOffset(0);
    setAutoSlidePaused(true);
  };

  const onTouchMove = (e) => {
    if (touchStart === null) return;
    e.stopPropagation(); // Prevent pull-to-refresh from interfering
    const touch = e.targetTouches[0];
    const currentX = touch.clientX;
    // Calculate difference: positive when swiping left, negative when swiping right
    const diff = touchStart - currentX;
    // Constrain the drag offset to prevent over-dragging
    // Use container width for better responsiveness
    const containerWidth = e.currentTarget?.offsetWidth || 400;
    const maxDrag = containerWidth * 0.5; // Maximum drag distance (50% of container)
    // dragOffset: positive = swiping left (show next), negative = swiping right (show previous)
    setDragOffset(Math.max(-maxDrag, Math.min(maxDrag, diff)));
    setTouchEnd(currentX);
  };

  const onTouchEnd = (e) => {
    if (e) e.stopPropagation(); // Prevent pull-to-refresh from interfering

    if (touchStart === null) {
      setAutoSlidePaused(false);
      return;
    }

    // Calculate swipe distance: positive = left swipe, negative = right swipe
    const distance = touchStart - (touchEnd || touchStart);
    const isLeftSwipe = distance > minSwipeDistance; // Finger moved left = show next slide
    const isRightSwipe = distance < -minSwipeDistance; // Finger moved right = show previous slide

    if (isLeftSwipe) {
      // Swipe left (finger moved left) - go to next slide (slide moves left)
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    } else if (isRightSwipe) {
      // Swipe right (finger moved right) - go to previous slide (slide moves right)
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }

    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
    setDragOffset(0);

    // Resume auto-slide after a short delay
    setTimeout(() => {
      setAutoSlidePaused(false);
    }, 2000);
  };

  // Pull to refresh handler
  const handleRefresh = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        toast.success("Refreshed");
        resolve();
      }, 1000);
    });
  };

  const {
    pullDistance,
    isPulling,
    isRefreshing,
    elementRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh(handleRefresh);

  return (
    <PageTransition>
      <MobileLayout>
        <div
          ref={elementRef}
          className="w-full min-h-screen bg-gray-50"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateY(${Math.min(pullDistance, 80)}px)`,
            transition: isPulling ? "none" : "transform 0.3s ease-out",
          }}>
          {/* Hero Banner */}
          <div className="px-4 py-4">
            <div
              className="relative w-full h-48 rounded-2xl overflow-hidden shadow-lg shadow-gray-200/50"
              data-carousel
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{ touchAction: "pan-y", userSelect: "none" }}>
              {/* Slider Container - All slides in a row */}
              <motion.div
                className="flex h-full"
                style={{
                  width: `${slides.length * 100}%`,
                  height: "100%",
                }}
                animate={{
                  x:
                    dragOffset !== 0
                      ? `calc(-${currentSlide * (100 / slides.length)
                      }% - ${dragOffset}px)`
                      : `-${currentSlide * (100 / slides.length)}%`,
                }}
                transition={{
                  duration: dragOffset !== 0 ? 0 : 0.6,
                  ease: [0.25, 0.46, 0.45, 0.94], // Smooth easing
                  type: "tween",
                }}>
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0"
                    style={{
                      width: `${100 / slides.length}%`,
                      height: "100%",
                    }}>
                    <LazyImage
                      src={slide.image}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none select-none"
                      draggable={false}
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/400x200?text=Slide+${index + 1
                          }`;
                      }}
                    />
                  </div>
                ))}
              </motion.div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10 pointer-events-none">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentSlide(index);
                      setAutoSlidePaused(true);
                      setTimeout(() => setAutoSlidePaused(false), 2000);
                    }}
                    className={`h-1.5 rounded-full transition-all pointer-events-auto shadow-sm ${index === currentSlide
                        ? "bg-white w-6"
                        : "bg-white/50 w-1.5 backdrop-blur-sm"
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Brand Logos Scroll */}
          <div className="bg-white py-2 shadow-sm mb-4">
            <BrandLogosScroll />
          </div>

          {/* Featured Vendors Section */}
          <FeaturedVendorsSection />

          {/* Animated Banner */}
          <div className="my-4">
            <AnimatedBanner />
          </div>

          {/* New Arrivals */}
          <div className="px-2">
            <NewArrivalsSection />
          </div>

          {/* Premium Curated Collections */}
          <div className="py-2 mb-2">
            <div className="px-4 mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Curated Collections</h2>
              <Link to="/app/categories" className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">View All</Link>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-4 snap-x snap-mandatory">
              {[
                { img: babycareBanner, title: "Baby Care", sub: "Gentle Essentials", link: "/app/offers", color: "from-pink-500" },
                { img: pharmacyBanner, title: "Pharmacy", sub: "Health First", link: "/app/offers", color: "from-blue-500" },
                { img: petCareBanner, title: "Pet Supplies", sub: "For Furry Friends", link: "/app/offers", color: "from-orange-500" }
              ].map((item, idx) => (
                <Link to={item.link} key={idx} className="block flex-shrink-0 snap-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative w-[75vw] h-44 rounded-2xl overflow-hidden shadow-lg shadow-gray-200"
                  >
                    <LazyImage
                      src={item.img}
                      className="w-full h-full object-cover transition-transform duration-700"
                      alt={item.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className={`w-8 h-1 mb-3 rounded-full bg-gradient-to-r ${item.color} to-white/50`}></div>
                      <h3 className="text-white font-bold text-2xl leading-none mb-1 tracking-tight">{item.title}</h3>
                      <p className="text-white/80 text-sm font-medium tracking-wide">{item.sub}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Most Popular */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Most Popular</h2>
              <Link
                to="/app/search"
                className="text-sm text-green-600 font-semibold hover:text-green-700 transition-colors">
                See All
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {mostPopular.slice(0, 6).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Daily Deals */}
          <DailyDealsSection />

          {/* Trending Banner */}
          <div className="px-4 py-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative w-full h-40 rounded-xl overflow-hidden shadow-lg">
              <LazyImage
                src={heroBanner2}
                alt="Trending Items Banner"
                className="w-full h-full object-cover object-center"
                context="hero"
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/1200x300?text=Banner";
                }}
              />
            </motion.div>
          </div>

          {/* Flash Sale */}
          {flashSale.length > 0 && (
            <div className="px-4 py-4 bg-gradient-to-br from-red-50 to-orange-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Flash Sale
                  </h2>
                  <p className="text-xs text-gray-600">Limited time offers</p>
                </div>
                <Link
                  to="/app/flash-sale"
                  className="text-sm text-green-600 font-semibold hover:text-green-700 transition-colors">
                  See All
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {flashSale.slice(0, 4).map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Items */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Trending Now</h2>
              <Link
                to="/app/search"
                className="text-sm text-green-600 font-semibold hover:text-green-700 transition-colors">
                See All
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {trending.slice(0, 6).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recommended for You */}
          <RecommendedSection />

          {/* Tagline Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="px-4 py-12 text-left">
            <motion.h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-400 leading-tight flex items-center justify-start gap-3 flex-wrap"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}>
              <span>Shop from 50+ Trusted Vendors</span>
              <motion.span
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
                className="text-green-500 inline-block">
                <FiHeart className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl fill-green-500" />
              </motion.span>
            </motion.h2>
          </motion.div>

          {/* Bottom Spacing */}
          <div className="h-4" />
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileHome;
