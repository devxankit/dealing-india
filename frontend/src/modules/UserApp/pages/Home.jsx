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
import { categories } from "../../../data/categories";
import PageTransition from "../../../shared/components/PageTransition";
import usePullToRefresh from "../hooks/usePullToRefresh";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import { getProducts } from "../../../shared/services/productService";
import { useCampaignStore } from "../../../shared/store/campaignStore";

const MobileHome = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [autoSlidePaused, setAutoSlidePaused] = useState(false);
  const [sliders, setSliders] = useState([]);
  const [isLoadingSliders, setIsLoadingSliders] = useState(true);
  const [mostPopular, setMostPopular] = useState([]);
  const [trending, setTrending] = useState([]);
  const [flashSale, setFlashSale] = useState([]);
  const [dailyDeals, setDailyDeals] = useState([]); // Separate state for Daily Deals products
  const [dailyDealCampaign, setDailyDealCampaign] = useState(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  // Individual loading states for better UX
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingFlashSale, setIsLoadingFlashSale] = useState(true);
  const [isLoadingDailyDeals, setIsLoadingDailyDeals] = useState(true);

  // Fetch sliders from API
  useEffect(() => {
    const fetchSliders = async () => {
      try {
        setIsLoadingSliders(true);
        const response = await api.get("/sliders");
        if (response.success && response.data?.sliders && response.data.sliders.length > 0) {
          // Transform API sliders to match the expected format
          const formattedSliders = response.data.sliders.map((slider) => ({
            image: slider.imageUrl || slider.image,
            link: slider.link || "/app/search",
            id: slider.id || slider._id,
            title: slider.title,
          }));
          setSliders(formattedSliders);
        }
      } catch (error) {
        console.error("Failed to fetch sliders:", error);
        toast.error("Failed to load sliders");
      } finally {
        setIsLoadingSliders(false);
      }
    };

    fetchSliders();
  }, []);

  // Transform products to match frontend format
  const transformProduct = (product) => {
    // Handle vendor data - can be ObjectId or populated object
    const vendor = product.vendorId;
    const vendorData = vendor && typeof vendor === 'object' && (vendor._id || vendor.id)
      ? {
          id: (vendor._id || vendor.id).toString(),
          _id: vendor._id || vendor.id,
          storeName: vendor.storeName || vendor.businessName || vendor.name,
          businessName: vendor.businessName,
          name: vendor.name,
          storeLogo: vendor.storeLogo || vendor.logo,
          isVerified: vendor.isVerified !== undefined 
            ? vendor.isVerified 
            : (vendor.status === 'approved' || vendor.isEmailVerified || false),
        }
      : null;
    
    return {
      id: product._id || product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      images: product.images || [],
      unit: product.unit || 'Piece',
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0,
      stock: product.stock,
      stockQuantity: product.stockQuantity,
      vendorId: vendorData?.id || (typeof vendor === 'object' ? vendor?._id?.toString() : vendor?.toString() || vendor),
      vendor: vendorData,
      flashSale: product.flashSale || false,
    };
  };

  // Fetch products from API - PARALLEL FETCHING for better performance
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setIsLoadingPopular(true);
        setIsLoadingTrending(true);
        setIsLoadingFlashSale(true);
        setIsLoadingDailyDeals(true);
        
        // Fetch all products and campaigns in PARALLEL for faster loading
        const [popularResponse, trendingResponse, flashSaleResponse, campaignData] = await Promise.allSettled([
          // Most popular products
          getProducts({
            limit: 6,
            sortBy: 'rating',
            sortOrder: 'desc',
            minReviewCount: 1,
          }),
          // Trending products
          getProducts({
            limit: 6,
            sortBy: 'rating',
            sortOrder: 'desc',
            isTrending: true,
          }),
          // Flash Sale products
          getProducts({
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            flashSale: true,
          }),
          // Daily Deals campaigns - force refresh to get latest data
          (async () => {
            try {
              const campaignStore = useCampaignStore.getState();
              // Force refresh to ensure we get latest campaigns (including deletions)
              await campaignStore.initializePublic({ type: 'daily_deal', limit: 100 }, true);
              return campaignStore.getPublicCampaignsByType('daily_deal');
            } catch (error) {
              console.error('Error fetching campaigns:', error);
              return [];
            }
          })(),
        ]);

        // Helper function to extract products from response
        const extractProducts = (response) => {
          if (!response) return [];
          // Handle different response structures
          if (response.data?.products && Array.isArray(response.data.products)) {
            return response.data.products;
          } else if (Array.isArray(response.products)) {
            return response.products;
          } else if (Array.isArray(response)) {
            return response;
          }
          console.warn('Unexpected response structure:', response);
          return [];
        };

        // Process popular products
        if (popularResponse.status === 'fulfilled') {
          try {
            const response = popularResponse.value;
            const products = extractProducts(response);
            if (products.length > 0) {
              const popularProducts = products.map(transformProduct).filter(p => p && p.id);
              setMostPopular(popularProducts);
            } else {
              setMostPopular([]);
            }
          } catch (error) {
            console.error("Error processing popular products:", error);
            setMostPopular([]);
          }
        } else {
          console.error("Failed to fetch popular products:", popularResponse.reason);
          setMostPopular([]);
        }
        setIsLoadingPopular(false);

        // Process trending products
        if (trendingResponse.status === 'fulfilled') {
          try {
            const response = trendingResponse.value;
            const products = extractProducts(response);
            if (products.length > 0) {
              const trendingProducts = products.map(transformProduct).filter(p => p && p.id);
              setTrending(trendingProducts);
            } else {
              setTrending([]);
            }
          } catch (error) {
            console.error("Error processing trending products:", error);
            setTrending([]);
          }
        } else {
          console.error("Failed to fetch trending products:", trendingResponse.reason);
          setTrending([]);
        }
        setIsLoadingTrending(false);

        // Process flash sale products
        if (flashSaleResponse.status === 'fulfilled') {
          try {
            const response = flashSaleResponse.value;
            const products = extractProducts(response);
            if (products.length > 0) {
              const flashSaleProducts = products.map(transformProduct).filter(p => p && p.id);
              setFlashSale(flashSaleProducts);
            } else {
              setFlashSale([]);
            }
          } catch (error) {
            console.error("Error processing flash sale products:", error);
            setFlashSale([]);
          }
        } else {
          console.error("Failed to fetch flash sale products:", flashSaleResponse.reason);
          setFlashSale([]);
        }
        setIsLoadingFlashSale(false);

        // Process daily deals from campaigns
        if (campaignData.status === 'fulfilled') {
          try {
            const campaigns = campaignData.value || [];
            
            // Filter only active campaigns (isActive = true and within date range)
            const now = new Date();
            const activeCampaigns = campaigns.filter(campaign => {
              if (!campaign || !campaign.isActive) return false;
              const startDate = new Date(campaign.startDate);
              const endDate = new Date(campaign.endDate);
              return startDate <= now && endDate >= now;
            });
            
            let dailyDealProducts = [];
            let dailyDealCampaign = null;
            
            if (activeCampaigns.length > 0) {
              // Use the first active campaign for timer
              dailyDealCampaign = activeCampaigns[0];
              
              // Collect products from all active daily_deal campaigns
              activeCampaigns.forEach((campaign) => {
                const campaignProducts = campaign.products || [];
                
                if (campaignProducts.length > 0) {
                  const transformedCampaignProducts = campaignProducts
                    .filter(product => {
                      if (!product) return false;
                      const hasId = product.id || product._id;
                      const hasName = product.name;
                      const hasPrice = product.price !== undefined && product.price !== null;
                      return hasId && hasName && hasPrice;
                    })
                    .map(product => {
                      try {
                        const transformedProduct = transformProduct(product);
                        
                        // Apply campaign discount
                        let discountedPrice = transformedProduct.price;
                        let originalPrice = transformedProduct.originalPrice || transformedProduct.price;
                        
                        if (campaign.discountType === 'percentage' && campaign.discountValue) {
                          discountedPrice = transformedProduct.price * (1 - campaign.discountValue / 100);
                          originalPrice = transformedProduct.price;
                        } else if (campaign.discountType === 'fixed' && campaign.discountValue) {
                          discountedPrice = Math.max(0, transformedProduct.price - campaign.discountValue);
                          originalPrice = transformedProduct.price;
                        } else if (campaign.discount) {
                          const discountValue = campaign.discount;
                          discountedPrice = transformedProduct.price * (1 - discountValue / 100);
                          originalPrice = transformedProduct.price;
                        }
                        
                        return {
                          ...transformedProduct,
                          price: discountedPrice,
                          originalPrice: originalPrice,
                        };
                      } catch (err) {
                        console.error('Error transforming product:', product, err);
                        return null;
                      }
                    })
                    .filter(product => product !== null);
                  
                  dailyDealProducts = [...dailyDealProducts, ...transformedCampaignProducts];
                }
              });
              
              // Remove duplicates based on product ID and limit to 10 for home page
              const uniqueProducts = dailyDealProducts.reduce((acc, product) => {
                if (product && !acc.find(p => p.id === product.id)) {
                  acc.push(product);
                }
                return acc;
              }, []);
              
              dailyDealProducts = uniqueProducts.slice(0, 10);
            }
            
            setDailyDeals(dailyDealProducts);
            setDailyDealCampaign(dailyDealCampaign);
          } catch (error) {
            console.error('Error processing daily deals:', error);
            setDailyDeals([]);
            setDailyDealCampaign(null);
          }
        } else {
          console.error("Failed to fetch daily deals campaigns:", campaignData.reason);
          setDailyDeals([]);
          setDailyDealCampaign(null);
        }
        setIsLoadingDailyDeals(false);
        
      } catch (error) {
        console.error("Critical error fetching products:", error);
        // Only show toast for critical errors, individual failures are handled silently
        const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
        if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (!errorMessage.includes('401') && !errorMessage.includes('403')) {
          // Don't show toast for auth errors
          toast.error("Some products couldn't be loaded. Please refresh the page.");
        }
        // Ensure all loading states are cleared
        setMostPopular([]);
        setTrending([]);
        setDailyDeals([]);
        setFlashSale([]);
        setIsLoadingPopular(false);
        setIsLoadingTrending(false);
        setIsLoadingFlashSale(false);
        setIsLoadingDailyDeals(false);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Use API sliders only
  const slides = sliders;

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
  } = usePullToRefresh(handleRefresh);

  return (
    <PageTransition>
      <MobileLayout>
        <div
          ref={elementRef}
          className="w-full min-h-screen bg-gray-50"
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
                {slides.length > 0 ? (
                  slides.map((slide, index) => (
                    <Link
                      to={slide.link || "/app/search"}
                      key={slide.id || index}
                      className="flex-shrink-0 block"
                      style={{
                        width: `${100 / slides.length}%`,
                        height: "100%",
                      }}>
                      <LazyImage
                        src={slide.image}
                        alt={slide.title || `Slide ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/400x200?text=Slide+${index + 1}`;
                        }}
                      />
                    </Link>
                  ))
                ) : (
                  // Show loading or placeholder while fetching
                  <div className="flex-shrink-0 w-full h-full flex items-center justify-center bg-gray-200">
                    <p className="text-gray-500">Loading sliders...</p>
                  </div>
                )}
              </motion.div>
              {slides.length > 0 && (
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
              )}
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
            {isLoadingPopular ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="glass-card rounded-lg overflow-hidden animate-pulse">
                    <div className="w-full h-32 bg-gray-200"></div>
                    <div className="p-2">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </div>

          {/* Daily Deals */}
          <DailyDealsSection 
            products={dailyDeals} 
            campaign={dailyDealCampaign} 
            isLoading={isLoadingDailyDeals}
          />


          {/* Flash Sale */}
          {isLoadingFlashSale ? (
            <div className="px-4 py-4 bg-gradient-to-br from-red-50 to-orange-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Flash Sale
                  </h2>
                  <p className="text-xs text-gray-600">Limited time offers</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="glass-card rounded-lg overflow-hidden animate-pulse">
                    <div className="w-full h-32 bg-gray-200"></div>
                    <div className="p-2">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : flashSale.length > 0 ? (
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
                  className="text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors">
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
          ) : null}

          {/* Trending Items */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Trending Now</h2>
              <Link
                to="/app/search?isTrending=true"
                className="text-sm text-green-600 font-semibold hover:text-green-700 transition-colors">
                See All
              </Link>
            </div>
            {isLoadingTrending ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="glass-card rounded-lg overflow-hidden animate-pulse">
                    <div className="w-full h-32 bg-gray-200"></div>
                    <div className="p-2">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
            )}
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
