import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiFilter, FiGrid, FiStar, FiCheck, FiTag, FiTrendingUp } from 'react-icons/fi';
import { IndianRupee } from 'lucide-react';
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
  useEffect(() => {
    setActiveSection(hideCategoryFilter ? 'price' : 'category');
  }, [isOpen, hideCategoryFilter]);

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
              <label className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg transition-colors ${isLeafCategory
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
                <span className={`text-sm font-medium ${isLeafCategory
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

  // Filter sections configuration
  const filterSections = [
    ...(!hideCategoryFilter ? [{ id: 'category', label: 'Category', icon: FiGrid }] : []),
    { id: 'sort', label: 'Sort By', icon: FiTrendingUp },
    { id: 'price', label: 'Price', icon: IndianRupee },
    { id: 'rating', label: 'Rating', icon: FiStar },
    { id: 'discount', label: 'Discount', icon: FiTag },
    { id: 'brand', label: 'Brand', icon: FiCheck },
  ];

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'category':
        return (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
              <FiGrid className="text-primary-500" />
              Select Category
            </h3>
            {renderNestedCategories()}
          </div>
        );
      case 'sort':
        return (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
              <FiTrendingUp className="text-primary-500" />
              Sort Products By
            </h3>
            <div className="space-y-1">
              {[
                { id: 'newest', label: 'Newest First' },
                { id: 'price_low', label: 'Price: Low to High' },
                { id: 'price_high', label: 'Price: High to Low' },
                { id: 'popularity', label: 'Popularity' },
                { id: 'rating', label: 'Customer Rating' },
              ].map((option) => (
                <label
                  key={option.id}
                  className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <span className="text-sm text-gray-700 font-medium">{option.label}</span>
                  <input
                    type="radio"
                    name="sortBy"
                    value={option.id}
                    checked={filters.sortBy === option.id}
                    onChange={(e) => onFilterChange('sortBy', e.target.value)}
                    className="w-4 h-4 text-primary-500"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      case 'price':
        return (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
              <IndianRupee className="text-primary-500" />
              Price Range
            </h3>
            <div className="space-y-4 p-1">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">Min</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={filters.minPrice}
                      onChange={(e) => onFilterChange('minPrice', e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm bg-gray-50/50"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">Max</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                    <input
                      type="number"
                      placeholder="50000+"
                      value={filters.maxPrice}
                      onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm bg-gray-50/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Under ₹500', min: '0', max: '500' },
                  { label: '₹500 - ₹1000', min: '500', max: '1000' },
                  { label: '₹1000 - ₹5000', min: '1000', max: '5000' },
                  { label: 'Over ₹5000', min: '5000', max: '100000' }
                ].map((range) => (
                  <button
                    key={range.label}
                    onClick={() => {
                      onFilterChange({
                        minPrice: range.min,
                        maxPrice: range.max
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full border text-[11px] transition-colors ${filters.minPrice === range.min && filters.maxPrice === range.max
                        ? 'border-primary-500 bg-primary-50 text-primary-600 font-bold'
                        : 'border-gray-200 text-gray-600 hover:border-primary-500 hover:text-primary-600'
                      }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'rating':
        return (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
              <FiStar className="text-primary-500" />
              Customer Rating
            </h3>
            <div className="space-y-2">
              {[4, 3, 2, 1].map((rating) => (
                <label
                  key={rating}
                  className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          className={`text-xs ${i < rating ? 'fill-current' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{rating}.0 & Above</span>
                  </div>
                  <input
                    type="radio"
                    name="minRating"
                    value={rating}
                    checked={filters.minRating === rating.toString()}
                    onChange={(e) => onFilterChange('minRating', e.target.value)}
                    className="w-4 h-4 text-primary-500"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      case 'discount':
        return (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
              <FiTag className="text-primary-500" />
              Discount Offers
            </h3>
            <div className="space-y-1">
              {[
                { id: '10', label: '10% and above' },
                { id: '20', label: '20% and above' },
                { id: '30', label: '30% and above' },
                { id: '50', label: '50% and above' },
                { id: '70', label: '70% and above' },
              ].map((option) => (
                <label
                  key={option.id}
                  className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <span className="text-sm text-gray-700 font-medium">{option.label}</span>
                  <input
                    type="radio"
                    name="discount"
                    value={option.id}
                    checked={filters.discount === option.id}
                    onChange={(e) => onFilterChange('discount', e.target.value)}
                    className="w-4 h-4 text-primary-500"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      case 'brand':
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                <FiCheck className="text-primary-500" />
                Popular Brands
              </h3>
              <span className="text-[10px] text-primary-600 font-bold uppercase tracking-tighter">Search</span>
            </div>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-1 scrollbar-hide">
              {['Samsung', 'Apple', 'Nike', 'Adidas', 'Sony', 'LG', 'Puma', 'Zara', 'H&M', 'OnePlus', 'Xiaomi'].map((brand) => (
                <label
                  key={brand}
                  className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <span className="text-sm text-gray-700 font-medium">{brand}</span>
                  <input
                    type="checkbox"
                    name="brand"
                    value={brand}
                    checked={filters.brand && filters.brand.includes(brand)}
                    onChange={() => onFilterChange('brand', brand)}
                    className="w-4 h-4 rounded text-primary-500 border-gray-300 focus:ring-primary-500"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100000]"
          />

          {/* Filter Panel - Bottom Sheet */}
          <motion.div
            ref={panelRef}
            initial={{ y: '100%' }}
            animate={{ y: dragY > 0 ? dragY : 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[100001] flex flex-col max-h-[70vh]"
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
                        className={`w-full flex flex-col items-center gap-1 px-1.5 py-2.5 transition-all ${isActive
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
    </AnimatePresence>,
    document.body
  );
};

export default MobileFilterPanel;
