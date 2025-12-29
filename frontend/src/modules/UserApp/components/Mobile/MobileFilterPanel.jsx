import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiFilter, FiGrid, FiDollarSign, FiStar } from 'react-icons/fi';
// Dynamic categories from store
import { useCategoryStore } from '../../../../shared/store/categoryStore';
import useSwipeGesture from '../../hooks/useSwipeGesture';

const MobileFilterPanel = ({ 
  isOpen, 
  onClose, 
  filters, 
  onFilterChange, 
  onClearFilters,
  hideCategoryFilter = false, // Hide category filter option from sidebar
  deepestCategoryId = null // Show only subcategories of this deepest category
}) => {
  const { categories, initialize, getCategoriesByParent } = useCategoryStore();
  const [dragY, setDragY] = useState(0);
  const [activeSection, setActiveSection] = useState('price'); // Default to 'price' if category is hidden
  const panelRef = useRef(null);

  // Set default active section based on whether category filter is hidden
  // But if deepestCategoryId is provided, we still want to show categories (just not in sidebar)
  useEffect(() => {
    if (hideCategoryFilter && !deepestCategoryId) {
      setActiveSection('price');
    } else if (!hideCategoryFilter) {
      setActiveSection('category');
    }
    // If hideCategoryFilter is true but deepestCategoryId exists, keep current section (will show categories in content)
  }, [hideCategoryFilter, deepestCategoryId]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflowY = 'hidden';
      setDragY(0);
    } else {
      document.body.style.overflowY = '';
    }
    return () => {
      document.body.style.overflowY = '';
    };
  }, [isOpen]);

  const handleSwipeDown = () => {
    if (dragY > 100) {
      onClose();
    }
  };

  const swipeHandlers = useSwipeGesture({
    onSwipeDown: handleSwipeDown,
    threshold: 100,
  });

  // Refresh categories whenever panel opens
  useEffect(() => {
    if (isOpen) {
      initialize(true);
    }
  }, [isOpen, initialize]);

  const getChildren = (parentId) => {
    const kids = getCategoriesByParent(parentId).filter(c => c.isActive !== false);
    return kids;
  };

  const renderNestedCategories = (parentId = null, level = 0) => {
    // If deepestCategoryId is provided, show ONLY direct children (3rd level) - flat list, no nesting
    // This check must be at the top level, not inside nested calls
    if (deepestCategoryId && level === 0) {
      const list = getChildren(deepestCategoryId);
      if (!list || list.length === 0) {
        return (
          <p className="text-xs text-gray-500 py-4 text-center">
            No subcategories available
          </p>
        );
      }
      
      // Show only direct children as flat list (no nesting, no parent levels)
      return (
        <div className="space-y-1.5">
          {list.map(cat => {
            const catId = cat.id?.toString() || String(cat.id);
            return (
              <label 
                key={catId} 
                className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg transition-colors bg-primary-50 hover:bg-primary-100 border border-primary-200"
              >
                <input
                  type="radio"
                  name="category"
                  value={catId}
                  checked={filters.category === catId}
                  onChange={(e) => onFilterChange('category', catId)}
                  className="w-4 h-4 text-primary-500 flex-shrink-0"
                />
                <span className="text-sm font-medium text-primary-700 font-semibold">
                  {cat.name}
                  <span className="ml-1.5 text-xs text-primary-500">✓</span>
                </span>
              </label>
            );
          })}
        </div>
      );
    }
    
    // If deepestCategoryId is provided but level > 0, don't render nested children
    if (deepestCategoryId && level > 0) {
      return null;
    }
    
    // Normal nested category rendering (for general pages like Offers, Search)
    // Only render if deepestCategoryId is NOT provided
    if (deepestCategoryId) {
      return null; // Don't render nested categories when deepestCategoryId is provided
    }
    
    const list = parentId ? getChildren(parentId) : categories.filter(c => !c.parentId && c.isActive !== false);
    if (!list || list.length === 0) return null;
    
    return (
      <div className={level === 0 ? 'space-y-1.5' : 'ml-4 space-y-1'}>
        {list.map(cat => {
          const catId = cat.id?.toString() || String(cat.id);
          const hasChildren = getChildren(catId).length > 0;
          const isLeafCategory = !hasChildren;
          
          return (
            <div key={catId} className="space-y-1">
              <label className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg transition-colors ${
                isLeafCategory 
                  ? 'bg-primary-50 hover:bg-primary-100 border border-primary-200' 
                  : 'hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="category"
                  value={catId}
                  checked={filters.category === catId}
                  onChange={(e) => onFilterChange('category', catId)}
                  className="w-4 h-4 text-primary-500 flex-shrink-0"
                />
                <span className={`text-sm font-medium ${
                  isLeafCategory 
                    ? 'text-primary-700 font-semibold' 
                    : level === 0 
                      ? 'text-gray-800 font-semibold' 
                      : 'text-gray-700'
                }`}>
                  {cat.name}
                  {isLeafCategory && <span className="ml-1.5 text-xs text-primary-500">✓</span>}
                </span>
              </label>
              {hasChildren && (
                <div className="ml-3 border-l-2 border-gray-300 pl-3 mt-1">
                  {renderNestedCategories(catId, level + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Filter sections configuration - hide category if hideCategoryFilter is true
  const filterSections = [
    ...(hideCategoryFilter ? [] : [{ id: 'category', label: 'Category', icon: FiGrid }]),
    { id: 'price', label: 'Price', icon: FiDollarSign },
    { id: 'rating', label: 'Rating', icon: FiStar },
  ];

  // Render content based on active section
  const renderContent = () => {
    // If deepestCategoryId is provided, always show categories (even if category is hidden from sidebar)
    if (deepestCategoryId && hideCategoryFilter) {
      return (
        <div>
          <h3 className="font-bold text-gray-800 mb-3 text-base flex items-center gap-2">
            <FiGrid className="text-primary-500" />
            Select Subcategory
          </h3>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {renderNestedCategories(null, 0) || (
              <p className="text-xs text-gray-500 py-4 text-center">
                No subcategories available
              </p>
            )}
          </div>
        </div>
      );
    }
    
    switch (activeSection) {
      case 'category':
        return (
          <div>
            <h3 className="font-bold text-gray-800 mb-3 text-base flex items-center gap-2">
              <FiGrid className="text-primary-500" />
              {deepestCategoryId ? 'Select Subcategory' : 'Select Category'}
            </h3>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {renderNestedCategories(null, 0) || (
                <p className="text-xs text-gray-500 py-4 text-center">
                  {deepestCategoryId ? 'No subcategories available' : 'No categories available'}
                </p>
              )}
            </div>
            {!deepestCategoryId && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Tip:</span> Select any category including subcategories like "Shirts", "Vivo" etc.
                </p>
              </div>
            )}
          </div>
        );
      case 'price':
        return (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Price Range</h3>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Min Price"
                value={filters.minPrice}
                onChange={(e) => onFilterChange('minPrice', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={filters.maxPrice}
                onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
              />
            </div>
          </div>
        );
      case 'rating':
        return (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Minimum Rating</h3>
            <div className="space-y-1">
              {[4, 3, 2, 1].map((rating) => (
                <label
                  key={rating}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="minRating"
                    value={rating}
                    checked={filters.minRating === rating.toString()}
                    onChange={(e) => onFilterChange('minRating', e.target.value)}
                    className="w-4 h-4 text-primary-500"
                  />
                  <span className="text-xs text-gray-700 font-medium">{rating}+ Stars</span>
                </label>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[10000]"
          />

          {/* Filter Panel - Bottom Sheet */}
          <motion.div
            ref={panelRef}
            initial={{ y: '100%' }}
            animate={{ y: dragY > 0 ? dragY : 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[10001] flex flex-col max-h-[70vh]"
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchMove={(e) => {
              if (swipeHandlers.swipeState.isSwiping && swipeHandlers.swipeState.offset > 0) {
                setDragY(swipeHandlers.swipeState.offset);
              }
              swipeHandlers.onTouchMove(e);
            }}
            onTouchEnd={(e) => {
              if (dragY > 100) {
                onClose();
              } else {
                setDragY(0);
              }
              swipeHandlers.onTouchEnd(e);
            }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-3 pb-2 border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                <FiFilter className="text-lg text-gray-700" />
                <h2 className="text-base font-bold text-gray-800">Filters</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="text-lg text-gray-600" />
              </button>
            </div>

            {/* Filter Content with Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar - Compact */}
              <div className="w-24 border-r-2 border-gray-300 bg-gray-50 flex-shrink-0 overflow-y-auto">
                <div className="py-2 space-y-0.5">
                  {filterSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex flex-col items-center gap-1 px-1.5 py-2.5 transition-all ${
                          isActive
                            ? 'bg-white border-r-2 border-primary-500 text-primary-600 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className={`text-lg ${isActive ? 'text-primary-500' : 'text-gray-500'}`} />
                        <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-primary-600' : 'text-gray-600'}`}>
                          {section.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto px-3 py-3">
                {renderContent()}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-2.5 space-y-1.5">
              <button
                onClick={onClearFilters}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 gradient-green text-white rounded-lg text-sm font-semibold hover:shadow-glow-green transition-all"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileFilterPanel;
