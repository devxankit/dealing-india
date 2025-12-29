import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiFilter, FiArrowLeft, FiGrid, FiList, FiX, FiChevronDown } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import MobileLayout from "../components/Layout/MobileLayout";
import ProductCard from "../../../shared/components/ProductCard";
import ProductListItem from "../components/Mobile/ProductListItem";
import { useCategoryStore } from "../../../shared/store/categoryStore";
import { getProductsByCategory } from "../../../shared/services/productService";
import PageTransition from "../../../shared/components/PageTransition";
import useInfiniteScroll from "../../../shared/hooks/useInfiniteScroll";
import LazyImage from "../../../shared/components/LazyImage";
import { getPlaceholderImage } from "../../../shared/utils/helpers";
import toast from "react-hot-toast";

const MobileCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // Use categoryId as string (MongoDB ObjectIds are strings, not numbers)
  const categoryId = id;
  const { categories, initialize, getCategoryById, getCategoriesByParent, isLoading } =
    useCategoryStore();

  // Initialize store on mount and refresh periodically
  useEffect(() => {
    initialize(true); // Force refresh on mount
    
    // Refresh categories every 30 seconds to catch new additions
    const refreshInterval = setInterval(() => {
      initialize(true);
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [initialize]);

  // Get category from store
  const category = useMemo(() => {
    return getCategoryById(categoryId);
  }, [categoryId, categories, getCategoryById]);

  // Get subcategories for this category
  const subcategories = useMemo(() => {
    if (!categoryId) return [];
    return getCategoriesByParent(categoryId).filter(
      (cat) => cat.isActive !== false
    );
  }, [categoryId, categories, getCategoriesByParent]);

  // State for selected nested subcategories (supports unlimited depth)
  // Structure: { level0: categoryId, level1: subcategoryId, level2: subSubcategoryId, ... }
  const [selectedNestedCategories, setSelectedNestedCategories] = useState({});
  
  // State for dropdown visibility for each category
  const [openDropdowns, setOpenDropdowns] = useState({});

  // Get nested subcategories recursively for any level
  const getNestedSubcategories = useCallback((parentId) => {
    if (!parentId) return [];
    
    // Normalize parentId to string
    const normalizedParentId = parentId?.toString() || String(parentId);
    
    // Get children categories
    const children = getCategoriesByParent(normalizedParentId).filter(
      (cat) => cat.isActive !== false
    );
    
    return children;
  }, [getCategoriesByParent, categories]);

  // Get all children for a category at a specific level (for building dropdown structure)
  const getChildrenForCategory = useCallback((parentId, level) => {
    return getNestedSubcategories(parentId);
  }, [getNestedSubcategories]);

  // Get all active nested category levels
  // Returns: { buttonLevels: [], dropdownLevels: {} }
  // buttonLevels: First 2 levels (0, 1) shown as buttons
  // dropdownLevels: Level 2+ shown as dropdowns within parent buttons
  const getActiveNestedLevels = useCallback(() => {
    const buttonLevels = [];
    const dropdownLevels = {}; // { categoryId: [{ level, parentId, selectedId, categories }] }
    let currentParentId = categoryId?.toString() || String(categoryId);
    let level = 0;
    const maxLevels = 20; // Support up to 20 levels deep

    // Build button levels (first 2 levels) based on selections
    while (currentParentId && level < 2 && level < maxLevels) {
      // Get children for current parent
      const children = getNestedSubcategories(currentParentId);
      
      if (children.length === 0) {
        // No more children, stop
        break;
      }

      // Get selected category ID for this level
      const selectedId = selectedNestedCategories[`level${level}`] || null;
      
      // First 2 levels (0, 1) are shown as buttons
      buttonLevels.push({
        level,
        parentId: currentParentId,
        selectedId,
        categories: children,
      });

      // If a category is selected at this level, move to its children
      if (selectedId) {
        const normalizedSelectedId = selectedId?.toString() || String(selectedId);
        // Verify the selected category exists in children
        const selectedCategory = children.find(cat => {
          const catId = cat.id?.toString() || String(cat.id);
          return catId === normalizedSelectedId;
        });
        
        if (selectedCategory) {
          // Move to next level with selected category as parent
          currentParentId = normalizedSelectedId;
          level++;
        } else {
          // Selected category not found in children, stop
          break;
        }
      } else {
        // No selection at this level, stop
        break;
      }
    }

    // Build dropdown levels for ALL categories that have children (not just selected path)
    // This ensures all deeper categories are accessible even if not selected
    const buildDropdownsForCategory = (parentId, parentLevel, depth = 0) => {
      if (depth >= 18 || parentLevel >= maxLevels) return; // Limit depth to prevent infinite recursion
      
      const children = getChildrenForCategory(parentId, parentLevel + 1);
      if (children.length === 0) return;
      
      const normalizedParentId = parentId?.toString() || String(parentId);
      if (!dropdownLevels[normalizedParentId]) {
        dropdownLevels[normalizedParentId] = [];
      }
      
      // Check if this level already exists in dropdowns
      const levelExists = dropdownLevels[normalizedParentId].some(
        dl => dl.level === parentLevel + 1 && dl.parentId === normalizedParentId
      );
      
      if (!levelExists) {
        dropdownLevels[normalizedParentId].push({
          level: parentLevel + 1,
          parentId: normalizedParentId,
          selectedId: selectedNestedCategories[`level${parentLevel + 1}`] || null,
          categories: children,
        });
      }
      
      // Recursively build for all children
      children.forEach(child => {
        const childId = child.id?.toString() || String(child.id);
        buildDropdownsForCategory(childId, parentLevel + 1, depth + 1);
      });
    };
    
    if (buttonLevels.length > 0) {
      // Build dropdowns for all level 1 categories (these will show level 2+)
      const level1Data = buttonLevels.find(bl => bl.level === 1);
      if (level1Data) {
        level1Data.categories.forEach(category => {
          const categoryId = category.id?.toString() || String(category.id);
          buildDropdownsForCategory(categoryId, 1, 0);
        });
      } else {
        // If level 1 doesn't exist, build dropdowns for level 0 categories (these will show level 1+)
        const level0Data = buttonLevels.find(bl => bl.level === 0);
        if (level0Data) {
          level0Data.categories.forEach(category => {
            const categoryId = category.id?.toString() || String(category.id);
            buildDropdownsForCategory(categoryId, 0, 0);
          });
        }
      }
    }

    return { buttonLevels, dropdownLevels };
  }, [categoryId, selectedNestedCategories, getNestedSubcategories, getChildrenForCategory]);

  const { buttonLevels, dropdownLevels } = useMemo(() => getActiveNestedLevels(), [getActiveNestedLevels, categories]);
  
  // Toggle dropdown for a category
  const toggleDropdown = (categoryId, forceOpen = null) => {
    const normalizedId = categoryId?.toString() || String(categoryId);
    setOpenDropdowns(prev => ({
      ...prev,
      [normalizedId]: forceOpen !== null ? forceOpen : !prev[normalizedId]
    }));
  };
  
  // Close all dropdowns
  const closeAllDropdowns = () => {
    setOpenDropdowns({});
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.category-dropdown-container')) {
        closeAllDropdowns();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Reset nested selections when category changes
  useEffect(() => {
    setSelectedNestedCategories({});
  }, [categoryId]);

  // Auto-select first subcategory at each level (supports unlimited depth)
  useEffect(() => {
    if (!categoryId || categories.length === 0) return;
    
    // Don't auto-select if user has manually selected something
    // Check if there are any manual selections beyond what auto-selection would create
    const hasManualSelections = Object.keys(selectedNestedCategories).length > 0;
    if (hasManualSelections) {
      // Check if current selections are still valid
      let isValid = true;
      let currentParentId = categoryId?.toString() || String(categoryId);
      let level = 0;
      
      while (currentParentId && level < 20) {
        const selectedId = selectedNestedCategories[`level${level}`];
        if (!selectedId) break;
        
        const children = getNestedSubcategories(currentParentId);
        const selectedCategory = children.find(cat => {
          const catId = cat.id?.toString() || String(cat.id);
          const selId = selectedId?.toString() || String(selectedId);
          return catId === selId;
        });
        
        if (!selectedCategory) {
          isValid = false;
          break;
        }
        
        currentParentId = selectedId?.toString() || String(selectedId);
        level++;
      }
      
      if (isValid) {
        // Selections are still valid, don't override
        return;
      }
    }
    
    const newSelections = {};
    let currentParentId = categoryId?.toString() || String(categoryId);
    let level = 0;
    const maxLevels = 20; // Support up to 20 levels deep

    // Auto-select first child at each level recursively
    while (currentParentId && level < maxLevels) {
      const children = getNestedSubcategories(currentParentId);
      if (children.length > 0) {
        const firstChild = children[0];
        const firstChildId = firstChild.id?.toString() || String(firstChild.id);
        newSelections[`level${level}`] = firstChildId;
        currentParentId = firstChildId;
        level++;
      } else {
        break;
      }
    }

    // Only update if we have selections and they're different from current
    if (Object.keys(newSelections).length > 0) {
      const hasChanges = Object.keys(newSelections).some(
        key => newSelections[key] !== selectedNestedCategories[key]
      );
      if (hasChanges) {
        setSelectedNestedCategories(newSelections);
      }
    }
  }, [categoryId, categories, getNestedSubcategories, selectedNestedCategories]);

  // Handle category selection from filter dropdown (with full path)
  const handleFilterCategorySelect = (categoryPath) => {
    // categoryPath is an array of [level0Id, level1Id, level2Id, ...]
    const newSelections = {};
    categoryPath.forEach((catId, index) => {
      if (catId) {
        const normalizedId = catId?.toString() || String(catId);
        newSelections[`level${index}`] = normalizedId;
      }
    });
    
    // Clear deeper levels
    for (let i = categoryPath.length; i < 20; i++) {
      delete newSelections[`level${i}`];
    }
    
    setSelectedNestedCategories(newSelections);
    setShowFilters(false);
  };

  // Handle nested category selection
  const handleNestedCategorySelect = (level, categoryId) => {
    const newSelections = { ...selectedNestedCategories };
    // Normalize categoryId to string
    const normalizedId = categoryId?.toString() || String(categoryId);
    newSelections[`level${level}`] = normalizedId;
    
    // Clear deeper levels when a category is selected
    for (let i = level + 1; i < 20; i++) {
      delete newSelections[`level${i}`];
    }
    
    // Auto-select first child of selected category if it has children
    const children = getNestedSubcategories(normalizedId);
    if (children.length > 0) {
      const firstChild = children[0];
      const firstChildId = firstChild.id?.toString() || String(firstChild.id);
      newSelections[`level${level + 1}`] = firstChildId;
      
      // Recursively auto-select deeper levels
      let currentParentId = firstChildId;
      let currentLevel = level + 2;
      while (currentParentId && currentLevel < 20) {
        const nextChildren = getNestedSubcategories(currentParentId);
        if (nextChildren.length > 0) {
          const nextFirstChild = nextChildren[0];
          const nextFirstChildId = nextFirstChild.id?.toString() || String(nextFirstChild.id);
          newSelections[`level${currentLevel}`] = nextFirstChildId;
          currentParentId = nextFirstChildId;
          currentLevel++;
        } else {
          break;
        }
      }
    }
    
    setSelectedNestedCategories(newSelections);
    
    // Auto-open dropdown for level 1 categories that have deeper levels (level 2+)
    if (level === 1) {
      const hasDeeperLevels = children.length > 0;
      if (hasDeeperLevels) {
        toggleDropdown(normalizedId, true);
      }
    }
  };

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
  });
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsPagination, setProductsPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });

  // Fetch products by category
  const fetchProducts = useCallback(async () => {
    if (!categoryId) {
      setProducts([]);
      setProductsPagination({ total: 0, page: 1, totalPages: 1 });
      return;
    }

    setLoadingProducts(true);
    try {
      // Get the deepest selected nested category, or fallback to main category
      let categoryIdToUse = categoryId?.toString() || String(categoryId);
      for (let i = 9; i >= 0; i--) {
        const selectedId = selectedNestedCategories[`level${i}`];
        if (selectedId) {
          categoryIdToUse = selectedId?.toString() || String(selectedId);
          break;
        }
      }
      const result = await getProductsByCategory(categoryIdToUse, {
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        minRating: filters.minRating || undefined,
        page: 1,
        limit: 100, // Get more products for better UX
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const fetchedProducts = result.products || result.data?.products || [];
      
      // Transform products to match frontend format
      const transformedProducts = fetchedProducts.map((product) => ({
        id: product._id || product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        images: product.images || [],
        description: product.description,
        unit: product.unit,
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        stock: product.stock,
        stockQuantity: product.stockQuantity,
        categoryId: product.categoryId?._id || product.categoryId,
        subcategoryId: product.subcategoryId?._id || product.subcategoryId,
        brandId: product.brandId?._id || product.brandId,
        vendorId: product.vendorId?._id || product.vendorId,
        isNew: product.isNew,
        isFeatured: product.isFeatured,
        flashSale: product.flashSale,
      }));

      setProducts(transformedProducts);
      setProductsPagination({
        total: result.total || result.data?.total || 0,
        page: result.page || result.data?.page || 1,
        totalPages: result.totalPages || result.data?.totalPages || 1,
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
      setProducts([]);
      setProductsPagination({ total: 0, page: 1, totalPages: 1 });
    } finally {
      setLoadingProducts(false);
    }
  }, [categoryId, selectedNestedCategories, filters]);

  // Fetch products when category or filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const { displayedItems, hasMore, isLoading, loadMore, loadMoreRef } =
    useInfiniteScroll(products, 10, 10);

  const filterButtonRef = useRef(null);

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      minPrice: "",
      maxPrice: "",
      minRating: "",
    });
  };

  // Check if any filter is active
  const hasActiveFilters =
    filters.minPrice ||
    filters.maxPrice ||
    filters.minRating ||
    filters.category;

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showFilters &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target) &&
        !event.target.closest(".filter-dropdown")
      ) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showFilters]);

  if (!category) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={false}>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Category Not Found
              </h2>
              <button
                onClick={() => navigate("/app")}
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold">
                Go Back Home
              </button>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <MobileLayout showBottomNav={true} showCartBar={true}>
        <div className="w-full pb-24">
          {/* Header */}
          <div className="px-4 py-4 bg-white border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <FiArrowLeft className="text-xl text-gray-700" />
              </button>
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <LazyImage
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = getPlaceholderImage(48, 48, "Category");
                  }}
                />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-800">
                  {category.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {loadingProducts ? "Loading..." : `${products.length} product${products.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View Toggle Buttons */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === "list"
                        ? "bg-white text-primary-600 shadow-sm"
                        : "text-gray-600"
                    }`}>
                    <FiList className="text-lg" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === "grid"
                        ? "bg-white text-primary-600 shadow-sm"
                        : "text-gray-600"
                    }`}>
                    <FiGrid className="text-lg" />
                  </button>
                </div>
                <div ref={filterButtonRef} className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2.5 glass-card rounded-xl hover:bg-white/80 transition-colors ${
                      showFilters ? "bg-white/80" : ""
                    }`}>
                    <FiFilter
                      className={`text-lg transition-colors ${
                        hasActiveFilters ? "text-blue-600" : "text-gray-600"
                      }`}
                    />
                  </button>

                  {/* Filter Dropdown */}
                  <AnimatePresence>
                    {showFilters && (
                      <>
                        {/* Backdrop */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowFilters(false)}
                          className="fixed inset-0 bg-black/20 z-[10000]"
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                          className="filter-dropdown absolute right-0 top-full w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-[10001] overflow-hidden"
                          style={{ marginTop: "-50px" }}>
                          {/* Header */}
                          <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-1.5">
                              <FiFilter className="text-sm text-gray-700" />
                              <h3 className="text-sm font-bold text-gray-800">
                                Filters
                              </h3>
                            </div>
                            <button
                              onClick={() => setShowFilters(false)}
                              className="p-0.5 hover:bg-gray-200 rounded-full transition-colors">
                              <FiX className="text-sm text-gray-600" />
                            </button>
                          </div>

                          {/* Filter Content */}
                          <div className="max-h-[50vh] overflow-y-auto scrollbar-hide">
                            <div className="p-2 space-y-2">
                              {/* Category Filter */}
                              <div>
                                <h4 className="font-semibold text-gray-700 mb-1 text-xs">
                                  Categories
                                </h4>
                                <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-hide">
                                  {isLoading ? (
                                    <div className="text-xs text-gray-500 text-center py-2">
                                      Loading categories...
                                    </div>
                                  ) : (() => {
                                      const renderCategoryFilter = (category, level, parentPath = []) => {
                                        const catId = category.id?.toString() || String(category.id);
                                        const currentPath = [...parentPath, category.id];
                                        const isSelected = selectedNestedCategories[`level${level}`] === catId;
                                        const children = getNestedSubcategories(catId);
                                        const hasDropdownChildren = dropdownLevels[catId] && dropdownLevels[catId].length > 0;
                                        
                                        return (
                                          <div key={category.id} className="space-y-0.5">
                                            <label className="flex items-center gap-1.5 cursor-pointer p-1 rounded-md hover:bg-gray-50 transition-colors">
                                              <input
                                                type="radio"
                                                name="filterCategory"
                                                checked={isSelected}
                                                onChange={() => {
                                                  handleFilterCategorySelect(currentPath);
                                                }}
                                                className="w-3 h-3 appearance-none rounded-full border-2 border-gray-300 bg-white checked:bg-white checked:border-primary-500 relative cursor-pointer"
                                                style={{
                                                  backgroundImage: isSelected
                                                    ? "radial-gradient(circle, #10b981 40%, transparent 40%)"
                                                    : "none",
                                                }}
                                              />
                                              <span className={`text-xs flex-1 ${
                                                level === 0 ? "text-gray-700 font-medium" : 
                                                level === 1 ? "text-gray-600" : 
                                                "text-gray-500"
                                              }`}>
                                                {category.name}
                                              </span>
                                            </label>
                                            
                                            {/* Render children recursively - ALL levels */}
                                            {children.length > 0 && (
                                              <div className="ml-4 space-y-0.5">
                                                {children.map(child => renderCategoryFilter(child, level + 1, currentPath))}
                                              </div>
                                            )}
                                            
                                            {/* Dropdown children (level 2+) */}
                                            {hasDropdownChildren && dropdownLevels[catId] && (
                                              <div className="ml-4 space-y-0.5">
                                                {dropdownLevels[catId].map((dropdownLevel) => (
                                                  <div key={`dropdown-${dropdownLevel.level}`} className="space-y-0.5">
                                                    {dropdownLevel.categories.map((deepCat) => {
                                                      return renderCategoryFilter(deepCat, dropdownLevel.level, currentPath);
                                                    })}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      };
                                      
                                      // Render level 0 categories
                                      // Always use subcategories - they're the direct children of current category
                                      const categoriesToShow = subcategories.length > 0 
                                        ? subcategories 
                                        : (buttonLevels.length > 0 && buttonLevels[0]?.categories.length > 0
                                            ? buttonLevels[0].categories 
                                            : []);
                                      
                                      // Debug logging
                                      console.log('🔍 Filter Categories Debug:', {
                                        buttonLevels: buttonLevels.length,
                                        subcategories: subcategories.length,
                                        categoriesToShow: categoriesToShow.length,
                                        categoryId,
                                        totalCategories: categories.length,
                                        subcategoriesList: subcategories.map(c => c.name)
                                      });
                                      
                                      if (categoriesToShow.length > 0) {
                                        return (
                                          <div className="space-y-1">
                                            {categoriesToShow.map(cat => renderCategoryFilter(cat, 0))}
                                          </div>
                                        );
                                      }
                                      
                                      return (
                                        <div className="text-xs text-gray-500 text-center py-2">
                                          No subcategories available
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                              {/* Price Range */}
                              <div>
                                <h4 className="font-semibold text-gray-700 mb-1 text-xs">
                                  Price Range
                                </h4>
                                <div className="space-y-1.5">
                                  <input
                                    type="number"
                                    placeholder="Min Price"
                                    value={filters.minPrice}
                                    onChange={(e) =>
                                      handleFilterChange(
                                        "minPrice",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Max Price"
                                    value={filters.maxPrice}
                                    onChange={(e) =>
                                      handleFilterChange(
                                        "maxPrice",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                                  />
                                </div>
                              </div>

                              {/* Rating Filter */}
                              <div>
                                <h4 className="font-semibold text-gray-700 mb-1 text-xs">
                                  Minimum Rating
                                </h4>
                                <div className="space-y-0.5">
                                  {[4, 3, 2, 1].map((rating) => (
                                    <label
                                      key={rating}
                                      className="flex items-center gap-1.5 cursor-pointer p-1 rounded-md hover:bg-gray-50 transition-colors">
                                      <input
                                        type="radio"
                                        name="minRating"
                                        value={rating}
                                        checked={
                                          filters.minRating ===
                                          rating.toString()
                                        }
                                        onChange={(e) =>
                                          handleFilterChange(
                                            "minRating",
                                            e.target.value
                                          )
                                        }
                                        className="w-3 h-3 appearance-none rounded-full border-2 border-gray-300 bg-white checked:bg-white checked:border-primary-500 relative cursor-pointer"
                                        style={{
                                          backgroundImage:
                                            filters.minRating ===
                                            rating.toString()
                                              ? "radial-gradient(circle, #10b981 40%, transparent 40%)"
                                              : "none",
                                        }}
                                      />
                                      <span className="text-xs text-gray-700">
                                        {rating}+ Stars
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="border-t border-gray-200 p-2 bg-gray-50 space-y-1.5">
                            <button
                              onClick={clearFilters}
                              className="w-full py-1.5 bg-gray-200 text-gray-700 rounded-md font-semibold text-xs hover:bg-gray-300 transition-colors">
                              Clear All
                            </button>
                            <button
                              onClick={() => setShowFilters(false)}
                              className="w-full py-1.5 gradient-green text-white rounded-md font-semibold text-xs hover:shadow-glow-green transition-all">
                              Apply Filters
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter Buttons (First 2 Levels) */}
          {buttonLevels.map((levelData, index) => (
            levelData.categories.length > 0 && (
              <div key={`level-${levelData.level}`} className="px-4 py-3 bg-white border-b border-gray-200">
                <div
                  className="overflow-x-auto scrollbar-hide -mx-4 px-4"
                  style={{
                    scrollBehavior: "smooth",
                    WebkitOverflowScrolling: "touch",
                  }}>
                  <div className="flex gap-1.5">
                    {levelData.categories.map((subcategory) => {
                      // Normalize IDs for comparison
                      const subcategoryId = subcategory.id?.toString() || String(subcategory.id);
                      const selectedId = levelData.selectedId?.toString() || String(levelData.selectedId || '');
                      const isActive = levelData.selectedId && subcategoryId === selectedId;
                      
                      // Check if this category has deeper levels (dropdown)
                      // Level 1 categories show dropdowns for level 2+
                      // Level 0 categories can also show dropdowns if level 1 doesn't exist as buttons
                      const hasDropdown = (levelData.level === 1 || (levelData.level === 0 && buttonLevels.length === 1)) 
                        && dropdownLevels[subcategoryId] 
                        && dropdownLevels[subcategoryId].length > 0;
                      const isDropdownOpen = openDropdowns[subcategoryId] || false;
                      
                      return (
                        <div key={subcategory.id} className="relative flex-shrink-0">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNestedCategorySelect(levelData.level, subcategory.id);
                              if (hasDropdown) {
                                toggleDropdown(subcategory.id);
                              } else {
                                closeAllDropdowns();
                              }
                            }}
                            whileTap={{ scale: 0.97 }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap border ${
                              isActive
                                ? "bg-white text-primary-600 border-primary-200 shadow-sm"
                                : "bg-gray-50 text-gray-600 border-gray-200 active:bg-gray-100"
                            }`}
                            style={{ willChange: "transform" }}>
                            <span>{subcategory.name}</span>
                            {hasDropdown && (
                              <FiChevronDown 
                                className={`text-xs transition-transform duration-200 ${
                                  isDropdownOpen ? 'rotate-180' : ''
                                }`} 
                              />
                            )}
                          </motion.button>
                          
                          {/* Dropdown for deeper levels (Level 2+) */}
                          {hasDropdown && isDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              onClick={(e) => e.stopPropagation()}
                              className="category-dropdown-container absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px] max-h-[300px] overflow-y-auto">
                              {dropdownLevels[subcategoryId].map((dropdownLevel) => (
                                <div key={`dropdown-level-${dropdownLevel.level}`} className="p-2">
                                  <div className="text-xs font-semibold text-gray-700 mb-1 px-2">
                                    Level {dropdownLevel.level + 1}
                                  </div>
                                  {dropdownLevel.categories.map((deepCategory) => {
                                    const deepCategoryId = deepCategory.id?.toString() || String(deepCategory.id);
                                    const deepSelectedId = dropdownLevel.selectedId?.toString() || String(dropdownLevel.selectedId || '');
                                    const isDeepActive = dropdownLevel.selectedId && deepCategoryId === deepSelectedId;
                                    
                                    // Check if this deep category has even deeper levels
                                    const hasDeepDropdown = dropdownLevels[deepCategoryId] && dropdownLevels[deepCategoryId].length > 0;
                                    const isDeepDropdownOpen = openDropdowns[deepCategoryId] || false;
                                    
                                    return (
                                      <div key={deepCategory.id} className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNestedCategorySelect(dropdownLevel.level, deepCategory.id);
                                            if (hasDeepDropdown) {
                                              toggleDropdown(deepCategory.id);
                                            }
                                          }}
                                          className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                                            isDeepActive
                                              ? "bg-primary-50 text-primary-600 font-medium"
                                              : "text-gray-700 hover:bg-gray-50"
                                          }`}>
                                          <span>{deepCategory.name}</span>
                                          {hasDeepDropdown && (
                                            <FiChevronDown 
                                              className={`text-xs transition-transform duration-200 ${
                                                isDeepDropdownOpen ? 'rotate-180' : ''
                                              }`} 
                                            />
                                          )}
                                        </button>
                                        
                                        {/* Nested dropdown for even deeper levels */}
                                        {hasDeepDropdown && isDeepDropdownOpen && (
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="ml-2 mt-1 border-l-2 border-gray-200 pl-2">
                                            {dropdownLevels[deepCategoryId].map((nestedDropdownLevel) => (
                                              <div key={`nested-dropdown-level-${nestedDropdownLevel.level}`} className="py-1">
                                                {nestedDropdownLevel.categories.map((nestedCategory) => {
                                                  const nestedCategoryId = nestedCategory.id?.toString() || String(nestedCategory.id);
                                                  const nestedSelectedId = nestedDropdownLevel.selectedId?.toString() || String(nestedDropdownLevel.selectedId || '');
                                                  const isNestedActive = nestedDropdownLevel.selectedId && nestedCategoryId === nestedSelectedId;
                                                  
                                                  return (
                                                    <button
                                                      key={nestedCategory.id}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleNestedCategorySelect(nestedDropdownLevel.level, nestedCategory.id);
                                                      }}
                                                      className={`w-full text-left px-3 py-1 rounded-md text-xs transition-colors ${
                                                        isNestedActive
                                                          ? "bg-primary-50 text-primary-600 font-medium"
                                                          : "text-gray-600 hover:bg-gray-50"
                                                      }`}>
                                                      {nestedCategory.name}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            ))}
                                          </motion.div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          ))}

          {/* Products List */}
          <div className="px-4 py-4">
            {loadingProducts ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-sm text-gray-600">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-300 mx-auto mb-4">📦</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600">
                  There are no products available in this category at the
                  moment.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {displayedItems.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>

                {hasMore && (
                  <div
                    ref={loadMoreRef}
                    className="mt-6 flex flex-col items-center gap-4">
                    {isLoading && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-sm">
                          Loading more products...
                        </span>
                      </div>
                    )}
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isLoading ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-3">
                  {displayedItems.map((product, index) => (
                    <ProductListItem
                      key={product.id}
                      product={product}
                      index={index}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div
                    ref={loadMoreRef}
                    className="mt-6 flex flex-col items-center gap-4">
                    {isLoading && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-sm">
                          Loading more products...
                        </span>
                      </div>
                    )}
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isLoading ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileCategory;
