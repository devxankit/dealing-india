import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiChevronRight, FiPackage, FiShoppingBag, FiStar, FiTag, FiZap, FiHeart, FiHome, FiGrid, FiBox, FiLayers, FiShoppingCart, FiTruck, FiGift, FiCoffee, FiMusic, FiCamera, FiBook, FiWatch, FiHeadphones, FiSmartphone, FiMonitor, FiCpu, FiBattery, FiWifi } from "react-icons/fi";
import { IoShirtOutline, IoBagHandleOutline, IoRestaurantOutline, IoFitnessOutline, IoCarOutline, IoHomeOutline, IoBookOutline, IoGameControllerOutline, IoMusicalNotesOutline, IoCameraOutline, IoPhonePortraitOutline, IoLaptopOutline, IoWatchOutline, IoHeadsetOutline } from "react-icons/io5";
import { LuFootprints } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";
import { useCategoryStore } from "../../../shared/store/categoryStore";

// Icon component mapping - must match CategoryForm and MobileCategoryIcons
const iconComponents = {
  IoShirtOutline,
  LuFootprints,
  IoBagHandleOutline,
  FiStar,
  FiTag,
  FiZap,
  FiPackage,
  FiShoppingBag,
  FiHeart,
  FiHome,
  FiGrid,
  FiBox,
  FiLayers,
  FiShoppingCart,
  FiTruck,
  FiGift,
  FiCoffee,
  FiMusic,
  FiCamera,
  FiBook,
  FiWatch,
  FiHeadphones,
  FiSmartphone,
  FiMonitor,
  FiCpu,
  FiBattery,
  FiWifi,
  IoRestaurantOutline,
  IoFitnessOutline,
  IoCarOutline,
  IoHomeOutline,
  IoBookOutline,
  IoGameControllerOutline,
  IoMusicalNotesOutline,
  IoCameraOutline,
  IoPhonePortraitOutline,
  IoLaptopOutline,
  IoWatchOutline,
  IoHeadsetOutline,
};

// Helper function to get icon component from category
const getCategoryIcon = (category) => {
  if (!category || !category.icon) return null;
  return iconComponents[category.icon] || null;
};

const CategorySelector = ({
  value,
  subcategoryId,
  subSubCategoryId,
  onChange,
  required = false,
  className = "",
}) => {
  const {
    categories,
    getRootCategories,
    getCategoriesByParent,
    getCategoryById,
  } = useCategoryStore();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);
  const [hoveredSubCategoryId, setHoveredSubCategoryId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);
  const parentDropdownRef = useRef(null);
  const subcategoryDropdownRef = useRef(null);
  const subSubCategoryDropdownRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get root categories (parent categories)
  const rootCategories = useMemo(() => {
    return getRootCategories().filter((cat) => cat.isActive !== false);
  }, [categories, getRootCategories]);

  // Get selected category and subcategory info
  const categoryValue = value?.toString() || value;
  const subcategoryValue = subcategoryId?.toString() || subcategoryId;
  const subSubCategoryValue = subSubCategoryId?.toString() || subSubCategoryId;

  const selectedCategory = categoryValue ? getCategoryById(categoryValue) : null;
  const selectedSubcategory = subcategoryValue ? getCategoryById(subcategoryValue) : null;
  const selectedSubSubCategory = subSubCategoryValue ? getCategoryById(subSubCategoryValue) : null;

  const parentCategory = selectedSubcategory
    ? getCategoryById(selectedSubcategory.parentId)
    : selectedCategory;

  // Get subcategories for hovered category
  const hoveredSubcategories = useMemo(() => {
    if (!hoveredCategoryId) return [];
    return getCategoriesByParent(hoveredCategoryId).filter(
      (cat) => cat.isActive !== false
    );
  }, [hoveredCategoryId, categories, getCategoriesByParent]);

  // Get sub-subcategories for hovered subcategory
  const hoveredSubSubCategories = useMemo(() => {
    if (!hoveredSubCategoryId) return [];
    return getCategoriesByParent(hoveredSubCategoryId).filter(
      (cat) => cat.isActive !== false
    );
  }, [hoveredSubCategoryId, categories, getCategoriesByParent]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // On mobile, the portal handles closing via the overlay
      // We also check if the click is on the portal content to be safe
      if (isMobile) return;

      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setHoveredCategoryId(null);
        setHoveredSubCategoryId(null);
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
      };
    }
  }, [isOpen, isMobile]);

  // Position subcategory and sub-subcategory dropdowns
  useEffect(() => {
    if (hoveredCategoryId && subcategoryDropdownRef.current && parentDropdownRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const parentDropdownRect = parentDropdownRef.current.getBoundingClientRect();
      const hoveredElement = parentDropdownRef.current.querySelector(`[data-category-id="${hoveredCategoryId}"]`);

      if (hoveredElement) {
        const elementRect = hoveredElement.getBoundingClientRect();
        const dropdown = subcategoryDropdownRef.current;
        const viewportWidth = window.innerWidth;
        const dropdownWidth = 200;

        let left = parentDropdownRect.right - containerRect.left;
        let top = elementRect.top - containerRect.top;

        if (parentDropdownRect.right + dropdownWidth > viewportWidth - 20) {
          left = parentDropdownRect.left - containerRect.left - dropdownWidth;
        }

        if (top < 0) top = 0;
        const maxTop = parentDropdownRect.height - 40;
        if (top > maxTop) top = maxTop;

        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
      }
    }

    if (hoveredSubCategoryId && subSubCategoryDropdownRef.current && subcategoryDropdownRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const subDropdownRect = subcategoryDropdownRef.current.getBoundingClientRect();
      const hoveredElement = subcategoryDropdownRef.current.querySelector(`[data-subcategory-id="${hoveredSubCategoryId}"]`);

      if (hoveredElement) {
        const elementRect = hoveredElement.getBoundingClientRect();
        const dropdown = subSubCategoryDropdownRef.current;
        const viewportWidth = window.innerWidth;
        const dropdownWidth = 200;

        let left = subDropdownRect.right - containerRect.left;
        let top = elementRect.top - containerRect.top;

        if (subDropdownRect.right + dropdownWidth > viewportWidth - 20) {
          left = subDropdownRect.left - containerRect.left - dropdownWidth;
        }

        if (top < 0) top = 0;
        const maxTop = subDropdownRect.height - 40;
        if (top > maxTop) top = maxTop;

        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
      }
    }
  }, [hoveredCategoryId, hoveredSubCategoryId, isOpen]);

  const handleCategorySelect = (categoryId) => {
    const categoryIdStr = categoryId?.toString() || categoryId;
    onChange({ target: { name: "categoryId", value: categoryIdStr } });
    onChange({ target: { name: "subcategoryId", value: "" } });
    onChange({ target: { name: "subSubCategoryId", value: "" } });
    setIsOpen(false);
    setHoveredCategoryId(null);
    setHoveredSubCategoryId(null);
  };

  const handleSubcategorySelect = (subId, parentId) => {
    const parentIdStr = parentId?.toString() || parentId;
    const subIdStr = subId?.toString() || subId;
    onChange({ target: { name: "categoryId", value: parentIdStr } });
    onChange({ target: { name: "subcategoryId", value: subIdStr } });
    onChange({ target: { name: "subSubCategoryId", value: "" } });
    setIsOpen(false);
    setHoveredCategoryId(null);
    setHoveredSubCategoryId(null);
  };

  const handleSubSubCategorySelect = (subSubId, subId, rootId) => {
    const rootIdStr = rootId?.toString() || rootId;
    const subIdStr = subId?.toString() || subId;
    const subSubIdStr = subSubId?.toString() || subSubId;
    onChange({ target: { name: "categoryId", value: rootIdStr } });
    onChange({ target: { name: "subcategoryId", value: subIdStr } });
    onChange({ target: { name: "subSubCategoryId", value: subSubIdStr } });
    setIsOpen(false);
    setHoveredCategoryId(null);
    setHoveredSubCategoryId(null);
  };

  // Display text
  const displayText = useMemo(() => {
    if (selectedSubSubCategory && selectedSubcategory && selectedCategory) {
      return `${selectedCategory.name} > ${selectedSubcategory.name} > ${selectedSubSubCategory.name}`;
    }
    if (selectedSubcategory && parentCategory) {
      return `${parentCategory.name} > ${selectedSubcategory.name}`;
    }
    if (selectedCategory) {
      return selectedCategory.name;
    }
    return "Select Category";
  }, [selectedCategory, selectedSubcategory, selectedSubSubCategory, parentCategory]);

  const SelectedCategoryIcon = useMemo(() => {
    if (selectedSubSubCategory) return getCategoryIcon(selectedSubSubCategory) || getCategoryIcon(selectedSubcategory) || getCategoryIcon(selectedCategory);
    if (selectedSubcategory) return getCategoryIcon(selectedSubcategory) || getCategoryIcon(parentCategory);
    if (selectedCategory) return getCategoryIcon(selectedCategory);
    return null;
  }, [selectedCategory, selectedSubcategory, selectedSubSubCategory, parentCategory]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }
          if (!isOpen) {
            setHoveredCategoryId(null);
            setHoveredSubCategoryId(null);
          }
        }}
        className={`w-full px-4 py-2.5 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white flex items-center justify-between transition-all duration-200 hover:border-primary-400 ${!value ? "text-gray-500" : "text-gray-900"}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {SelectedCategoryIcon && (
            <SelectedCategoryIcon className="text-lg flex-shrink-0 text-primary-600" />
          )}
          <span className="truncate">{displayText}</span>
        </div>
        <FiChevronDown className={`ml-2 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? "transform rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {isMobile ? (
              createPortal(
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      setIsOpen(false);
                      setHoveredCategoryId(null);
                      setHoveredSubCategoryId(null);
                    }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-[10001] bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                  >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        {(hoveredCategoryId || hoveredSubCategoryId) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (hoveredSubCategoryId) setHoveredSubCategoryId(null);
                              else setHoveredCategoryId(null);
                            }}
                            className="p-2 -ml-2 bg-gray-50 rounded-full text-gray-600">
                            <FiChevronRight className="rotate-180" />
                          </button>
                        )}
                        <h3 className="font-bold text-gray-800">
                          {!hoveredCategoryId ? "Select Category" :
                            !hoveredSubCategoryId ? rootCategories.find(c => c.id === hoveredCategoryId)?.name :
                              hoveredSubcategories.find(c => c.id === hoveredSubCategoryId)?.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          setHoveredCategoryId(null);
                          setHoveredSubCategoryId(null);
                        }}
                        className="p-2 bg-gray-50 rounded-full text-gray-400">
                        <FiChevronDown />
                      </button>
                    </div>

                    <div className="overflow-y-auto pb-8">
                      <div className="py-2">
                        {/* Parent Categories View */}
                        {!hoveredCategoryId && (
                          <div className="divide-y divide-gray-50">
                            {rootCategories.length === 0 ? (
                              <div className="px-6 py-8 text-sm text-gray-500 text-center">
                                No categories available
                              </div>
                            ) : (
                              rootCategories.map((category) => {
                                const subcats = getCategoriesByParent(category.id).filter((cat) => cat.isActive !== false);
                                const hasSub = subcats.length > 0;
                                const CategoryIcon = getCategoryIcon(category);
                                const isSelected = categoryValue === category.id.toString();

                                return (
                                  <button
                                    key={category.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (hasSub) {
                                        setHoveredCategoryId(category.id);
                                      } else {
                                        handleCategorySelect(category.id);
                                      }
                                    }}
                                    className={`w-full px-6 py-4 cursor-pointer flex items-center justify-between active:bg-gray-50 transition-colors ${isSelected ? "bg-primary-50 text-primary-600" : "text-gray-900"
                                      }`}>
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? "bg-white shadow-sm" : "bg-gray-50"}`}>
                                        {CategoryIcon && <CategoryIcon className={`text-xl ${isSelected ? "text-primary-600" : "text-gray-500"}`} />}
                                      </div>
                                      <span className="font-medium">{category.name}</span>
                                    </div>
                                    {hasSub && <FiChevronRight className={`text-lg ${isSelected ? "text-primary-400" : "text-gray-300"}`} />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}

                        {/* Subcategories View */}
                        {hoveredCategoryId && !hoveredSubCategoryId && (
                          <div className="divide-y divide-gray-50">
                            <button
                              type="button"
                              className="w-full px-6 py-4 cursor-pointer flex items-center gap-3 bg-primary-50/50 text-primary-600 font-bold border-b border-primary-100"
                              onClick={(e) => { e.stopPropagation(); handleCategorySelect(hoveredCategoryId); }}>
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                <FiGrid className="text-xl" />
                              </div>
                              <span>Select All in {rootCategories.find(c => c.id === hoveredCategoryId)?.name}</span>
                            </button>

                            {hoveredSubcategories.map((subcategory) => {
                              const subSubCats = getCategoriesByParent(subcategory.id).filter((cat) => cat.isActive !== false);
                              const hasSubSub = subSubCats.length > 0;
                              const SubIcon = getCategoryIcon(subcategory);
                              const isSelected = subcategoryValue === subcategory.id.toString();

                              return (
                                <button
                                  key={subcategory.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasSubSub) {
                                      setHoveredSubCategoryId(subcategory.id);
                                    } else {
                                      handleSubcategorySelect(subcategory.id, hoveredCategoryId);
                                    }
                                  }}
                                  className={`w-full px-6 py-4 cursor-pointer flex items-center justify-between active:bg-gray-50 transition-colors ${isSelected ? "bg-primary-50 text-primary-600" : "text-gray-900"
                                    }`}>
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? "bg-white shadow-sm" : "bg-gray-50"}`}>
                                      {SubIcon && <SubIcon className={`text-xl ${isSelected ? "text-primary-600" : "text-gray-500"}`} />}
                                    </div>
                                    <span className="font-medium">{subcategory.name}</span>
                                  </div>
                                  {hasSubSub && <FiChevronRight className={`text-lg ${isSelected ? "text-primary-400" : "text-gray-300"}`} />}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Sub-subcategories View */}
                        {hoveredSubCategoryId && (
                          <div className="divide-y divide-gray-50">
                            <button
                              type="button"
                              className="w-full px-6 py-4 cursor-pointer flex items-center gap-3 bg-primary-50/50 text-primary-600 font-bold border-b border-primary-100"
                              onClick={(e) => { e.stopPropagation(); handleSubcategorySelect(hoveredSubCategoryId, hoveredCategoryId); }}>
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                <FiLayers className="text-xl" />
                              </div>
                              <span>Select All in {hoveredSubcategories.find(c => c.id === hoveredSubCategoryId)?.name}</span>
                            </button>

                            {hoveredSubSubCategories.map((subSubCategory) => {
                              const SubSubIcon = getCategoryIcon(subSubCategory);
                              const isSelected = subSubCategoryValue === subSubCategory.id.toString();

                              return (
                                <button
                                  key={subSubCategory.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubSubCategorySelect(subSubCategory.id, hoveredSubCategoryId, hoveredCategoryId);
                                  }}
                                  className={`w-full px-6 py-4 cursor-pointer flex items-center gap-3 active:bg-gray-50 transition-colors ${isSelected ? "bg-primary-50 text-primary-600" : "text-gray-900"
                                    }`}>
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? "bg-white shadow-sm" : "bg-gray-50"}`}>
                                    {SubSubIcon && <SubSubIcon className={`text-xl ${isSelected ? "text-primary-600" : "text-gray-500"}`} />}
                                  </div>
                                  <span className="font-medium">{subSubCategory.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>,
                document.body
              )
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[280px] z-[10001] overflow-hidden">
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {rootCategories.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">No categories available</div>
                    ) : (
                      rootCategories.map((category) => {
                        const subcats = getCategoriesByParent(category.id).filter((cat) => cat.isActive !== false);
                        const hasSub = subcats.length > 0;
                        const CategoryIcon = getCategoryIcon(category);
                        const isSelected = categoryValue === category.id.toString();

                        return (
                          <div
                            key={category.id}
                            onMouseEnter={() => setHoveredCategoryId(category.id)}
                            onClick={() => !hasSub && handleCategorySelect(category.id)}
                            className={`px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 ${isSelected ? "bg-primary-50 text-primary-600" : "text-gray-900"
                              }`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {CategoryIcon && <CategoryIcon className={`text-lg flex-shrink-0 ${isSelected ? "text-primary-600" : "text-gray-400"}`} />}
                              <span className="truncate">{category.name}</span>
                            </div>
                            {hasSub && <FiChevronRight className={`ml-2 ${isSelected ? "text-primary-400" : "text-gray-300"}`} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>

                {/* Subcategories Flyout */}
                {hoveredCategoryId && hoveredSubcategories.length > 0 && (
                  <motion.div
                    ref={subcategoryDropdownRef}
                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.95 }}
                    className="absolute bg-white border border-gray-200 rounded-xl shadow-xl min-w-[220px] z-[10002] overflow-hidden">
                    <div className="py-1 max-h-60 overflow-y-auto">
                      <div
                        className="px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-primary-50 text-primary-600 font-medium border-b border-gray-100 mb-1"
                        onClick={(e) => { e.stopPropagation(); handleCategorySelect(hoveredCategoryId); }}>
                        <FiGrid className="text-lg flex-shrink-0" />
                        <span className="truncate text-xs">Select All</span>
                      </div>
                      {hoveredSubcategories.map((subcategory) => {
                        const subSubCats = getCategoriesByParent(subcategory.id).filter((cat) => cat.isActive !== false);
                        const hasSubSub = subSubCats.length > 0;
                        const SubIcon = getCategoryIcon(subcategory);
                        return (
                          <div key={subcategory.id} data-subcategory-id={subcategory.id}>
                            <div
                              className={`px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 ${subcategoryValue === subcategory.id.toString() ? "bg-primary-50 text-primary-600" : "text-gray-900"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hasSubSub) setHoveredSubCategoryId(subcategory.id);
                                else handleSubcategorySelect(subcategory.id, hoveredCategoryId);
                              }}
                              onMouseEnter={() => setHoveredSubCategoryId(subcategory.id)}>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {SubIcon && <SubIcon className="text-lg flex-shrink-0 text-gray-400" />}
                                <span className="truncate">{subcategory.name}</span>
                              </div>
                              {hasSubSub && <FiChevronRight className="ml-2 text-gray-400" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Sub-subcategories Flyout */}
                {hoveredSubCategoryId && hoveredSubSubCategories.length > 0 && (
                  <motion.div
                    ref={subSubCategoryDropdownRef}
                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.95 }}
                    className="absolute bg-white border border-gray-200 rounded-xl shadow-xl min-w-[220px] z-[10003] overflow-hidden">
                    <div className="py-1 max-h-60 overflow-y-auto">
                      <div
                        className="px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-primary-50 text-primary-600 font-medium border-b border-gray-100 mb-1"
                        onClick={(e) => { e.stopPropagation(); handleSubcategorySelect(hoveredSubCategoryId, hoveredCategoryId); }}>
                        <FiLayers className="text-lg flex-shrink-0" />
                        <span className="truncate text-xs">Select All</span>
                      </div>
                      {hoveredSubSubCategories.map((subSubCategory) => {
                        const SubSubIcon = getCategoryIcon(subSubCategory);
                        return (
                          <div
                            key={subSubCategory.id}
                            onClick={(e) => { e.stopPropagation(); handleSubSubCategorySelect(subSubCategory.id, hoveredSubCategoryId, hoveredCategoryId); }}
                            className={`px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-gray-50 ${subSubCategoryValue === subSubCategory.id.toString() ? "bg-primary-50 text-primary-600" : "text-gray-900"}`}>
                            {SubSubIcon && <SubSubIcon className="text-lg flex-shrink-0 text-gray-400" />}
                            <span className="truncate">{subSubCategory.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </>
        )}
      </AnimatePresence>

      {required && <input type="hidden" value={value || ""} required={required} />}
    </div>
  );
};

export default CategorySelector;
