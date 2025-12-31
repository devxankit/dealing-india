import { useState, useRef, useEffect, useMemo } from "react";
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
  const containerRef = useRef(null);
  const parentDropdownRef = useRef(null);
  const subcategoryDropdownRef = useRef(null);
  const subSubCategoryDropdownRef = useRef(null);
  const closeTimeoutRef = useRef(null);

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
  }, [isOpen]);

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

        let left = parentDropdownRect.right - containerRect.left + 8;
        let top = elementRect.top - containerRect.top;

        if (parentDropdownRect.right + dropdownWidth + 8 > viewportWidth - 20) {
          left = parentDropdownRect.left - containerRect.left - dropdownWidth - 8;
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

        let left = subDropdownRect.right - containerRect.left + 8;
        let top = elementRect.top - containerRect.top;

        if (subDropdownRect.right + dropdownWidth + 8 > viewportWidth - 20) {
          left = subDropdownRect.left - containerRect.left - dropdownWidth - 8;
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

  const selectedCategoryIcon = useMemo(() => {
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
          {selectedCategoryIcon && (
            <selectedCategoryIcon className="text-lg flex-shrink-0 text-primary-600" />
          )}
          <span className="truncate">{displayText}</span>
        </div>
        <FiChevronDown className={`ml-2 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? "transform rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsOpen(false); setHoveredCategoryId(null); setHoveredSubCategoryId(null); }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden"
            />

            {/* Parent Categories */}
            <motion.div
              ref={parentDropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              <div className="py-1">
                {rootCategories.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500 text-center">No categories available</div>
                ) : (
                  rootCategories.map((category) => {
                    const subcats = getCategoriesByParent(category.id).filter((cat) => cat.isActive !== false);
                    const hasSub = subcats.length > 0;
                    const isHovered = hoveredCategoryId === category.id;
                    const CategoryIcon = getCategoryIcon(category);

                    return (
                      <div key={category.id} data-category-id={category.id}>
                        <div
                          className={`px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 ${categoryValue === category.id.toString() ? "bg-primary-50 text-primary-600" : "text-gray-900"}`}
                          onClick={(e) => { e.stopPropagation(); handleCategorySelect(category.id); }}
                          onMouseEnter={() => {
                            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                            setHoveredCategoryId(category.id);
                            setHoveredSubCategoryId(null);
                          }}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {CategoryIcon && <CategoryIcon className="text-lg flex-shrink-0" />}
                            <span className="truncate">{category.name}</span>
                          </div>
                          {hasSub && <FiChevronRight className="ml-2 text-gray-400" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* Subcategories */}
            {hoveredCategoryId && hoveredSubcategories.length > 0 && (
              <motion.div
                ref={subcategoryDropdownRef}
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                className="absolute bg-white border border-gray-200 rounded-xl shadow-xl min-w-[200px] z-[60]">
                <div className="py-1 max-h-60 overflow-y-auto">
                  {hoveredSubcategories.map((subcategory) => {
                    const subSubCats = getCategoriesByParent(subcategory.id).filter((cat) => cat.isActive !== false);
                    const hasSubSub = subSubCats.length > 0;
                    const SubIcon = getCategoryIcon(subcategory);
                    return (
                      <div key={subcategory.id} data-subcategory-id={subcategory.id}>
                        <div
                          className={`px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 ${subcategoryValue === subcategory.id.toString() ? "bg-primary-50 text-primary-600" : "text-gray-900"}`}
                          onClick={(e) => { e.stopPropagation(); handleSubcategorySelect(subcategory.id, hoveredCategoryId); }}
                          onMouseEnter={() => setHoveredSubCategoryId(subcategory.id)}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {SubIcon && <SubIcon className="text-lg flex-shrink-0" />}
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

            {/* Sub-subcategories */}
            {hoveredSubCategoryId && hoveredSubSubCategories.length > 0 && (
              <motion.div
                ref={subSubCategoryDropdownRef}
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                className="absolute bg-white border border-gray-200 rounded-xl shadow-xl min-w-[200px] z-[70]">
                <div className="py-1 max-h-60 overflow-y-auto">
                  {hoveredSubSubCategories.map((subSubCategory) => {
                    const SubSubIcon = getCategoryIcon(subSubCategory);
                    return (
                      <div
                        key={subSubCategory.id}
                        onClick={(e) => { e.stopPropagation(); handleSubSubCategorySelect(subSubCategory.id, hoveredSubCategoryId, hoveredCategoryId); }}
                        className={`px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-gray-50 ${subSubCategoryValue === subSubCategory.id.toString() ? "bg-primary-50 text-primary-600" : "text-gray-900"}`}>
                        {SubSubIcon && <SubSubIcon className="text-lg flex-shrink-0" />}
                        <span className="truncate">{subSubCategory.name}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {required && <input type="hidden" value={value || ""} required={required} />}
    </div>
  );
};

export default CategorySelector;
