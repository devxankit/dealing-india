import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FiArrowRight, FiZap, FiTag } from "react-icons/fi";
import { useCampaignStore } from "../../../../shared/store/campaignStore";
import toast from "react-hot-toast";

// Map campaign type to gradient and icon
const getCampaignStyle = (type) => {
  const styles = {
    flash_sale: {
      gradient: "from-red-500 via-pink-500 to-orange-500",
      icon: FiZap,
      defaultTitle: "Flash Sale",
      defaultSubtitle: "Limited Time Offer",
    },
    daily_deal: {
      gradient: "from-blue-500 via-purple-500 to-indigo-500",
      icon: FiTag,
      defaultTitle: "Daily Deals",
      defaultSubtitle: "New Deals Every Day",
    },
    special_offer: {
      gradient: "from-green-500 via-teal-500 to-cyan-500",
      icon: FiTag,
      defaultTitle: "Special Offers",
      defaultSubtitle: "Exclusive Discounts",
    },
    festival: {
      gradient: "from-yellow-500 via-orange-500 to-red-500",
      icon: FiTag,
      defaultTitle: "Festival Offers",
      defaultSubtitle: "Celebration Deals",
    },
  };
  return styles[type] || styles.special_offer;
};

const AnimatedBanner = () => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [ripples, setRipples] = useState([]);
  const [loading, setLoading] = useState(true);
  // Subscribe to store to get updates
  const publicCampaigns = useCampaignStore((state) => state.publicCampaigns);
  const initializePublic = useCampaignStore((state) => state.initializePublic);
  const getPublicCampaignsByType = useCampaignStore((state) => state.getPublicCampaignsByType);

  // Track if we've fetched campaigns at least once
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch campaigns for banners
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        // Fetch all campaign types that should show in banners
        // Use forceRefresh to ensure we get fresh data
        await initializePublic({ limit: 100 }, true);
        setHasFetched(true);
      } catch (error) {
        console.error("Failed to fetch campaigns for banners:", error);
        toast.error("Failed to load promotional banners");
      } finally {
        setLoading(false);
      }
    };

    // Fetch on mount
    if (!hasFetched) {
      fetchCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

  // Re-fetch if campaigns become empty after initial fetch (e.g., after cache clear)
  useEffect(() => {
    if (hasFetched && !loading && publicCampaigns && publicCampaigns.length === 0) {
      // Campaigns were cleared, re-fetch fresh data
      const fetchCampaigns = async () => {
        try {
          setLoading(true);
          await initializePublic({ limit: 100 }, true);
        } catch (error) {
          console.error("Failed to re-fetch campaigns for banners:", error);
        } finally {
          setLoading(false);
        }
      };
      
      // Small delay to avoid race conditions
      const timeoutId = setTimeout(fetchCampaigns, 500);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicCampaigns, hasFetched, loading]);

  // Get banners from campaigns
  const banners = useMemo(() => {
    if (!publicCampaigns || publicCampaigns.length === 0) {
      return [];
    }

    const campaignTypes = ['flash_sale', 'daily_deal', 'special_offer', 'festival'];
    const allBanners = [];

    // First, try to get campaigns by specific types
    campaignTypes.forEach(type => {
      const campaigns = getPublicCampaignsByType(type);
      
      if (campaigns && campaigns.length > 0) {
        // Backend already filters by date, so we just need to check isActive
        const activeCampaigns = campaigns.filter(campaign => {
          if (!campaign) return false;
          return campaign.isActive !== false;
        });

        // Add ALL active campaigns of this type (not just the first one)
        if (activeCampaigns.length > 0) {
          // Map campaign type to correct route
          const getRouteForType = (campaignType) => {
            const routeMap = {
              'flash_sale': '/app/flash-sale',
              'daily_deal': '/app/daily-deals',
              'special_offer': '/app/offers',
              'festival': '/app/offers',
            };
            // Always use the type-based route mapping, ignore campaign.route
            return routeMap[campaignType] || '/app/offers'; // Default to offers page if type not found
          };

          // Add all active campaigns of this type
          activeCampaigns.forEach(campaign => {
            const style = getCampaignStyle(type);
            const bannerConfig = campaign.bannerConfig || {};

            allBanners.push({
              id: campaign.id || campaign._id,
              title: bannerConfig.title || campaign.name || style.defaultTitle,
              subtitle: bannerConfig.subtitle || style.defaultSubtitle,
              discount: campaign.discount 
                ? `Up to ${campaign.discount}% OFF`
                : campaign.discountValue 
                  ? `Up to ${campaign.discountValue}% OFF`
                  : 'Special Offer',
              description: campaign.description || "Shop now before it ends!",
              gradient: bannerConfig.gradient || style.gradient,
              // Always use type-based route, ignore campaign.route to avoid /app/sale/... routes
              link: getRouteForType(type),
              icon: style.icon,
              imageUrl: bannerConfig.imageUrl,
            });
          });
        }
      }
    });

    // If no banners from specific types, show ANY active campaigns (backend already filtered by date)
    if (allBanners.length === 0 && publicCampaigns.length > 0) {
      // Backend already filtered by date, so get all active campaigns
      const anyActiveCampaigns = publicCampaigns.filter(campaign => {
        if (!campaign) return false;
        return campaign.isActive !== false;
      });
      
      // Add all active campaigns
      anyActiveCampaigns.forEach(anyActiveCampaign => {
        const style = getCampaignStyle(anyActiveCampaign.type || 'special_offer');
        const bannerConfig = anyActiveCampaign.bannerConfig || {};
        
        // Map campaign type to correct route
        const getRouteForType = (campaignType) => {
          const routeMap = {
            'flash_sale': '/app/flash-sale',
            'daily_deal': '/app/daily-deals',
            'special_offer': '/app/offers',
            'festival': '/app/offers',
          };
          // Always use the type-based route mapping, ignore campaign.route
          return routeMap[campaignType] || '/app/offers'; // Default to offers page if type not found
        };

        allBanners.push({
          id: anyActiveCampaign.id || anyActiveCampaign._id,
          title: bannerConfig.title || anyActiveCampaign.name || style.defaultTitle,
          subtitle: bannerConfig.subtitle || style.defaultSubtitle,
          discount: anyActiveCampaign.discount 
            ? `Up to ${anyActiveCampaign.discount}% OFF`
            : anyActiveCampaign.discountValue 
              ? `Up to ${anyActiveCampaign.discountValue}% OFF`
              : 'Special Offer',
          description: anyActiveCampaign.description || "Shop now before it ends!",
          gradient: bannerConfig.gradient || style.gradient,
          // Always use type-based route, ignore campaign.route to avoid /app/sale/... routes
          link: getRouteForType(anyActiveCampaign.type || 'special_offer'),
          icon: style.icon,
          imageUrl: bannerConfig.imageUrl,
        });
      });
    }
    
    return allBanners;
  }, [publicCampaigns, getPublicCampaignsByType]);

  useEffect(() => {
    if (banners.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Ripple effect handler
  const handleRipple = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Ensure valid numbers
    if (isNaN(x) || isNaN(y)) return;

    const newRipple = {
      id: Date.now(),
      x: Math.max(0, x),
      y: Math.max(0, y),
    };

    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  // Show nothing if loading or no banners
  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="relative w-full h-32 rounded-2xl overflow-hidden shadow-xl bg-gray-200 animate-pulse flex items-center justify-center">
          <p className="text-gray-500 text-sm">Loading banners...</p>
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null; // Don't show anything if no active campaigns
  }

  return (
    <div className="px-4 py-3">
      <div className="relative w-full h-32 rounded-2xl overflow-hidden shadow-xl">
        <AnimatePresence mode="wait">
          {banners.map((banner, index) => {
            if (index !== currentBanner) return null;
            const Icon = banner.icon;

            return (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, scale: 1.1, x: "100%" }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: "-100%" }}
                transition={{
                  duration: 0.5,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className={`absolute inset-0 bg-gradient-to-br ${banner.gradient} p-4 relative ${
                  banner.imageUrl ? 'bg-cover bg-center' : ''
                }`}
                style={{
                  willChange: "transform, opacity",
                  backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
                  backgroundSize: banner.imageUrl ? 'cover' : undefined,
                  backgroundPosition: banner.imageUrl ? 'center' : undefined,
                }}>
                {/* Overlay for better text readability if image is present */}
                {banner.imageUrl && (
                  <div className="absolute inset-0 bg-black/30"></div>
                )}
                {/* Ripple Effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
                  {ripples.map((ripple) => (
                    <motion.div
                      key={ripple.id}
                      className="absolute rounded-full bg-white/40"
                      style={{
                        left: `${ripple.x}px`,
                        top: `${ripple.y}px`,
                        width: 0,
                        height: 0,
                      }}
                      initial={{
                        width: 0,
                        height: 0,
                        x: "-50%",
                        y: "-50%",
                        opacity: 0.6,
                      }}
                      animate={{ width: 200, height: 200, opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  ))}
                </div>

                {/* Content */}
                <Link
                  to={banner.link}
                  onClick={handleRipple}
                  onTouchStart={handleRipple}
                  className="relative z-10 h-full flex items-center justify-between group">
                  <div className="flex-1">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-2 mb-1">
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}>
                        <Icon className="text-white text-lg drop-shadow-lg" />
                      </motion.div>
                      <motion.span
                        className="text-white/90 text-xs font-medium"
                        animate={{
                          opacity: [0.9, 1, 0.9],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}>
                        {banner.subtitle}
                      </motion.span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white text-xl font-extrabold mb-1 drop-shadow-lg relative inline-block">
                      {banner.title}
                    </motion.h3>

                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/90 text-xs mb-2">
                      {banner.description}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      style={{
                        willChange: "transform",
                        transform: "translateZ(0)",
                      }}
                      className="inline-flex items-center gap-2 bg-white/25 px-3 py-1.5 rounded-full relative overflow-hidden"
                      whileTap={{ scale: 0.95 }}>
                      <span className="text-white font-bold text-sm relative z-10">
                        {banner.discount}
                      </span>
                      <FiArrowRight className="text-white text-sm relative z-10" />
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Indicator Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBanner(index)}
              className="focus:outline-none">
              <motion.div
                animate={{
                  width: index === currentBanner ? 24 : 6,
                  opacity: index === currentBanner ? 1 : 0.5,
                }}
                transition={{ duration: 0.3 }}
                className={`h-1.5 rounded-full bg-white ${
                  index === currentBanner ? "w-6" : "w-1.5"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedBanner;
