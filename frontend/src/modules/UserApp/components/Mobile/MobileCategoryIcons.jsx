import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { categories as staticCategories } from "../../../../data/categories";
import { useCategoryStore } from "../../../../shared/store/categoryStore";
import { FiX, FiSave, FiUpload, FiPackage, FiShoppingBag, FiStar, FiTag, FiZap, FiHeart, FiHome, FiGrid, FiBox, FiLayers, FiShoppingCart, FiTruck, FiGift, FiCoffee, FiMusic, FiCamera, FiBook, FiWatch, FiHeadphones, FiSmartphone, FiMonitor, FiCpu, FiBattery, FiWifi, FiDroplet, FiScissors, FiUmbrella, FiSun, FiMoon, FiCloud, FiThermometer, FiActivity, FiAward, FiBriefcase, FiCreditCard, FiDollarSign, FiTrendingUp, FiBarChart2, FiSettings, FiTool, FiShield, FiLock, FiUnlock, FiKey, FiBell, FiMail, FiMessageCircle, FiUsers, FiUser, FiUserCheck, FiUserPlus, FiUserX, FiEye, FiEyeOff, FiSearch, FiFilter, FiRefreshCw, FiEdit, FiTrash2, FiPlus, FiMinus, FiCheck, FiXCircle, FiAlertCircle, FiInfo, FiHelpCircle, FiChevronRight, FiChevronLeft, FiChevronUp, FiChevronDown, FiArrowRight, FiArrowLeft, FiArrowUp, FiArrowDown, FiMove, FiCopy, FiDownload, FiShare2, FiLink, FiExternalLink, FiPrinter, FiFile, FiFolder, FiImage, FiVideo, FiFileText, FiArchive, FiDatabase, FiServer, FiHardDrive, FiGlobe, FiMap, FiMapPin, FiNavigation, FiCompass, FiFlag, FiCalendar, FiClock, FiMessageSquare, FiSend, FiInbox, FiPaperclip, FiLink2, FiShare, FiThumbsUp, FiThumbsDown, FiBookmark, FiTarget, FiCrosshair, FiPower, FiRadio, FiTv, FiTablet, FiMic, FiMicOff, FiVolume2, FiVolumeX, FiVolume, FiVolume1, FiSkipBack, FiSkipForward, FiPlay, FiPause, FiRepeat, FiShuffle, FiMaximize, FiMinimize, FiMaximize2, FiMinimize2, FiCornerUpRight, FiCornerUpLeft, FiCornerDownRight, FiCornerDownLeft, FiCornerRightUp, FiCornerRightDown, FiCornerLeftUp, FiCornerLeftDown, FiRotateCw, FiRotateCcw, FiType, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiBold, FiItalic, FiUnderline, FiList, FiLayout, FiSidebar, FiColumns, FiSliders, FiToggleLeft, FiToggleRight, FiCheckSquare, FiSquare, FiCircle, FiCheckCircle, FiAlertTriangle, FiAlertOctagon, FiZapOff, FiBatteryCharging, FiWifiOff, FiRss, FiPhone, FiPhoneCall, FiPhoneOff } from "react-icons/fi";
import { IoShirtOutline, IoBagHandleOutline, IoRestaurantOutline, IoFitnessOutline, IoCarOutline, IoHomeOutline, IoBookOutline, IoGameControllerOutline, IoMusicalNotesOutline, IoCameraOutline, IoPhonePortraitOutline, IoLaptopOutline, IoWatchOutline, IoHeadsetOutline, IoShirt, IoBedOutline } from "react-icons/io5";
import { LuFootprints, LuUtensilsCrossed, LuDumbbell, LuBaby } from "react-icons/lu";
import { MdCategory, MdStore, MdStorefront } from "react-icons/md";

// Icon component mapping - must match CategoryForm
const iconComponents = {
  // Top/Header Categories
  FiHome, FiShoppingBag, FiShoppingCart, FiPackage, FiGrid, FiLayers, FiBox,
  MdCategory, MdStore, MdStorefront,
  // Fashion & Apparel
  IoShirtOutline, IoShirt, LuFootprints, IoBagHandleOutline, FiWatch, IoWatchOutline,
  // Electronics
  FiSmartphone, IoPhonePortraitOutline, IoLaptopOutline, FiMonitor, FiCamera, IoCameraOutline,
  FiHeadphones, IoHeadsetOutline, FiCpu, FiBattery, FiWifi, FiTv, FiTablet, IoGameControllerOutline,
  // Home & Kitchen
  IoHomeOutline, IoBedOutline, FiCoffee, LuUtensilsCrossed, IoRestaurantOutline, FiTool,
  // Beauty & Personal Care
  FiDroplet, FiScissors, FiHeart, FiStar,
  // Sports & Fitness
  IoFitnessOutline, LuDumbbell, FiActivity, FiAward,
  // Books & Media
  FiBook, IoBookOutline, FiMusic, IoMusicalNotesOutline, FiVideo, FiImage,
  // Automotive
  IoCarOutline, FiTruck,
  // Baby & Kids
  LuBaby, FiGift,
  // General/Utility
  FiTag, FiZap, FiSettings, FiUsers, FiUser, FiGlobe, FiMapPin, FiCalendar, FiClock,
  FiCreditCard, FiDollarSign, FiTrendingUp, FiBarChart2, FiBriefcase, FiShield, FiLock, FiKey,
  FiBell, FiMail, FiMessageCircle, FiSearch, FiFilter, FiFile, FiFolder, FiArchive, FiDatabase,
  FiServer, FiHardDrive, FiPrinter, FiCopy, FiDownload, FiShare2, FiLink, FiExternalLink,
  FiBookmark, FiTarget, FiCrosshair, FiPower, FiRadio, FiMic,
  FiVolume2, FiPlay, FiPause, FiUmbrella, FiSun, FiMoon, FiCloud, FiThermometer,
  FiNavigation, FiCompass, FiFlag, FiMap, FiThumbsUp, FiThumbsDown, FiInfo, FiHelpCircle,
  FiAlertCircle, FiCheckCircle, FiXCircle, FiCheck, FiX, FiPlus, FiMinus, FiEdit, FiTrash2,
  FiRefreshCw, FiRotateCw, FiRotateCcw, FiMaximize2, FiMinimize2, FiType, FiBold, FiItalic,
  FiUnderline, FiList, FiLayout, FiSidebar, FiColumns, FiSliders, FiToggleLeft,
  FiToggleRight, FiCheckSquare, FiSquare, FiCircle, FiAlertTriangle, FiAlertOctagon,
  FiZapOff, FiBatteryCharging,
  FiWifiOff, FiRss, FiPhone, FiPhoneCall, FiPhoneOff, FiMessageSquare,
  FiSend, FiInbox, FiPaperclip, FiLink2, FiShare, FiArrowRight, FiArrowLeft, FiArrowUp,
  FiArrowDown, FiChevronRight, FiChevronLeft, FiChevronUp, FiChevronDown, FiMove,
  FiFileText, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiAlignJustify, FiSkipBack, FiSkipForward,
  FiRepeat, FiShuffle, FiVolumeX, FiVolume, FiVolume1, FiMicOff, FiMaximize,
  FiMinimize, FiCornerUpRight, FiCornerUpLeft, FiCornerDownRight, FiCornerDownLeft,
  FiCornerRightUp, FiCornerRightDown, FiCornerLeftUp, FiCornerLeftDown, FiEye, FiEyeOff,
  FiUserCheck, FiUserPlus, FiUserX, FiUnlock,
};

// Fallback mapping for old categories without icon field
const categoryIconsFallback = {
  Clothing: IoShirtOutline,
  Footwear: LuFootprints,
  Bags: IoBagHandleOutline,
  Jewelry: FiStar,
  Accessories: FiTag,
  Athletic: FiZap,
};

// Get icon component from category
const getCategoryIcon = (category) => {
  // Only return icon if category has an icon field set
  if (category.icon && iconComponents[category.icon]) {
    return iconComponents[category.icon];
  }
  // Return null if no icon is set - don't use fallback
  return null;
};

const MobileCategoryIcons = () => {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollYRef = useRef(0);
  const location = useLocation();
  const categoryRefs = useRef({});
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [activeLineStyle, setActiveLineStyle] = useState({});
  const [isLineVisible, setIsLineVisible] = useState(false);
  const [shouldTransition, setShouldTransition] = useState(false);
  const previousCategoryIdRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Get categories from store (active root categories only)
  const { categories: storeCategories } = useCategoryStore();
  const categories = storeCategories.length > 0
    ? storeCategories.filter(cat => cat.isActive && !cat.parentId).sort((a, b) => (a.order || 0) - (b.order || 0))
    : staticCategories;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      scrollYRef.current = currentScrollY;

      // Smooth transition: show icons when at top, hide when scrolled
      // Use a small threshold for immediate response
      setIsScrolling(currentScrollY >= 8);
    };

    // Use requestAnimationFrame for smooth 60fps updates
    let rafId = null;
    const onScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          handleScroll();
          rafId = null;
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Get current category from URL
  const getCurrentCategoryId = () => {
    const match = location.pathname.match(/\/(?:app\/)?category\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const currentCategoryId = getCurrentCategoryId();

  // Update line position when active category changes or container scrolls
  const updateLinePosition = (isScroll = false) => {
    if (currentCategoryId && categoryRefs.current[currentCategoryId] && containerRef.current && scrollContainerRef.current) {
      const activeElement = categoryRefs.current[currentCategoryId];
      const container = containerRef.current;
      const scrollContainer = scrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();

      const elementWidth = elementRect.width;
      const lineWidth = 48; // Line width (48px)
      const left = elementRect.left - containerRect.left + (elementWidth - lineWidth) / 2; // Center the line

      // If scrolling, disable transition for instant updates
      if (isScroll) {
        isScrollingRef.current = true;
        setShouldTransition(false);

        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // Re-enable transition after scrolling stops
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
        }, 200);
      }

      setActiveLineStyle({
        left: `${left}px`,
        width: `${lineWidth}px`,
      });
    }
  };

  // Handle category changes with smooth transition
  useEffect(() => {
    const prevCategoryId = previousCategoryIdRef.current;
    const categoryChanged = prevCategoryId !== null && prevCategoryId !== currentCategoryId;

    if (currentCategoryId) {
      setIsLineVisible(true);

      // If category changed (not just initial load), enable smooth transition
      if (categoryChanged) {
        // Enable transition first
        setShouldTransition(true);
        // Small delay to ensure transition CSS is applied before position change
        setTimeout(() => {
          updateLinePosition(false);
        }, 10);
      } else {
        // Initial load - no transition
        setShouldTransition(false);
        updateLinePosition(false);
      }

      previousCategoryIdRef.current = currentCategoryId;
    } else {
      setIsLineVisible(false);
    }
  }, [currentCategoryId, location.pathname]);

  // Handle scroll with instant updates
  useEffect(() => {
    if (scrollContainerRef.current) {
      let rafId = null;
      const handleScroll = () => {
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            updateLinePosition(true); // Pass true to indicate this is a scroll event
            rafId = null;
          });
        }
      };

      scrollContainerRef.current.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.removeEventListener('scroll', handleScroll);
        }
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
      };
    }
  }, []);

  // Update on window resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(updateLinePosition, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentCategoryId]);

  // Category color mapping - matching the gradient colors
  const categoryColors = {
    1: {
      icon: "text-pink-500",
      text: "text-pink-600",
      indicator: "bg-pink-500",
    }, // Clothing - Pink
    2: {
      icon: "text-amber-600",
      text: "text-amber-700",
      indicator: "bg-amber-600",
    }, // Footwear - Brown/Amber
    3: {
      icon: "text-orange-500",
      text: "text-orange-600",
      indicator: "bg-orange-500",
    }, // Bags - Orange
    4: {
      icon: "text-green-500",
      text: "text-green-600",
      indicator: "bg-green-500",
    }, // Jewelry - Green
    5: {
      icon: "text-purple-500",
      text: "text-purple-600",
      indicator: "bg-purple-500",
    }, // Accessories - Purple
    6: {
      icon: "text-blue-500",
      text: "text-blue-600",
      indicator: "bg-blue-500",
    }, // Athletic - Blue
  };

  const isActiveCategory = (categoryId) => {
    return (
      location.pathname === `/app/category/${categoryId}` ||
      location.pathname === `/category/${categoryId}`
    );
  };

  // Get color for active category
  const getActiveColor = (categoryId) => {
    return (
      categoryColors[categoryId] || {
        icon: "text-primary-500",
        text: "text-primary-500",
        indicator: "bg-primary-500",
      }
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <motion.div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4"
        style={{
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}>
        {categories.map((category, index) => {
          const IconComponent = getCategoryIcon(category);
          const isActive = isActiveCategory(category.id);
          const activeColors =
            currentCategoryId && currentCategoryId === category.id
              ? getActiveColor(category.id)
              : null;
          return (
            <div
              key={category.id}
              ref={(el) => {
                if (el) categoryRefs.current[category.id] = el;
              }}
              className="flex-shrink-0">
              <Link
                to={`/app/category/${category.id}`}
                className="flex flex-col items-center gap-1.5 w-16 relative">
                {!isScrolling && IconComponent && (
                  <div>
                    <IconComponent
                      className={`text-lg transition-colors duration-300 ${isActive && activeColors
                        ? activeColors.icon
                        : isActive
                          ? "text-primary-500"
                          : "text-gray-700 hover:text-primary-600"
                        }`}
                      style={{
                        strokeWidth:
                          category.name === "Clothing" ||
                            category.name === "Bags"
                            ? 5.5
                            : 2,
                      }}
                    />
                  </div>
                )}
                {!isScrolling && !IconComponent && (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span
                  className={`text-[10px] font-semibold text-center line-clamp-1 transition-colors duration-300 ${isActive && activeColors
                    ? activeColors.text
                    : isActive
                      ? "text-primary-500"
                      : "text-gray-700"
                    }`}>
                  {category.name}
                </span>
              </Link>
            </div>
          );
        })}
      </motion.div>
      {/* Blue indicator line at bottom edge of header for selected category */}
      {isLineVisible && currentCategoryId && (
        <div
          className="absolute h-1 bg-blue-500 rounded-full"
          style={{
            ...activeLineStyle,
            bottom: '-12px', // Position at bottom edge of header (accounting for header py-3 padding)
            transformOrigin: 'left center',
            // Smooth transition when category changes, instant during scroll
            transition: shouldTransition && !isScrollingRef.current
              ? 'left 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), width 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)'
              : 'none',
          }}
        />
      )}
    </div>
  );
};

export default MobileCategoryIcons;
