import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import Header from "../components/Layout/Header";
import Navbar from "../components/Layout/Navbar";
import Footer from "../components/Layout/Footer";
import HeroBanner from "../components/Home/HeroBanner";
import BrandLogosScroll from "../components/Home/BrandLogosScroll";
import CategoriesSection from "../components/Home/CategoriesSection";
import PromotionalBanners from "../components/Home/PromotionalBanners";
import MostPopularSection from "../components/Home/MostPopularSection";
import TrendingBanner from "../components/Home/TrendingBanner";
import TrendingItemsSection from "../components/Home/TrendingItemsSection";
import FlashSaleSection from "../components/Home/FlashSaleSection";
import PopularBrandsSection from "../components/Home/PopularBrandsSection";
import FeaturesSection from "../components/Home/FeaturesSection";
import AnimatedBanner from "../../UserApp/components/Mobile/AnimatedBanner";
import NewArrivalsSection from "../../UserApp/components/Mobile/NewArrivalsSection";
import DailyDealsSection from "../../UserApp/components/Mobile/DailyDealsSection";
import ProductCard from "../../../shared/components/ProductCard";
import LazyImage from "../../../shared/components/LazyImage";
import {
  getMostPopular,
  getTrending,
  getFlashSale,
  getRecommendedProducts,
} from "../../../data/products";
import { FiThumbsUp, FiArrowRight } from "react-icons/fi";
import PageTransition from "../../../shared/components/PageTransition";
import useResponsiveHeaderPadding from "../../../shared/hooks/useResponsiveHeaderPadding";
import heroSlide1 from "../../../../data/hero/slide1.png";
import heroSlide2 from "../../../../data/hero/slide2.png";
import heroSlide3 from "../../../../data/hero/slide3.png";
import heroSlide4 from "../../../../data/hero/slide4.png";
import heroBanner2 from "../../../../data/hero/banner2.png";
import babycareBanner from "../../../../data/banners/babycare-WEB.avif";
import pharmacyBanner from "../../../../data/banners/pharmacy-WEB.avif";
import petCareBanner from "../../../../data/banners/Pet-Care_WEB.avif";

const Home = () => {
  const { responsivePadding } = useResponsiveHeaderPadding();
  const [currentSlide, setCurrentSlide] = useState(0);
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
  const recommended = getRecommendedProducts(12);

  // Auto-slide functionality
  useEffect(() => {
    if (autoSlidePaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, autoSlidePaused]);

  // Ensure body scroll is restored when component mounts
  useEffect(() => {
    document.body.style.overflowY = "";
    return () => {
      document.body.style.overflowY = "";
    };
  }, []);

  return (
    <PageTransition>
      <div
        className="min-h-screen w-full overflow-x-hidden"
        style={{ backgroundColor: "rgba(241,242,244,1.00)" }}>
        <Header />
        <Navbar />
        <main
          className="w-full overflow-x-hidden"
          style={{ paddingTop: `${responsivePadding}px` }}>
          {/* Desktop Layout - Redesigned with multi-column layout */}
          <div className="hidden md:block">
            <div
              className="mx-auto desktop-container"
              style={{ maxWidth: "996px", padding: "0 12px" }}>
              {/* Hero Banner Carousel */}
              <div className="py-4">
                <div
                  className="relative w-full h-64 rounded-2xl overflow-hidden shadow-xl cursor-pointer"
                  onMouseEnter={() => setAutoSlidePaused(true)}
                  onMouseLeave={() => setAutoSlidePaused(false)}>
                  <AnimatePresence mode="wait">
                    {slides.map((slide, index) => {
                      if (index !== currentSlide) return null;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 1.05 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.6 }}
                          className="absolute inset-0">
                          <LazyImage
                            src={slide.image}
                            alt={`Slide ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = `https://via.placeholder.com/1200x400?text=Slide+${
                                index + 1
                              }`;
                            }}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentSlide(index);
                          setAutoSlidePaused(true);
                          setTimeout(() => setAutoSlidePaused(false), 2000);
                        }}
                        className={`h-2 rounded-full transition-all ${
                          index === currentSlide
                            ? "bg-white w-8"
                            : "bg-white/50 w-2"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Brand Logos Scroll */}
              <div className="py-3">
                <BrandLogosScroll />
              </div>

              {/* Animated Banner */}
              <div className="py-3">
                <AnimatedBanner />
              </div>

              {/* New Arrivals Section */}
              <div className="py-4">
                <NewArrivalsSection />
              </div>

              {/* Promotional Banners - Grid Layout with more banners */}
              <div className="py-4">
                <div className="grid grid-cols-4 gap-3">
                  <Link to="/app/offers" className="block">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="relative w-full h-32 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <LazyImage
                        src={babycareBanner}
                        alt="Baby Care"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/400x200?text=Baby+Care";
                        }}
                      />
                    </motion.div>
                  </Link>
                  <Link to="/app/offers" className="block">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="relative w-full h-32 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <LazyImage
                        src={pharmacyBanner}
                        alt="Pharmacy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/400x200?text=Pharmacy";
                        }}
                      />
                    </motion.div>
                  </Link>
                  <Link to="/app/offers" className="block">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="relative w-full h-32 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <LazyImage
                        src={petCareBanner}
                        alt="Pet Care"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/400x200?text=Pet+Care";
                        }}
                      />
                    </motion.div>
                  </Link>
                  <Link to="/app/offers" className="block">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="relative w-full h-32 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <LazyImage
                        src={babycareBanner}
                        alt="Special Offers"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/400x200?text=Special+Offers";
                        }}
                      />
                    </motion.div>
                  </Link>
                </div>
              </div>

              {/* Most Popular Section - 6-column Grid with more products */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Most Popular
                  </h2>
                  <Link
                    to="/app/search"
                    className="text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                    See All
                  </Link>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {mostPopular.slice(0, 12).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Daily Deals Section */}
              <div className="py-4">
                <DailyDealsSection />
              </div>

              {/* Trending Banner */}
              <div className="py-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative w-full h-48 rounded-xl overflow-hidden shadow-lg">
                  <LazyImage
                    src={heroBanner2}
                    alt="Trending Items Banner"
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/1200x300?text=Banner";
                    }}
                  />
                </motion.div>
              </div>

              {/* Flash Sale Section - 6-column Grid with more products */}
              {flashSale.length > 0 && (
                <div className="py-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl px-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">
                        Flash Sale
                      </h2>
                      <p className="text-sm text-gray-600">
                        Limited time offers
                      </p>
                    </div>
                    <Link
                      to="/app/flash-sale"
                      className="text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                      See All
                    </Link>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {flashSale.slice(0, 12).map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}>
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Items Section - 6-column Grid with more products */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Trending Now
                  </h2>
                  <Link
                    to="/app/search"
                    className="text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                    See All
                  </Link>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {trending.slice(0, 12).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recommended Section - 6-column Grid with more products */}
              {recommended.length > 0 && (
                <div className="py-4 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/40 rounded-2xl px-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-md">
                        <FiThumbsUp className="text-white text-lg" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 leading-tight">
                          Recommended for You
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Curated just for you
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/app/search"
                      className="flex items-center gap-1 text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                      <span>See All</span>
                      <FiArrowRight className="text-sm" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {recommended.slice(0, 12).map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}>
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Product Sections - Best Sellers */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Best Sellers
                  </h2>
                  <Link
                    to="/app/search"
                    className="text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                    See All
                  </Link>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {mostPopular.slice(12, 18).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Tagline Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="py-8 text-left">
                <motion.h2
                  className="text-5xl lg:text-6xl font-black text-gray-400 leading-tight flex items-center justify-start gap-3 flex-wrap"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 }}>
                  <span>Bringing Shopping to Your Fingertips.</span>
                  <motion.span
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                    className="text-red-500 inline-block">
                    <FiHeart className="text-6xl lg:text-7xl fill-red-500" />
                  </motion.span>
                </motion.h2>
              </motion.div>
            </div>
          </div>

          {/* Mobile Layout - Unchanged */}
          <div className="md:hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <HeroBanner />
              <BrandLogosScroll />
              <CategoriesSection />
              <PromotionalBanners />
              <MostPopularSection />
              <TrendingBanner />
              <TrendingItemsSection />
              <FlashSaleSection />
              <PopularBrandsSection />
              <FeaturesSection />
            </div>
          </div>
          <style>{`
            @media (min-width: 1280px) {
              .desktop-container {
                max-width: 1600px !important;
                padding: 0 16px !important;
              }
            }
          `}</style>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Home;
