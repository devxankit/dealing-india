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
  const containerRef = useRef(null);
  const parentDropdownRef = useRef(null);
  const subcategoryDropdownRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Get root categories (parent categories)
  const rootCategories = useMemo(() => {
    return getRootCategories().filter((cat) => cat.isActive !== false);
  }, [categories, getRootCategories]);

  // Get selected category and subcategory info
  // Ensure value is converted to string for proper comparison
  const categoryValue = value?.toString() || value;
  const subcategoryValue = subcategoryId?.toString() || subcategoryId;

  const selectedCategory = categoryValue ? getCategoryById(categoryValue) : null;
  const selectedSubcategory = subcategoryValue
    ? getCategoryById(subcategoryValue)
    : null;
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setHoveredCategoryId(null);
        // Clear any pending timeout
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
        // Cleanup timeout on unmount
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
      };
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

  // Position subcategory dropdown to the right of parent dropdown
  useEffect(() => {
    if (
      hoveredCategoryId &&
      subcategoryDropdownRef.current &&
      parentDropdownRef.current &&
      containerRef.current
    ) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const parentDropdownRect =
        parentDropdownRef.current.getBoundingClientRect();
      const hoveredElement = parentDropdownRef.current.querySelector(
        `[data-category-id="${hoveredCategoryId}"]`
      );

      if (hoveredElement) {
        const elementRect = hoveredElement.getBoundingClientRect();
        const dropdown = subcategoryDropdownRef.current;
        const viewportWidth = window.innerWidth;
        const dropdownWidth = 200; // min-w-[200px]

        // Position to the right of the parent dropdown container
        // Calculate left position relative to container
        let left = parentDropdownRect.right - containerRect.left + 8; // Right edge of parent dropdown + gap
        // Calculate top position to align with hovered item, relative to container
        let top = elementRect.top - containerRect.top;

        // Check if dropdown would overflow viewport, adjust if needed
        const rightEdge = parentDropdownRect.right + dropdownWidth + 8;
        if (rightEdge > viewportWidth - 20) {
          // Position to the left of parent dropdown instead
          left =
            parentDropdownRect.left - containerRect.left - dropdownWidth - 8;
        }

        // Ensure dropdown doesn't go above or below viewport
        if (top < 0) {
          top = 0;
        }

        // Ensure dropdown doesn't go below the parent dropdown
        const maxTop = parentDropdownRect.height - 40; // Leave some space
        if (top > maxTop) {
          top = maxTop;
        }

        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
      }
    }
  }, [hoveredCategoryId, isOpen]);

  const handleCategorySelect = (categoryId) => {
    // Ensure categoryId is a string for consistency
    const categoryIdStr = categoryId?.toString() || categoryId;

    // Clear subcategory when selecting a new parent
    // Use empty string instead of null to match form expectations
    onChange({
      target: {
        name: "categoryId",
        value: categoryIdStr,
      },
    });
    onChange({
      target: {
        name: "subcategoryId",
        value: "",
      },
    });
    setIsOpen(false);
    setHoveredCategoryId(null);
  };

  const handleSubcategorySelect = (subcategoryId, parentId) => {
    // Ensure IDs are strings for consistency
    const parentIdStr = parentId?.toString() || parentId;
    const subcategoryIdStr = subcategoryId?.toString() || subcategoryId;

    onChange({
      target: {
        name: "categoryId",
        value: parentIdStr,
      },
    });
    onChange({
      target: {
        name: "subcategoryId",
        value: subcategoryIdStr,
      },
    });
    setIsOpen(false);
    setHoveredCategoryId(null);
  };

  // Display text
  const displayText = useMemo(() => {
    if (selectedSubcategory && parentCategory) {
      return `${parentCategory.name} (${selectedSubcategory.name})`;
    }
    if (selectedCategory) {
      return selectedCategory.name;
    }
    return "Select Category";
  }, [selectedCategory, selectedSubcategory, parentCategory]);

  // Get icon for selected category (prefer subcategory icon, fallback to parent)
  const selectedCategoryIcon = useMemo(() => {
    if (selectedSubcategory) {
      return getCategoryIcon(selectedSubcategory) || getCategoryIcon(parentCategory);
    }
    if (selectedCategory) {
      return getCategoryIcon(selectedCategory);
    }
    return null;
  }, [selectedCategory, selectedSubcategory, parentCategory]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Value Display */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          // Clear any pending timeout when toggling
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }
          if (!isOpen) {
            setHoveredCategoryId(null);
          }
        }}
        className={`w-full px-4 py-2.5 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white flex items-center justify-between transition-all duration-200 hover:border-primary-400 ${!value ? "text-gray-500" : "text-gray-900"
          }`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedCategoryIcon && (
            <selectedCategoryIcon className="text-lg flex-shrink-0 text-primary-600" />
          )}
          <span className="truncate">{displayText}</span>
        </div>
        <FiChevronDown
          className={`ml-2 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? "transform rotate-180" : ""
            }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setIsOpen(false);
                setHoveredCategoryId(null);
              }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden"
            />

            {/* Categories Dropdown */}
            <motion.div
              ref={parentDropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              <div className="py-1">
                {rootCategories.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500 text-center">
                    No categories available
                  </div>
                ) : (
                  rootCategories.map((category) => {
                    const subcategories = getCategoriesByParent(
                      category.id
                    ).filter((cat) => cat.isActive !== false);
                    const hasSubcategories = subcategories.length > 0;
                    // Compare category IDs as strings for proper selection check
                    const categoryIdStr = (category.id || category._id)?.toString();
                    const isSelected = categoryValue === categoryIdStr && !subcategoryValue;
                    const isHovered = hoveredCategoryId === category.id;
                    const CategoryIcon = getCategoryIcon(category);

                    return (
                      <div key={category.id} data-category-id={category.id}>
                        <div
                          className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors duration-150 hover:bg-gray-50 ${isSelected
                            ? "bg-primary-50 text-primary-600 hover:bg-primary-100"
                            : "text-gray-900"
                            }`}
                          onClick={(e) => {
                            // Stop event propagation and default behavior
                            e.stopPropagation();
                            e.preventDefault();
                            // Clear any pending timeout for showing subcategories
                            if (closeTimeoutRef.current) {
                              clearTimeout(closeTimeoutRef.current);
                              closeTimeoutRef.current = null;
                            }
                            // Allow selecting parent category directly even if it has subcategories
                            handleCategorySelect(category.id);
                          }}
                          onMouseEnter={() => {
                            if (hasSubcategories) {
                              // Clear any pending close timeout
                              if (closeTimeoutRef.current) {
                                clearTimeout(closeTimeoutRef.current);
                                closeTimeoutRef.current = null;
                              }
                              // Small delay before showing subcategories to allow clicking on parent
                              closeTimeoutRef.current = setTimeout(() => {
                                setHoveredCategoryId(category.id);
                                closeTimeoutRef.current = null;
                              }, 150);
                            }
                          }}
                          onMouseLeave={(e) => {
                            // Clear any existing timeout
                            if (closeTimeoutRef.current) {
                              clearTimeout(closeTimeoutRef.current);
                            }
                            // 0.20 second delay before closing subcategory dropdown
                            closeTimeoutRef.current = setTimeout(() => {
                              if (subcategoryDropdownRef.current) {
                                const rect =
                                  subcategoryDropdownRef.current.getBoundingClientRect();
                                const x = e.clientX;
                                const y = e.clientY;
                                const isHoveringSub =
                                  x >= rect.left &&
                                  x <= rect.right &&
                                  y >= rect.top &&
                                  y <= rect.bottom;
                                if (!isHoveringSub) {
                                  setHoveredCategoryId(null);
                                }
                              } else {
                                setHoveredCategoryId(null);
                              }
                              closeTimeoutRef.current = null;
                            }, 200); // 0.20 seconds = 200ms
                          }}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {CategoryIcon && (
                              <CategoryIcon className={`text-lg flex-shrink-0 ${isSelected ? "text-primary-600" : "text-gray-600"
                                }`} />
                            )}
                            <span className="truncate" title={hasSubcategories ? "Click to select this category or hover to see subcategories" : ""}>
                              {category.name}
                            </span>
                          </div>
                          {hasSubcategories && (
                            <FiChevronRight
                              className="ml-2 text-gray-400 flex-shrink-0"
                              title="Hover to see subcategories"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* Subcategories Dropdown - Positioned to the right of parent dropdown */}
            {hoveredCategoryId && hoveredSubcategories.length > 0 && (
              <motion.div
                ref={subcategoryDropdownRef}
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="absolute bg-white border border-gray-200 rounded-xl shadow-xl min-w-[200px] z-[60]"
                onMouseEnter={() => {
                  // Clear any pending close timeout when entering subcategory dropdown
                  if (closeTimeoutRef.current) {
                    clearTimeout(closeTimeoutRef.current);
                    closeTimeoutRef.current = null;
                  }
                  setHoveredCategoryId(hoveredCategoryId);
                }}
                onMouseLeave={() => {
                  // 0.20 second delay before closing
                  if (closeTimeoutRef.current) {
                    clearTimeout(closeTimeoutRef.current);
                  }
                  closeTimeoutRef.current = setTimeout(() => {
                    setHoveredCategoryId(null);
                    closeTimeoutRef.current = null;
                  }, 200); // 0.20 seconds = 200ms
                }}>
                <div className="py-1 max-h-60 overflow-y-auto">
                  {hoveredSubcategories.map((subcategory) => {
                    // Ensure proper string comparison for subcategory selection
                    const subcategoryIdStr = subcategory.id?.toString() || subcategory.id;
                    const isSubSelected = subcategoryValue === subcategoryIdStr;
                    const SubcategoryIcon = getCategoryIcon(subcategory);
                    return (
                      <div
                        key={subcategory.id}
                        onClick={() =>
                          handleSubcategorySelect(
                            subcategory.id,
                            hoveredCategoryId
                          )
                        }
                        className={`px-4 py-2 cursor-pointer transition-colors duration-150 flex items-center gap-2 hover:bg-gray-50 ${isSubSelected
                          ? "bg-primary-50 text-primary-600 hover:bg-primary-100"
                          : "text-gray-900"
                          }`}>
                        {SubcategoryIcon && (
                          <SubcategoryIcon className={`text-lg flex-shrink-0 ${isSubSelected ? "text-primary-600" : "text-gray-600"
                            }`} />
                        )}
                        <span className="truncate">{subcategory.name}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Hidden input for form validation */}
      {required && (
        <input type="hidden" value={value || ""} required={required} />
      )}
    </div>
  );
};

export default CategorySelector;
