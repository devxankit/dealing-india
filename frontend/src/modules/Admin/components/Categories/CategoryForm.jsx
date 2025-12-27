import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FiX, FiSave, FiUpload, FiPackage, FiShoppingBag, FiStar, FiTag, FiZap, FiHeart, FiHome, FiGrid, FiBox, FiLayers, FiShoppingCart, FiTruck, FiGift, FiCoffee, FiMusic, FiCamera, FiBook, FiWatch, FiHeadphones, FiSmartphone, FiMonitor, FiCpu, FiBattery, FiWifi, FiDroplet, FiScissors, FiUmbrella, FiSun, FiMoon, FiCloud, FiThermometer, FiActivity, FiAward, FiBriefcase, FiCreditCard, FiDollarSign, FiTrendingUp, FiBarChart, FiSettings, FiTool, FiShield, FiLock, FiUnlock, FiKey, FiBell, FiMail, FiMessageCircle, FiUsers, FiUser, FiUserCheck, FiUserPlus, FiUserX, FiEye, FiEyeOff, FiSearch, FiFilter, FiRefreshCw, FiEdit, FiTrash, FiPlus, FiMinus, FiCheck, FiXCircle, FiAlertCircle, FiInfo, FiHelpCircle, FiChevronRight, FiChevronLeft, FiChevronUp, FiChevronDown, FiArrowRight, FiArrowLeft, FiArrowUp, FiArrowDown, FiMove, FiCopy, FiDownload, FiShare2, FiLink, FiExternalLink, FiPrinter, FiFile, FiFolder, FiImage, FiVideo, FiFileText, FiArchive, FiDatabase, FiServer, FiHardDrive, FiGlobe, FiMap, FiMapPin, FiNavigation, FiCompass, FiFlag, FiCalendar, FiClock, FiMessageSquare, FiSend, FiInbox, FiPaperclip, FiLink2, FiShare, FiThumbsUp, FiThumbsDown, FiBookmark, FiTarget, FiCrosshair, FiPower, FiRadio, FiTv, FiTablet, FiMic, FiMicOff, FiVolume2, FiVolumeX, FiVolume, FiVolume1, FiSkipBack, FiSkipForward, FiPlay, FiPause, FiRepeat, FiShuffle, FiMaximize, FiMinimize, FiMaximize2, FiMinimize2, FiCornerUpRight, FiCornerUpLeft, FiCornerDownRight, FiCornerDownLeft, FiCornerRightUp, FiCornerRightDown, FiCornerLeftUp, FiCornerLeftDown, FiRotateCw, FiRotateCcw, FiType, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiBold, FiItalic, FiUnderline, FiList, FiLayout, FiSidebar, FiColumns, FiSliders, FiToggleLeft, FiToggleRight, FiCheckSquare, FiSquare, FiCircle, FiCheckCircle, FiAlertTriangle, FiAlertOctagon, FiZapOff, FiBatteryCharging, FiWifiOff, FiRss, FiPhone, FiPhoneCall, FiPhoneOff } from "react-icons/fi";
import { IoShirtOutline, IoBagHandleOutline, IoRestaurantOutline, IoFitnessOutline, IoCarOutline, IoHomeOutline, IoBookOutline, IoGameControllerOutline, IoMusicalNotesOutline, IoCameraOutline, IoPhonePortraitOutline, IoLaptopOutline, IoWatchOutline, IoHeadsetOutline, IoShirt, IoBedOutline } from "react-icons/io5";
import { LuFootprints, LuUtensilsCrossed, LuDumbbell, LuBaby } from "react-icons/lu";
import { MdCategory, MdStore, MdStorefront } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { useCategoryStore } from "../../../../shared/store/categoryStore";
import AnimatedSelect from "../AnimatedSelect";
import toast from "react-hot-toast";
import Button from "../Button";

const CategoryForm = ({ category, parentId, onClose, onSave }) => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith("/app");
  const { categories, createCategory, updateCategory, getCategoryById } =
    useCategoryStore();
  const isEdit = !!category;
  const isSubcategory = !isEdit && parentId !== null;
  const parentCategory = parentId
    ? getCategoryById(parentId)
    : category?.parentId
      ? getCategoryById(category.parentId)
      : null;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    icon: "",
    parentId: null,
    isActive: true,
    order: 0,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadMethod, setUploadMethod] = useState("upload"); // "upload" or "url"

  // Available icons for selection - Comprehensive e-commerce icons (Unique only)
  const availableIcons = [
    // Top/Header Categories (Main Categories)
    { name: "Home", component: "FiHome", value: "FiHome" },
    { name: "Shopping Bag", component: "FiShoppingBag", value: "FiShoppingBag" },
    { name: "Shopping Cart", component: "FiShoppingCart", value: "FiShoppingCart" },
    { name: "Package", component: "FiPackage", value: "FiPackage" },
    { name: "Grid", component: "FiGrid", value: "FiGrid" },
    { name: "Layers", component: "FiLayers", value: "FiLayers" },
    { name: "Box", component: "FiBox", value: "FiBox" },
    { name: "Category", component: "MdCategory", value: "MdCategory" },
    { name: "Store", component: "MdStore", value: "MdStore" },
    { name: "Storefront", component: "MdStorefront", value: "MdStorefront" },

    // Fashion & Apparel
    { name: "Shirt", component: "IoShirtOutline", value: "IoShirtOutline" },
    { name: "Shirt Filled", component: "IoShirt", value: "IoShirt" },
    { name: "Footwear", component: "LuFootprints", value: "LuFootprints" },
    { name: "Bag", component: "IoBagHandleOutline", value: "IoBagHandleOutline" },
    { name: "Watch", component: "FiWatch", value: "FiWatch" },
    { name: "Watch Outline", component: "IoWatchOutline", value: "IoWatchOutline" },

    // Electronics
    { name: "Smartphone", component: "FiSmartphone", value: "FiSmartphone" },
    { name: "Phone", component: "IoPhonePortraitOutline", value: "IoPhonePortraitOutline" },
    { name: "Laptop", component: "IoLaptopOutline", value: "IoLaptopOutline" },
    { name: "Monitor", component: "FiMonitor", value: "FiMonitor" },
    { name: "Camera", component: "FiCamera", value: "FiCamera" },
    { name: "Camera Outline", component: "IoCameraOutline", value: "IoCameraOutline" },
    { name: "Headphones", component: "FiHeadphones", value: "FiHeadphones" },
    { name: "Headset", component: "IoHeadsetOutline", value: "IoHeadsetOutline" },
    { name: "Cpu", component: "FiCpu", value: "FiCpu" },
    { name: "Battery", component: "FiBattery", value: "FiBattery" },
    { name: "Wifi", component: "FiWifi", value: "FiWifi" },
    { name: "Tv", component: "FiTv", value: "FiTv" },
    { name: "Tablet", component: "FiTablet", value: "FiTablet" },
    { name: "Game Controller", component: "IoGameControllerOutline", value: "IoGameControllerOutline" },

    // Home & Kitchen
    { name: "Home Outline", component: "IoHomeOutline", value: "IoHomeOutline" },
    { name: "Bed", component: "IoBedOutline", value: "IoBedOutline" },
    { name: "Coffee", component: "FiCoffee", value: "FiCoffee" },
    { name: "Utensils", component: "LuUtensilsCrossed", value: "LuUtensilsCrossed" },
    { name: "Restaurant", component: "IoRestaurantOutline", value: "IoRestaurantOutline" },
    { name: "Tool", component: "FiTool", value: "FiTool" },
    { name: "Wrench", component: "FiWrench", value: "FiWrench" },

    // Beauty & Personal Care
    { name: "Droplet", component: "FiDroplet", value: "FiDroplet" },
    { name: "Scissors", component: "FiScissors", value: "FiScissors" },
    { name: "Heart", component: "FiHeart", value: "FiHeart" },
    { name: "Star", component: "FiStar", value: "FiStar" },

    // Sports & Fitness
    { name: "Fitness", component: "IoFitnessOutline", value: "IoFitnessOutline" },
    { name: "Dumbbell", component: "LuDumbbell", value: "LuDumbbell" },
    { name: "Activity", component: "FiActivity", value: "FiActivity" },
    { name: "Trophy", component: "FiTrophy", value: "FiTrophy" },
    { name: "Award", component: "FiAward", value: "FiAward" },

    // Books & Media
    { name: "Book", component: "FiBook", value: "FiBook" },
    { name: "Book Outline", component: "IoBookOutline", value: "IoBookOutline" },
    { name: "Music", component: "FiMusic", value: "FiMusic" },
    { name: "Musical Notes", component: "IoMusicalNotesOutline", value: "IoMusicalNotesOutline" },
    { name: "Video", component: "FiVideo", value: "FiVideo" },
    { name: "Image", component: "FiImage", value: "FiImage" },

    // Automotive
    { name: "Car", component: "IoCarOutline", value: "IoCarOutline" },
    { name: "Truck", component: "FiTruck", value: "FiTruck" },

    // Baby & Kids
    { name: "Baby", component: "LuBaby", value: "LuBaby" },
    { name: "Gift", component: "FiGift", value: "FiGift" },

    // General/Utility Icons
    { name: "Tag", component: "FiTag", value: "FiTag" },
    { name: "Zap", component: "FiZap", value: "FiZap" },
    { name: "Settings", component: "FiSettings", value: "FiSettings" },
    { name: "Users", component: "FiUsers", value: "FiUsers" },
    { name: "User", component: "FiUser", value: "FiUser" },
    { name: "Globe", component: "FiGlobe", value: "FiGlobe" },
    { name: "Map Pin", component: "FiMapPin", value: "FiMapPin" },
    { name: "Calendar", component: "FiCalendar", value: "FiCalendar" },
    { name: "Clock", component: "FiClock", value: "FiClock" },
    { name: "Credit Card", component: "FiCreditCard", value: "FiCreditCard" },
    { name: "Dollar Sign", component: "FiDollarSign", value: "FiDollarSign" },
    { name: "Trending Up", component: "FiTrendingUp", value: "FiTrendingUp" },
    { name: "Bar Chart", component: "FiBarChart", value: "FiBarChart" },
    { name: "Briefcase", component: "FiBriefcase", value: "FiBriefcase" },
    { name: "Shield", component: "FiShield", value: "FiShield" },
    { name: "Lock", component: "FiLock", value: "FiLock" },
    { name: "Key", component: "FiKey", value: "FiKey" },
    { name: "Bell", component: "FiBell", value: "FiBell" },
    { name: "Mail", component: "FiMail", value: "FiMail" },
    { name: "Message Circle", component: "FiMessageCircle", value: "FiMessageCircle" },
    { name: "Search", component: "FiSearch", value: "FiSearch" },
    { name: "Filter", component: "FiFilter", value: "FiFilter" },
    { name: "File", component: "FiFile", value: "FiFile" },
    { name: "Folder", component: "FiFolder", value: "FiFolder" },
    { name: "Archive", component: "FiArchive", value: "FiArchive" },
    { name: "Database", component: "FiDatabase", value: "FiDatabase" },
    { name: "Server", component: "FiServer", value: "FiServer" },
    { name: "Hard Drive", component: "FiHardDrive", value: "FiHardDrive" },
    { name: "Printer", component: "FiPrinter", value: "FiPrinter" },
    { name: "Copy", component: "FiCopy", value: "FiCopy" },
    { name: "Download", component: "FiDownload", value: "FiDownload" },
    { name: "Share", component: "FiShare2", value: "FiShare2" },
    { name: "Link", component: "FiLink", value: "FiLink" },
    { name: "External Link", component: "FiExternalLink", value: "FiExternalLink" },
    { name: "Bookmark", component: "FiBookmark", value: "FiBookmark" },
    { name: "Target", component: "FiTarget", value: "FiTarget" },
    { name: "Crosshair", component: "FiCrosshair", value: "FiCrosshair" },
    { name: "Power", component: "FiPower", value: "FiPower" },
    { name: "Radio", component: "FiRadio", value: "FiRadio" },
    { name: "Mic", component: "FiMic", value: "FiMic" },
    { name: "Volume", component: "FiVolume2", value: "FiVolume2" },
    { name: "Play", component: "FiPlay", value: "FiPlay" },
    { name: "Pause", component: "FiPause", value: "FiPause" },
    { name: "Umbrella", component: "FiUmbrella", value: "FiUmbrella" },
    { name: "Sun", component: "FiSun", value: "FiSun" },
    { name: "Moon", component: "FiMoon", value: "FiMoon" },
    { name: "Cloud", component: "FiCloud", value: "FiCloud" },
    { name: "Thermometer", component: "FiThermometer", value: "FiThermometer" },
    { name: "Navigation", component: "FiNavigation", value: "FiNavigation" },
    { name: "Compass", component: "FiCompass", value: "FiCompass" },
    { name: "Flag", component: "FiFlag", value: "FiFlag" },
    { name: "Map", component: "FiMap", value: "FiMap" },
    { name: "Thumbs Up", component: "FiThumbsUp", value: "FiThumbsUp" },
    { name: "Thumbs Down", component: "FiThumbsDown", value: "FiThumbsDown" },
    { name: "Info", component: "FiInfo", value: "FiInfo" },
    { name: "Help Circle", component: "FiHelpCircle", value: "FiHelpCircle" },
    { name: "Alert Circle", component: "FiAlertCircle", value: "FiAlertCircle" },
    { name: "Check Circle", component: "FiCheckCircle", value: "FiCheckCircle" },
    { name: "X Circle", component: "FiXCircle", value: "FiXCircle" },
    { name: "Check", component: "FiCheck", value: "FiCheck" },
    { name: "X", component: "FiX", value: "FiX" },
    { name: "Plus", component: "FiPlus", value: "FiPlus" },
    { name: "Minus", component: "FiMinus", value: "FiMinus" },
    { name: "Edit", component: "FiEdit", value: "FiEdit" },
    { name: "Trash", component: "FiTrash", value: "FiTrash" },
    { name: "Refresh", component: "FiRefreshCw", value: "FiRefreshCw" },
    { name: "Rotate CW", component: "FiRotateCw", value: "FiRotateCw" },
    { name: "Rotate CCW", component: "FiRotateCcw", value: "FiRotateCcw" },
    { name: "Maximize", component: "FiMaximize2", value: "FiMaximize2" },
    { name: "Minimize", component: "FiMinimize2", value: "FiMinimize2" },
    { name: "Type", component: "FiType", value: "FiType" },
    { name: "Bold", component: "FiBold", value: "FiBold" },
    { name: "Italic", component: "FiItalic", value: "FiItalic" },
    { name: "Underline", component: "FiUnderline", value: "FiUnderline" },
    { name: "List", component: "FiList", value: "FiList" },
    { name: "Layout", component: "FiLayout", value: "FiLayout" },
    { name: "Sidebar", component: "FiSidebar", value: "FiSidebar" },
    { name: "Columns", component: "FiColumns", value: "FiColumns" },
    { name: "Sliders", component: "FiSliders", value: "FiSliders" },
    { name: "Toggle Left", component: "FiToggleLeft", value: "FiToggleLeft" },
    { name: "Toggle Right", component: "FiToggleRight", value: "FiToggleRight" },
    { name: "Check Square", component: "FiCheckSquare", value: "FiCheckSquare" },
    { name: "Square", component: "FiSquare", value: "FiSquare" },
    { name: "Circle", component: "FiCircle", value: "FiCircle" },
    { name: "Alert Triangle", component: "FiAlertTriangle", value: "FiAlertTriangle" },
    { name: "Alert Octagon", component: "FiAlertOctagon", value: "FiAlertOctagon" },
    { name: "Zap Off", component: "FiZapOff", value: "FiZapOff" },
    { name: "Battery Charging", component: "FiBatteryCharging", value: "FiBatteryCharging" },
    { name: "Wifi Off", component: "FiWifiOff", value: "FiWifiOff" },
    { name: "Rss", component: "FiRss", value: "FiRss" },
    { name: "Phone", component: "FiPhone", value: "FiPhone" },
    { name: "Phone Call", component: "FiPhoneCall", value: "FiPhoneCall" },
    { name: "Phone Off", component: "FiPhoneOff", value: "FiPhoneOff" },
    { name: "Message Square", component: "FiMessageSquare", value: "FiMessageSquare" },
    { name: "Send", component: "FiSend", value: "FiSend" },
    { name: "Inbox", component: "FiInbox", value: "FiInbox" },
    { name: "Paperclip", component: "FiPaperclip", value: "FiPaperclip" },
    { name: "Link2", component: "FiLink2", value: "FiLink2" },
    { name: "Share Alt", component: "FiShare", value: "FiShare" },
    { name: "Arrow Right", component: "FiArrowRight", value: "FiArrowRight" },
    { name: "Arrow Left", component: "FiArrowLeft", value: "FiArrowLeft" },
    { name: "Arrow Up", component: "FiArrowUp", value: "FiArrowUp" },
    { name: "Arrow Down", component: "FiArrowDown", value: "FiArrowDown" },
    { name: "Chevron Right", component: "FiChevronRight", value: "FiChevronRight" },
    { name: "Chevron Left", component: "FiChevronLeft", value: "FiChevronLeft" },
    { name: "Chevron Up", component: "FiChevronUp", value: "FiChevronUp" },
    { name: "Chevron Down", component: "FiChevronDown", value: "FiChevronDown" },
    { name: "Move", component: "FiMove", value: "FiMove" },
    { name: "File Text", component: "FiFileText", value: "FiFileText" },
    { name: "Align Left", component: "FiAlignLeft", value: "FiAlignLeft" },
    { name: "Align Center", component: "FiAlignCenter", value: "FiAlignCenter" },
    { name: "Align Right", component: "FiAlignRight", value: "FiAlignRight" },
    { name: "Align Justify", component: "FiAlignJustify", value: "FiAlignJustify" },
    { name: "Skip Back", component: "FiSkipBack", value: "FiSkipBack" },
    { name: "Skip Forward", component: "FiSkipForward", value: "FiSkipForward" },
    { name: "Repeat", component: "FiRepeat", value: "FiRepeat" },
    { name: "Shuffle", component: "FiShuffle", value: "FiShuffle" },
    { name: "Volume X", component: "FiVolumeX", value: "FiVolumeX" },
    { name: "Volume Alt", component: "FiVolume", value: "FiVolume" },
    { name: "Volume1", component: "FiVolume1", value: "FiVolume1" },
    { name: "Mic Off", component: "FiMicOff", value: "FiMicOff" },
    { name: "Maximize Alt", component: "FiMaximize", value: "FiMaximize" },
    { name: "Minimize Alt", component: "FiMinimize", value: "FiMinimize" },
    { name: "Corner Up Right", component: "FiCornerUpRight", value: "FiCornerUpRight" },
    { name: "Corner Up Left", component: "FiCornerUpLeft", value: "FiCornerUpLeft" },
    { name: "Corner Down Right", component: "FiCornerDownRight", value: "FiCornerDownRight" },
    { name: "Corner Down Left", component: "FiCornerDownLeft", value: "FiCornerDownLeft" },
    { name: "Corner Right Up", component: "FiCornerRightUp", value: "FiCornerRightUp" },
    { name: "Corner Right Down", component: "FiCornerRightDown", value: "FiCornerRightDown" },
    { name: "Corner Left Up", component: "FiCornerLeftUp", value: "FiCornerLeftUp" },
    { name: "Corner Left Down", component: "FiCornerLeftDown", value: "FiCornerLeftDown" },
    { name: "Eye", component: "FiEye", value: "FiEye" },
    { name: "Eye Off", component: "FiEyeOff", value: "FiEyeOff" },
    { name: "User Check", component: "FiUserCheck", value: "FiUserCheck" },
    { name: "User Plus", component: "FiUserPlus", value: "FiUserPlus" },
    { name: "User X", component: "FiUserX", value: "FiUserX" },
    { name: "Unlock", component: "FiUnlock", value: "FiUnlock" },
  ];

  // Icon component mapping - All icons used in availableIcons
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
    FiCreditCard, FiDollarSign, FiTrendingUp, FiBarChart, FiBriefcase, FiShield, FiLock, FiKey,
    FiBell, FiMail, FiMessageCircle, FiSearch, FiFilter, FiFile, FiFolder, FiArchive, FiDatabase,
    FiServer, FiHardDrive, FiPrinter, FiCopy, FiDownload, FiShare2, FiLink, FiExternalLink,
    FiBookmark, FiTarget, FiCrosshair, FiPower, FiRadio, FiMic,
    FiVolume2, FiPlay, FiPause, FiUmbrella, FiSun, FiMoon, FiCloud, FiThermometer,
    FiNavigation, FiCompass, FiFlag, FiMap, FiThumbsUp, FiThumbsDown, FiInfo, FiHelpCircle,
    FiAlertCircle, FiCheckCircle, FiXCircle, FiCheck, FiX, FiPlus, FiMinus, FiEdit, FiTrash,
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

  // Get icon component from value
  const getIconComponent = (iconValue) => {
    if (!iconValue) return null;
    return iconComponents[iconValue] || null;
  };

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        image: category.image || "",
        icon: category.icon || "",
        parentId: category.parentId || null,
        isActive: category.isActive !== undefined ? category.isActive : true,
        order: category.order || 0,
      });
      // Set preview if image exists
      if (category.image) {
        setImagePreview(category.image);
        setUploadMethod(category.image.startsWith('http') ? "url" : "upload");
      } else {
        setImagePreview(null);
        setUploadMethod("upload");
      }
      setImageFile(null);
    } else if (parentId !== null) {
      setFormData({
        name: "",
        description: "",
        image: "",
        icon: "",
        parentId: parentId,
        isActive: true,
        order: 0,
      });
      setImagePreview(null);
      setImageFile(null);
      setUploadMethod("upload");
    }
  }, [category, parentId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value === "" ? null : value,
    });
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setImageFile(file);

    // Convert to base64 for preview and upload
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setFormData({
        ...formData,
        image: base64String, // Store base64 for backend upload
      });
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Handle URL change
  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData({
      ...formData,
      image: url,
    });
    if (url) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
  };

  // Remove image
  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      image: "",
    });
    setImagePreview(null);
    setImageFile(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      if (isEdit) {
        updateCategory(category.id, formData);
      } else {
        createCategory(formData);
      }
      onSave?.();
      onClose();
    } catch (error) {
      // Error handled in store
    }
  };

  // Get available parent categories (exclude current category and its children)
  const getAvailableParents = () => {
    if (!isEdit) return categories.filter((cat) => cat.isActive);
    return categories.filter((cat) => cat.id !== category.id && cat.isActive);
  };

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-[10000]"
        />

        {/* Modal Content - Mobile: Slide up from bottom, Desktop: Center with scale */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[10000] flex ${isAppRoute ? "items-start pt-[10px]" : "items-end"
            } sm:items-center justify-center p-4 pointer-events-none`}>
          <motion.div
            variants={{
              hidden: {
                y: isAppRoute ? "-100%" : "100%",
                scale: 0.95,
                opacity: 0,
              },
              visible: {
                y: 0,
                scale: 1,
                opacity: 1,
                transition: {
                  type: "spring",
                  damping: 22,
                  stiffness: 350,
                  mass: 0.7,
                },
              },
              exit: {
                y: isAppRoute ? "-100%" : "100%",
                scale: 0.95,
                opacity: 0,
                transition: {
                  type: "spring",
                  damping: 30,
                  stiffness: 400,
                },
              },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className={`bg-white ${isAppRoute ? "rounded-b-3xl" : "rounded-t-3xl"
              } sm:rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-admin pointer-events-auto`}
            style={{ willChange: "transform" }}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isEdit
                    ? "Edit Category"
                    : isSubcategory
                      ? "Create Subcategory"
                      : "Create Category"}
                </h2>
                {isSubcategory && parentCategory && (
                  <p className="text-sm text-gray-600 mt-1">
                    Parent:{" "}
                    <span className="font-semibold text-gray-800">
                      {parentCategory.name}
                    </span>
                  </p>
                )}
                {isEdit && parentCategory && (
                  <p className="text-sm text-gray-600 mt-1">
                    Parent:{" "}
                    <span className="font-semibold text-gray-800">
                      {parentCategory.name}
                    </span>
                  </p>
                )}
              </div>
              <Button
                onClick={onClose}
                variant="icon"
                icon={FiX}
                className="text-gray-600"
              />
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Clothing, Electronics"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Category description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Parent Category
                    </label>
                    {isSubcategory || (isEdit && category.parentId) ? (
                      <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 font-medium">
                            {parentCategory ? parentCategory.name : "None"}
                          </span>
                          {isSubcategory && (
                            <span className="text-xs text-gray-500">
                              (Cannot be changed)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <AnimatedSelect
                        name="parentId"
                        value={formData.parentId || ""}
                        onChange={handleChange}
                        placeholder="None (Root Category)"
                        options={[
                          { value: "", label: "None (Root Category)" },
                          ...getAvailableParents().map((cat) => ({
                            value: String(cat.id),
                            label: cat.name,
                          })),
                        ]}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Icon Selection - Only show for main categories, not subcategories */}
              {!isSubcategory && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Category Icon
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Icon
                    </label>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-300 rounded-lg">
                      {availableIcons.map((icon) => {
                        const IconComponent = iconComponents[icon.value];
                        const isSelected = formData.icon === icon.value;
                        return (
                          <button
                            key={icon.value}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, icon: icon.value });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${isSelected
                              ? "border-primary-500 bg-primary-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            title={icon.name}>
                            {IconComponent && (
                              <IconComponent
                                className={`text-xl ${isSelected ? "text-primary-600" : "text-gray-600"
                                  }`}
                              />
                            )}
                            <span
                              className={`text-[10px] mt-1 text-center ${isSelected ? "text-primary-600" : "text-gray-500"
                                }`}>
                              {icon.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {formData.icon && (
                      <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-semibold text-gray-700">
                          Selected Icon:
                        </span>
                        {getIconComponent(formData.icon) && (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const SelectedIcon = getIconComponent(formData.icon);
                              return <SelectedIcon className="text-2xl text-primary-600" />;
                            })()}
                            <span className="text-sm text-gray-600">
                              {availableIcons.find((i) => i.value === formData.icon)?.name}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image - Only show for main categories, not subcategories */}
              {!isSubcategory && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Category Image
                  </h3>
                  <div className="space-y-4">
                    {/* Upload Method Toggle */}
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setUploadMethod("upload")}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${uploadMethod === "upload"
                          ? "bg-primary-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        <FiUpload className="inline-block mr-2" />
                        Upload Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMethod("url")}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${uploadMethod === "url"
                          ? "bg-primary-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        Image URL
                      </button>
                    </div>

                    {/* Upload Method: File Upload */}
                    {uploadMethod === "upload" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Upload Image <span className="text-gray-500 text-xs">(Max 5MB)</span>
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex-1 cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center">
                              <FiUpload className="inline-block text-xl text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">
                                {imageFile ? imageFile.name : "Click to upload or drag and drop"}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                PNG, JPG, GIF up to 5MB
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Upload Method: URL */}
                    {uploadMethod === "url" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Image URL <span className="text-gray-500 text-xs">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          name="image"
                          value={formData.image}
                          onChange={handleImageUrlChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="https://example.com/image.png or data/categories/category.png"
                        />
                      </div>
                    )}

                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mt-4 relative inline-block">
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-40 h-40 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                            onError={(e) => {
                              e.target.style.display = "none";
                              toast.error("Failed to load image preview");
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            <FiX className="text-sm" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {imageFile ? `File: ${imageFile.name}` : "Image preview"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Settings */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      name="order"
                      value={formData.order}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Active
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                <Button type="button" onClick={onClose} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" icon={FiSave}>
                  {isEdit ? "Update Category" : "Create Category"}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </>
    </AnimatePresence>
  );
};

export default CategoryForm;
