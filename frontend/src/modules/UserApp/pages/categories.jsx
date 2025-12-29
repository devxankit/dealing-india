import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import MobileLayout from "../components/Layout/MobileLayout";
import { useCategoryStore } from "../../../shared/store/categoryStore";
import PageTransition from "../../../shared/components/PageTransition";
import LazyImage from "../../../shared/components/LazyImage";

const MobileCategories = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { categories, initialize, getCategoriesByParent, getRootCategories } =
    useCategoryStore();

  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get root categories (categories without parent)
  const rootCategories = useMemo(() => {
    const roots = getRootCategories().filter(cat => cat.isActive !== false);
    return roots;
  }, [categories, getRootCategories]);

  // Debug: Log categories when they change
  useEffect(() => {
    console.log('📦 Categories loaded:', categories.length);
    console.log('📦 Root categories:', rootCategories.length, rootCategories.map(c => c.name));
  }, [categories, rootCategories]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const categoryListRef = useRef(null);
  const activeCategoryRef = useRef(null);

  // Set initial selected category when root categories are loaded
  useEffect(() => {
    if (rootCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(rootCategories[0]?.id || null);
    }
  }, [rootCategories, selectedCategoryId]);

  // Get ONLY direct children (first level subcategories) for selected category
  // In All Categories page, we only show first-level subcategories, not nested ones
  // Nested subcategories will be shown in Category detail page
  const subcategories = useMemo(() => {
    if (!selectedCategoryId) {
      return [];
    }
    
    // Get direct children only (first level subcategories)
    // getCategoriesByParent already returns only direct children, so this should be correct
    const directChildren = getCategoriesByParent(selectedCategoryId);
    
    // Filter: Only show active categories that are direct children
    const filtered = directChildren.filter((cat) => {
      // Must be active
      if (cat.isActive === false) return false;
      
      // Double-check: Verify it's a direct child (parentId matches selectedCategoryId)
      const catParentId = cat.parentId?.toString() || String(cat.parentId);
      const selectedId = selectedCategoryId?.toString() || String(selectedCategoryId);
      
      // Only include if parentId matches (direct child)
      return catParentId === selectedId;
    });
    
    return filtered;
  }, [selectedCategoryId, categories, getCategoriesByParent]);

  // Group subcategories - Show all first subcategories as cards, even if they have children
  const groupedSubcategories = useMemo(() => {
    if (!subcategories.length) return [];
    
    // Always show all first subcategories as cards in a single group
    // If a first subcategory has children (second subcategories), those will be shown when clicked
    return [{
      parent: null,
      children: subcategories // All first subcategories shown as cards
    }];
  }, [subcategories]);

  // Scroll active category into view
  useEffect(() => {
    if (activeCategoryRef.current && categoryListRef.current) {
      const categoryElement = activeCategoryRef.current;
      const listContainer = categoryListRef.current;

      const elementTop = categoryElement.offsetTop;
      const elementHeight = categoryElement.offsetHeight;
      const containerHeight = listContainer.clientHeight;
      const scrollTop = listContainer.scrollTop;

      if (
        elementTop < scrollTop ||
        elementTop + elementHeight > scrollTop + containerHeight
      ) {
        requestAnimationFrame(() => {
          listContainer.scrollTo({
            top: elementTop - listContainer.offsetTop - 10,
            behavior: "smooth",
          });
        });
      }
    }
  }, [selectedCategoryId]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategoryId(categoryId);
  };

  const handleSubcategoryClick = (subcategoryId) => {
    navigate(`/app/category/${subcategoryId}`);
  };

  // Handle empty categories
  if (rootCategories.length === 0) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={true} showCartBar={true}>
          <div className="w-full flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <div className="text-6xl text-gray-300 mx-auto mb-4">📦</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                No Categories Available
              </h2>
              <p className="text-gray-600">
                There are no categories to display at the moment.
              </p>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <MobileLayout showBottomNav={true} showCartBar={true}>
        <div className="w-full flex flex-col h-screen overflow-hidden">
          {/* Top Header - Fixed */}
          <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Title */}
              <h1 className="text-lg font-bold text-gray-900">All Categories</h1>
              
              {/* Right Icons */}
              <div className="flex items-center gap-4">
                {/* Search Icon */}
                <button
                  onClick={() => navigate('/app/search')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiSearch className="text-xl text-gray-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area - Sidebar and Subcategories */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Vertical Category List */}
            <div
              ref={categoryListRef}
              className="w-[80px] bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0"
            >
              <div className="py-1">
                {rootCategories.map((category) => {
                  const isActive = category.id === selectedCategoryId;
                  return (
                    <div
                      key={category.id}
                      ref={isActive ? activeCategoryRef : null}
                    >
                      <motion.button
                        onClick={() => handleCategorySelect(category.id)}
                        whileTap={{ scale: 0.95 }}
                        className={`w-full px-1.5 py-3 flex flex-col items-center gap-1 transition-all ${
                          isActive 
                            ? "bg-blue-50" 
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {/* Circular Category Icon */}
                        <div
                          className={`w-14 h-14 rounded-full overflow-hidden flex-shrink-0 transition-all ${
                            isActive ? "ring-2 ring-blue-500" : ""
                          }`}
                        >
                          <LazyImage
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover"
                            placeholderWidth={56}
                            placeholderHeight={56}
                            placeholderText={category.name}
                          />
                        </div>
                        
                        {/* Category Name */}
                        <span
                          className={`text-[10px] font-semibold text-center leading-tight px-1 ${
                            isActive ? "text-blue-600" : "text-gray-700"
                          }`}
                        >
                          {category.name}
                        </span>
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Content - Subcategories Grid */}
            <div className="flex-1 bg-white overflow-y-auto">
              <div className="p-4">
                {groupedSubcategories.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl text-gray-300 mx-auto mb-4">📦</div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      No subcategories found
                    </h3>
                    <p className="text-sm text-gray-600">
                      There are no subcategories available in this category.
                    </p>
                  </div>
                ) : (
                  groupedSubcategories.map((group, groupIndex) => (
                    <div key={groupIndex} className={groupIndex > 0 ? "mt-8" : ""}>
                      {/* Section Title */}
                      {group.parent && (
                        <h2 className="text-base font-bold text-gray-900 mb-4">
                          {group.parent.name}
                        </h2>
                      )}
                      
                      {/* Subcategory Grid - 4 columns */}
                      <div className="grid grid-cols-4 gap-2.5">
                        {group.children.slice(0, 8).map((subcat) => (
                          <motion.button
                            key={subcat.id}
                            onClick={() => handleSubcategoryClick(subcat.id)}
                            whileTap={{ scale: 0.95 }}
                            className="flex flex-col items-center gap-1.5"
                          >
                            {/* Square Image Card */}
                            <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                              <LazyImage
                                src={subcat.image}
                                alt={subcat.name}
                                className="w-full h-full object-cover"
                                placeholderWidth={80}
                                placeholderHeight={80}
                                placeholderText={subcat.name}
                              />
                            </div>
                            
                            {/* Subcategory Name */}
                            <span className="text-[11px] font-medium text-gray-800 text-center leading-tight px-0.5">
                              {subcat.name}
                            </span>
                          </motion.button>
                        ))}
                        
                        {/* View All Button - Show if 8 or more items */}
                        {group.children.length >= 8 && (
                          <motion.button
                            onClick={() => group.parent && handleSubcategoryClick(group.parent.id)}
                            whileTap={{ scale: 0.95 }}
                            className="flex flex-col items-center justify-center gap-1.5"
                          >
                            <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center shadow-sm">
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            <span className="text-[11px] font-medium text-gray-800 text-center">
                              View All
                            </span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileCategories;
