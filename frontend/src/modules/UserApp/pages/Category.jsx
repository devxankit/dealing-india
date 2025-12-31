import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiFilter, FiArrowLeft, FiGrid, FiList, FiX, FiChevronDown, FiChevronRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import MobileLayout from "../components/Layout/MobileLayout";
import MobileFilterPanel from "../components/Mobile/MobileFilterPanel";
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
  const { categories, initialize, getCategoryById, getCategoriesByParent, getRootCategories, isLoading: isLoadingCategories } =
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
    const subs = getCategoriesByParent(categoryId).filter(
      (cat) => cat.isActive !== false
    );
    // Debug: Log subcategories to help troubleshoot
    if (subs.length > 0) {
      console.log('📂 Subcategories for category:', categoryId, subs.map(s => s.name));
    }
    return subs;
  }, [categoryId, categories, getCategoriesByParent]);
  
  // Compute categories to show in filter
  const filterCategories = useMemo(() => {
    // First priority: subcategories of current category
    if (subcategories && subcategories.length > 0) {
      console.log('✅ Filter: Using subcategories', subcategories.length);
      return subcategories;
    }
    // Second priority: root categories
    if (categories && categories.length > 0) {
      const rootCats = getRootCategories ? getRootCategories() : categories.filter(cat => !cat.parentId);
      const activeRoots = rootCats.filter(cat => cat.isActive !== false);
      if (activeRoots.length > 0) {
        console.log('✅ Filter: Using root categories', activeRoots.length);
        return activeRoots;
      }
      // Fallback: all active categories
      const allActive = categories.filter(cat => cat.isActive !== false).slice(0, 20);
      console.log('✅ Filter: Using all active categories', allActive.length);
      return allActive;
    }
    console.log('⚠️ Filter: No categories available');
    return [];
  }, [subcategories, categories, getRootCategories]);

  // State for selected nested subcategories (supports unlimited depth)
  // Structure: { level0: categoryId, level1: subcategoryId, level2: subSubcategoryId, ... }
  const [selectedNestedCategories, setSelectedNestedCategories] = useState({});
  
  // State for dropdown visibility for each category
  const [openDropdowns, setOpenDropdowns] = useState({});
  
  // State for filter dropdown visibility (for level 3+ categories)
  const [openFilterDropdowns, setOpenFilterDropdowns] = useState({});

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
    sortBy: "newest",
    discount: "",
    brand: [],
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
        sortBy: filters.sortBy || 'createdAt',
        sortOrder: filters.sortBy === 'price_high' ? 'desc' : (filters.sortBy === 'price_low' ? 'asc' : 'desc'),
        discount: filters.discount || undefined,
        brands: filters.brand && filters.brand.length > 0 ? filters.brand.join(',') : undefined,
        page: 1,
        limit: 100, // Get more products for better UX
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

  const { displayedItems, hasMore, isLoading: isLoadingMore, loadMore, loadMoreRef } =
    useInfiniteScroll(products, 10, 10);
  // Alias to avoid renaming multiple JSX occurrences
  const isLoading = isLoadingMore;

  const filterButtonRef = useRef(null);

  // Find the deepest selected category ID for filter
  const deepestCategoryId = useMemo(() => {
    let deepestId = null;
    for (let i = 9; i >= 0; i--) {
      const selectedId = selectedNestedCategories[`level${i}`];
      if (selectedId) {
        deepestId = selectedId?.toString() || String(selectedId);
        break;
      }
    }
    // If no nested selection, use the main categoryId
    return deepestId || (categoryId?.toString() || String(categoryId));
  }, [selectedNestedCategories, categoryId]);

  const handleFilterChange = (nameOrObj, value) => {
    setFilters(prev => {
      // If first argument is an object, merge it
      if (typeof nameOrObj === 'object' && nameOrObj !== null) {
        return { ...prev, ...nameOrObj };
      }

      // Handle brand array separately
      if (nameOrObj === 'brand') {
        const currentBrands = [...prev.brand];
        const index = currentBrands.indexOf(value);
        if (index > -1) {
          currentBrands.splice(index, 1);
        } else {
          currentBrands.push(value);
        }
        return { ...prev, brand: currentBrands };
      }

      // Handle single value update
      return { ...prev, [nameOrObj]: value };
    });
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      minPrice: "",
      maxPrice: "",
      minRating: "",
      sortBy: "newest",
      discount: "",
      brand: [],
    });
  };

  // Check if any filter is active
  const hasActiveFilters =
    filters.minPrice ||
    filters.maxPrice ||
    filters.minRating ||
    filters.category ||
    filters.discount ||
    filters.brand.length > 0 ||
    filters.sortBy !== "newest";

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
        setOpenFilterDropdowns({}); // Close all filter dropdowns
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
      <MobileLayout showBottomNav={true} showCartBar={true} fullScreen={true}>
        <div className="flex flex-col h-full overflow-hidden bg-gray-50">
          {/* Header - Fixed */}
          <div className="px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <FiArrowLeft className="text-lg text-gray-700" />
              </button>
              
              <div className="flex-1 flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <LazyImage
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = getPlaceholderImage(32, 32, "Category");
                    }}
                  />
                </div>
                <div className="overflow-hidden">
                  <h1 className="text-base font-bold text-gray-800 truncate leading-tight">
                    {category.name}
                  </h1>
                  <p className="text-[10px] text-gray-500 leading-none">
                    {loadingProducts ? "Loading..." : `${products.length} products`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* View Toggle Buttons */}
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1 rounded transition-colors ${
                      viewMode === "list"
                        ? "bg-white text-primary-600 shadow-sm"
                        : "text-gray-500"
                    }`}>
                    <FiList className="text-base" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1 rounded transition-colors ${
                      viewMode === "grid"
                        ? "bg-white text-primary-600 shadow-sm"
                        : "text-gray-500"
                    }`}>
                    <FiGrid className="text-base" />
                  </button>
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => {
                      if (!showFilters) {
                        initialize(true);
                      }
                      setShowFilters(!showFilters);
                    }}
                    className={`p-1.5 glass-card rounded-lg hover:bg-white/80 transition-colors ${
                      showFilters ? "bg-white/80" : ""
                    }`}>
                    <FiFilter
                      className={`text-base transition-colors ${
                        hasActiveFilters ? "text-blue-600" : "text-gray-500"
                      }`}
                    />
                  </button>

                  <MobileFilterPanel
                    isOpen={showFilters}
                    onClose={() => setShowFilters(false)}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                    hideCategoryFilter={true}
                    deepestCategoryId={deepestCategoryId}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-behavior-smooth pb-24">
            {/* Products List */}
            <div className="px-4 py-2">
            {loadingProducts ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-sm text-gray-600">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="px-4 py-2">
                {subcategories.length > 0 ? (
                  <div className="space-y-4">
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-4">
                          {subcategories.map((sub, index) => (
                            <motion.button
                              key={sub.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              onClick={() => navigate(`/app/category/${sub.id}`)}
                              className="flex flex-col items-center gap-2 active:scale-95 transition-all p-2 rounded-2xl hover:bg-gray-50/50"
                            >
                              <div className="w-24 h-24 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-gray-50 border-2 border-white shadow-sm hover:shadow-md transition-shadow">
                                <LazyImage
                                  src={sub.image}
                                  alt={sub.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = getPlaceholderImage(120, 120, "Sub");
                                  }}
                                />
                              </div>
                              <span className="text-xs sm:text-[11px] font-bold text-gray-800 text-center line-clamp-1 w-full px-1">
                                {sub.name}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                    ) : (
                      <div className="space-y-3">
                        {subcategories.map((sub, index) => (
                          <motion.button
                            key={sub.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(`/app/category/${sub.id}`)}
                            className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-all w-full text-left"
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                              <LazyImage
                                src={sub.image}
                                alt={sub.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = getPlaceholderImage(48, 48, "Sub");
                                }}
                              />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <h4 className="text-sm font-semibold text-gray-800 truncate">
                                {sub.name}
                              </h4>
                              <p className="text-[10px] text-gray-500">
                                Explore subcategories
                              </p>
                            </div>
                            <FiChevronRight className="text-gray-400" />
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
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
                )}
              </div>
            ) : viewMode === "grid" ? (
              <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
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
                        <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-medium">Loading more products...</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {displayedItems.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}>
                    <ProductListItem product={product} />
                  </motion.div>
                ))}
                
                {hasMore && (
                  <div
                    ref={loadMoreRef}
                    className="mt-6 flex flex-col items-center gap-4">
                    {isLoading && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-medium">Loading more products...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  </PageTransition>
  );
};

export default MobileCategory;
