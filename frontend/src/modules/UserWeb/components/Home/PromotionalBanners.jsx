import { useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useBannerStore } from "../../../../shared/store/bannerStore";
import { useCampaignStore } from "../../../../shared/store/campaignStore";
import { gsapAnimations } from "../../../../shared/utils/animations";
import beautyPromoImg from "../../../../../data/promotional/beauty.jpg";
import healthPromoImg from "../../../../../data/promotional/health.jpg";
import kitchenPromoImg from "../../../../../data/promotional/kitchen.jpg";

const PromotionalBanners = () => {
  const sectionRef = useRef(null);
  const { getBannersByType, initialize: initBanners } = useBannerStore();
  const { initialize: initCampaigns } = useCampaignStore();

  useEffect(() => {
    initBanners();
    initCampaigns();
    if (sectionRef.current) {
      gsapAnimations.scrollReveal(sectionRef.current);
    }
  }, [initBanners, initCampaigns]);

  // Get active promotional banners from store
  const campaignBanners = useMemo(() => {
    const allBanners = getBannersByType("promotional");
    const now = new Date();
    return allBanners
      .filter((banner) => {
        if (!banner.isActive) return false;
        if (banner.startDate && new Date(banner.startDate) > now) return false;
        if (banner.endDate && new Date(banner.endDate) < now) return false;
        return true;
      })
      .slice(0, 3) // Limit to 3 campaign banners
      .map((banner, index) => ({
        id: `campaign-${banner.id}`,
        title: banner.title,
        subtitle: banner.subtitle || "",
        description: banner.description || "",
        discount: banner.subtitle || "Special Offer",
        gradient: "from-blue-400 via-purple-400 to-pink-400",
        image: banner.image || beautyPromoImg,
        link: banner.link || "/offers",
        isCampaign: true,
      }));
  }, [getBannersByType]);

  const staticBanners = [
    {
      id: 1,
      title: "Beauty is",
      subtitle: "SALE Now",
      subtext: "Boarding",
      description: "Bring the character",
      discount: "Up to 15% Off",
      gradient: "from-teal-400 via-cyan-400 to-blue-400",
      image: beautyPromoImg,
    },
    {
      id: 2,
      title: "Eat Healthy,",
      subtitle: "Stay Fit.",
      description: "All about your health",
      discount: "Up to 20% Off",
      gradient: "from-orange-400 via-pink-400 to-red-400",
      image: healthPromoImg,
    },
    {
      id: 3,
      title: "Kitchen",
      subtitle: "Saving",
      subtext: "Alert!",
      description: "Low prices are here to spice things up.",
      discount: "Up to 35% Off",
      gradient: "from-blue-400 via-indigo-400 to-purple-400",
      image: kitchenPromoImg,
    },
  ];

  // Merge campaign banners with static banners (campaign banners first)
  const banners = useMemo(() => {
    const merged = [...campaignBanners];
    // Fill remaining slots with static banners
    const remainingSlots = 3 - merged.length;
    if (remainingSlots > 0) {
      merged.push(...staticBanners.slice(0, remainingSlots));
    }
    return merged.slice(0, 3); // Ensure max 3 banners
  }, [campaignBanners]);

  const BannerWrapper = ({ banner, children }) => {
    if (banner.link) {
      return (
        <Link to={banner.link} className="block">
          {children}
        </Link>
      );
    }
    return children;
  };

  return (
    <section ref={sectionRef} className="py-16 md:py-0 bg-transparent">
      {/* Desktop Layout - White card container with 3-column grid */}
      <div className="hidden md:block bg-white rounded-lg mb-4 p-4">
        <div className="grid grid-cols-3 gap-1">
          {banners.map((banner, index) => (
            <BannerWrapper key={banner.id} banner={banner}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className={`bg-gradient-to-br ${banner.gradient} rounded-lg p-4 relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group`}
                style={{ aspectRatio: "41/22" }}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full blur-xl"></div>
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    {banner.description && (
                      <p className="text-xs text-white/90 mb-1 font-medium">
                        {banner.description}
                      </p>
                    )}
                    <h3 className="text-lg font-bold text-white mb-0.5 drop-shadow-lg">
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <h3 className="text-lg font-bold text-white mb-0.5 drop-shadow-lg">
                        {banner.subtitle}
                      </h3>
                    )}
                    {banner.subtext && (
                      <h3 className="text-lg font-bold text-white mb-2 drop-shadow-lg">
                        {banner.subtext}
                      </h3>
                    )}
                  </div>
                  <p className="text-white text-sm font-bold bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full inline-block">
                    {banner.discount}
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-24 h-24 opacity-30 group-hover:opacity-40 transition-opacity">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover rounded-tl-full"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/200x200?text=Promo";
                    }}
                  />
                </div>
              </motion.div>
            </BannerWrapper>
          ))}
        </div>
      </div>

      {/* Mobile Layout - Unchanged */}
      <div className="md:hidden container mx-auto px-2 sm:px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-8">
          {banners.map((banner, index) => (
            <BannerWrapper key={banner.id} banner={banner}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`bg-gradient-to-br ${banner.gradient} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group`}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-white rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-white rounded-full blur-2xl"></div>
                </div>

                <div className="relative z-10">
                  {banner.description && (
                    <p className="text-xs sm:text-sm text-white/90 mb-2 sm:mb-3 font-medium">
                      {banner.description}
                    </p>
                  )}
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-1 sm:mb-2 drop-shadow-lg">
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-1 sm:mb-2 drop-shadow-lg">
                      {banner.subtitle}
                    </h3>
                  )}
                  {banner.subtext && (
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3 sm:mb-4 drop-shadow-lg">
                      {banner.subtext}
                    </h3>
                  )}
                  <p className="text-white font-bold text-base sm:text-lg md:text-xl bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full inline-block">
                    {banner.discount}
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-32 h-32 sm:w-40 sm:h-40 opacity-30 group-hover:opacity-40 transition-opacity">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover rounded-tl-full"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/200x200?text=Promo";
                    }}
                  />
                </div>
              </motion.div>
            </BannerWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromotionalBanners;
