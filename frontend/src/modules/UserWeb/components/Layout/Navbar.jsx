import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiGrid, FiMenu, FiX, FiPackage, FiShoppingBag, FiStar, FiTag, FiZap, FiHeart, FiHome, FiBox, FiLayers, FiShoppingCart, FiTruck, FiGift, FiCoffee, FiMusic, FiCamera, FiBook, FiWatch, FiHeadphones, FiSmartphone, FiMonitor, FiCpu, FiBattery, FiWifi, FiDroplet, FiScissors, FiUmbrella, FiSun, FiMoon, FiCloud, FiThermometer, FiActivity, FiAward, FiBriefcase, FiCreditCard, FiDollarSign, FiTrendingUp, FiBarChart2, FiSettings, FiTool, FiShield, FiLock, FiUnlock, FiKey, FiBell, FiMail, FiMessageCircle, FiUsers, FiUser, FiUserCheck, FiUserPlus, FiUserX, FiEye, FiEyeOff, FiSearch, FiFilter, FiRefreshCw, FiEdit, FiTrash2, FiPlus, FiMinus, FiCheck, FiXCircle, FiAlertCircle, FiInfo, FiHelpCircle, FiChevronRight, FiChevronLeft, FiChevronUp, FiChevronDown, FiArrowRight, FiArrowLeft, FiArrowUp, FiArrowDown, FiMove, FiCopy, FiDownload, FiShare2, FiLink, FiExternalLink, FiPrinter, FiFile, FiFolder, FiImage, FiVideo, FiFileText, FiArchive, FiDatabase, FiServer, FiHardDrive, FiGlobe, FiMap, FiMapPin, FiNavigation, FiCompass, FiFlag, FiCalendar, FiClock, FiMessageSquare, FiSend, FiInbox, FiPaperclip, FiLink2, FiShare, FiThumbsUp, FiThumbsDown, FiBookmark, FiTarget, FiCrosshair, FiPower, FiRadio, FiTv, FiTablet, FiMic, FiMicOff, FiVolume2, FiVolumeX, FiVolume, FiVolume1, FiSkipBack, FiSkipForward, FiPlay, FiPause, FiRepeat, FiShuffle, FiMaximize, FiMinimize, FiMaximize2, FiMinimize2, FiCornerUpRight, FiCornerUpLeft, FiCornerDownRight, FiCornerDownLeft, FiCornerRightUp, FiCornerRightDown, FiCornerLeftUp, FiCornerLeftDown, FiRotateCw, FiRotateCcw, FiType, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiBold, FiItalic, FiUnderline, FiList, FiLayout, FiSidebar, FiColumns, FiSliders, FiToggleLeft, FiToggleRight, FiCheckSquare, FiSquare, FiCircle, FiCheckCircle, FiAlertTriangle, FiAlertOctagon, FiZapOff, FiBatteryCharging, FiWifiOff, FiRss, FiPhone, FiPhoneCall, FiPhoneOff } from "react-icons/fi";
import { IoShirtOutline, IoBagHandleOutline, IoRestaurantOutline, IoFitnessOutline, IoCarOutline, IoHomeOutline, IoBookOutline, IoGameControllerOutline, IoMusicalNotesOutline, IoCameraOutline, IoPhonePortraitOutline, IoLaptopOutline, IoWatchOutline, IoHeadsetOutline, IoShirt, IoBedOutline } from "react-icons/io5";
import { LuFootprints, LuUtensilsCrossed, LuDumbbell, LuBaby } from "react-icons/lu";
import { MdCategory, MdStore, MdStorefront } from "react-icons/md";
import { categories as staticCategories } from "../../../../data/categories";
import { useCategoryStore } from "../../../../shared/store/categoryStore";

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

// Get icon component from category
const getCategoryIcon = (category) => {
  // Only return icon if category has an icon field set
  if (category.icon && iconComponents[category.icon]) {
    return iconComponents[category.icon];
  }
  // Return null if no icon is set
  return null;
};

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const navRef = useRef(null);
  const { categories: storeCategories, getRootCategories, initialize } = useCategoryStore();

  // Initialize categories on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get root categories from store or fallback to static
  const categories = storeCategories.length > 0
    ? getRootCategories().filter(cat => cat.isActive !== false)
    : staticCategories;
  
  // Hide navbar on mobile app routes
  if (location.pathname.startsWith('/app')) {
    return null;
  }

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/offers", label: "Offers" },
    { path: "/daily-deals", label: "Daily Deals" },
    { path: "/flash-sale", label: "Flash Sale" },
  ];

  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector("header");
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    // Initial calculation
    updateHeaderHeight();

    // Update on resize
    window.addEventListener("resize", updateHeaderHeight);

    // Update after a short delay to ensure header is rendered
    const timeoutId = setTimeout(updateHeaderHeight, 100);

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="glass border-b border-white/20 sticky shadow-md"
      style={{
        top: `${headerHeight}px`,
        zIndex: 40,
      }}>
      <div className="container mx-auto px-2 sm:px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Browse Category Button with Dropdown */}
          <div
            className="relative"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
            <button className="flex items-center gap-2 sm:gap-3 gradient-primary text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-semibold text-sm sm:text-base">
              <FiGrid className="text-lg sm:text-xl" />
              <span className="hidden sm:inline">Browse Category</span>
              <span className="sm:hidden">Category</span>
              <span
                className={`text-xs transition-transform duration-300 ${isCategoryOpen ? "rotate-180" : ""
                }`}>
                ▼
              </span>
            </button>

            {/* Dropdown Menu */}
            {isCategoryOpen && (
              <div className="absolute top-full left-0 mt-3 w-72 glass-card rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                {categories.map((category) => {
                  const IconComponent = getCategoryIcon(category);
                  return (
                  <Link
                    key={category.id}
                    to={`/category/${category.id}`}
                    onClick={() => setIsCategoryOpen(false)}
                    className="flex items-center gap-4 px-5 py-3.5 transition-all duration-300 group mx-2 rounded-xl">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/50 transition-all duration-300 flex items-center justify-center bg-white/50">
                        {IconComponent ? (
                          <IconComponent className="w-6 h-6 text-primary-600" />
                        ) : category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        {!IconComponent && !category.image && (
                          <span className="text-xs font-bold text-gray-600">
                            {category.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                    </div>
                    <span className="text-gray-800 font-semibold transition-colors">
                      {category.name}
                    </span>
                  </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-gray-700 font-semibold transition-all duration-300 relative group">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2.5 text-gray-700 rounded-lg transition-all duration-300">
            {isMenuOpen ? (
              <FiX className="text-2xl" />
            ) : (
              <FiMenu className="text-2xl" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20 mt-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="block py-3 px-4 text-gray-700 rounded-lg transition-all duration-300 font-semibold">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
