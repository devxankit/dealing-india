import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiSearch, FiFilter, FiX, FiGrid, FiList, FiShoppingBag } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import ProductCard from '../../../shared/components/ProductCard';
import ProductListItem from '../components/Mobile/ProductListItem';
import SearchSuggestions from '../components/Mobile/SearchSuggestions';
import { getProducts } from '../../../shared/services/productService';
import PageTransition from '../../../shared/components/PageTransition';
import useInfiniteScroll from '../../../shared/hooks/useInfiniteScroll';
import toast from 'react-hot-toast';

const MobileSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [recentSearches, setRecentSearches] = useState(() => {
    const stored = localStorage.getItem('recentSearches');
    return stored ? JSON.parse(stored) : [];
  });
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    vendor: searchParams.get('vendor') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minRating: searchParams.get('minRating') || '',
    isNew: searchParams.get('isNew') === 'true' || false,
    isTrending: searchParams.get('isTrending') === 'true' || false,
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (query) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const deleteRecentSearch = (index) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };


  // Fetch products from backend
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProducts({
        search: searchQuery || undefined,
        categoryId: filters.category || undefined,
        vendorId: filters.vendor || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        minRating: filters.minRating || undefined,
        isNew: filters.isNew ? true : undefined, // Only pass if true
        isTrending: filters.isTrending ? true : undefined, // Only pass if true
        page: 1,
        limit: 100, // Get more products for better UX
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Transform backend products to match frontend format (same as Home page)
      const transformedProducts = (result.products || []).map((product) => {
        // Handle vendor data - can be ObjectId or populated object
        const vendor = product.vendorId;
        const vendorData = vendor && typeof vendor === 'object' && (vendor._id || vendor.id)
          ? {
              id: (vendor._id || vendor.id).toString(),
              _id: vendor._id || vendor.id,
              storeName: vendor.storeName || vendor.businessName || vendor.name,
              businessName: vendor.businessName,
              name: vendor.name,
              storeLogo: vendor.storeLogo || vendor.logo,
              isVerified: vendor.isVerified !== undefined 
                ? vendor.isVerified 
                : (vendor.status === 'approved' || vendor.isEmailVerified || false),
            }
          : null;

        // Get main image - ALWAYS prioritize product.image (main image) over gallery images
        // Backend model: image (String) = main image, images ([String]) = gallery images
        // We should NEVER use gallery images if main image exists
        let mainImage = product.image;
        
        // Debug: Log if we're using gallery image instead of main
        if (!mainImage && product.images && product.images.length > 0) {
          console.warn(`Product ${product.name} has no main image, using gallery image:`, product.images[0]);
          mainImage = product.images[0];
        }
        
        // Ensure we're using the main image, not gallery
        if (product.image && product.images && product.images.includes(product.image)) {
          // Main image is also in gallery, that's fine - use main image
          mainImage = product.image;
        }

        return {
          id: product._id || product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice || product.price,
          image: mainImage || null, // Always use main image field, never gallery images unless main is missing
          images: product.images || [],
          unit: product.unit || 'Piece',
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          stock: product.stock || 'in_stock',
          stockQuantity: product.stockQuantity || 0,
          vendorId: vendorData?.id || (typeof vendor === 'object' ? vendor?._id?.toString() : vendor?.toString() || vendor),
          vendor: vendorData,
          vendorName: vendorData?.storeName || product.vendorName || 'Unknown Vendor',
          flashSale: product.flashSale || false,
          variants: product.variants || {},
        };
      });

      setProducts(transformedProducts);
      setPagination({
        total: result.total || 0,
        page: result.page || 1,
        totalPages: result.totalPages || 1,
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters.category, filters.vendor, filters.minPrice, filters.maxPrice, filters.minRating, filters.isNew, filters.isTrending]);

  // Fetch products when search query or filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products;

  const { displayedItems, hasMore, isLoading, loadMore, loadMoreRef } = useInfiniteScroll(
    filteredProducts,
    10,
    10
  );

  const filterButtonRef = useRef(null);

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(name, value);
    } else {
      newParams.delete(name);
    }
    setSearchParams(newParams);
  };

  // Check if any filter is active
  const hasActiveFilters =
    filters.minPrice || filters.maxPrice || filters.minRating || filters.category || filters.vendor || filters.isNew || filters.isTrending;

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

  const handleSearch = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) {
      newParams.set('q', searchQuery);
      saveRecentSearch(searchQuery);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
    setShowSuggestions(false);
  };

  const handleSuggestionSelect = (query) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    saveRecentSearch(query);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', query);
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      vendor: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
      isNew: false,
      isTrending: false,
    });
    setSearchQuery('');
    setSearchParams({});
  };

  // Get vendors from products (for filter dropdown)
  const vendors = useMemo(() => {
    const vendorMap = new Map();
    products.forEach((product) => {
      if (product.vendorId && product.vendorName) {
        if (!vendorMap.has(product.vendorId)) {
          vendorMap.set(product.vendorId, {
            id: product.vendorId,
            name: product.vendorName,
            storeName: product.vendorName,
          });
        }
      }
    });
    return Array.from(vendorMap.values());
  }, [products]);

  return (
    <PageTransition>
      <MobileLayout showBottomNav={true} showCartBar={true}>
        <div className="w-full pb-24">
          {/* Search Header */}
          <div className="px-4 py-4 bg-white border-b border-gray-200 sticky top-1 z-30">
            {/* Show filter badges if active */}
            {(filters.isNew || filters.isTrending) && (
              <div className="mb-3 space-y-2">
                {filters.isNew && (
                  <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-semibold text-sm">✨ New Arrivals</span>
                    </div>
                    <button
                      onClick={() => {
                        handleFilterChange('isNew', false);
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('isNew');
                        setSearchParams(newParams);
                      }}
                      className="text-green-600 hover:text-green-700 text-sm font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                )}
                {filters.isTrending && (
                  <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600 font-semibold text-sm">🔥 Trending Now</span>
                    </div>
                    <button
                      onClick={() => {
                        handleFilterChange('isTrending', false);
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('isTrending');
                        setSearchParams(newParams);
                      }}
                      className="text-orange-600 hover:text-orange-700 text-sm font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search products..."
                  className="w-full pl-12 pr-12 py-3 glass-card rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 placeholder:text-gray-400 text-base"
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchParams({});
                        setShowSuggestions(false);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                    >
                      <FiX className="text-lg" />
                    </button>
                  )}
                </div>
                <SearchSuggestions
                  query={searchQuery}
                  isOpen={showSuggestions}
                  onSelect={handleSuggestionSelect}
                  onClose={() => setShowSuggestions(false)}
                  recentSearches={recentSearches}
                  onDeleteRecent={deleteRecentSearch}
                />
              </div>
            </form>

            {/* Filter Toggle and View Mode */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {loading ? 'Loading...' : `Found ${pagination.total} product(s)`}
              </p>
              <div className="flex items-center gap-2">
                {/* View Toggle Buttons */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'list'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600'
                      }`}
                  >
                    <FiList className="text-lg" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'grid'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600'
                      }`}
                  >
                    <FiGrid className="text-lg" />
                  </button>
                </div>
                <div ref={filterButtonRef} className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 glass-card rounded-xl hover:bg-white/80 transition-colors ${showFilters ? "bg-white/80" : ""
                      }`}
                  >
                    <FiFilter
                      className={`text-lg transition-colors ${hasActiveFilters ? "text-blue-600" : "text-gray-600"
                        }`}
                    />
                    <span className="font-semibold text-gray-700 text-sm">Filters</span>
                  </button>

                  {/* Filter Bottom Sheet Popup */}
                  <AnimatePresence>
                    {showFilters && (
                      <>
                        {/* Backdrop */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowFilters(false)}
                          className="fixed inset-0 bg-black/50 z-[10000]"
                        />
                        {/* Bottom Sheet */}
                        <motion.div
                          initial={{ y: '100%' }}
                          animate={{ y: 0 }}
                          exit={{ y: '100%' }}
                          transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 200,
                          }}
                          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[10001] flex flex-col max-h-[90vh]">
                          {/* Drag Handle */}
                          <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                          </div>

                          {/* Header */}
                          <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <FiFilter className="text-xl text-gray-700" />
                              <h2 className="text-xl font-bold text-gray-800">Filters</h2>
                            </div>
                            <button
                              onClick={() => setShowFilters(false)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                              <FiX className="text-xl text-gray-600" />
                            </button>
                          </div>

                          {/* Filter Content */}
                          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                            {/* Price Range */}
                            <div>
                              <h3 className="font-semibold text-gray-700 mb-3 text-base">Price Range</h3>
                              <div className="space-y-3">
                                <input
                                  type="number"
                                  placeholder="Min Price"
                                  value={filters.minPrice}
                                  onChange={(e) =>
                                    handleFilterChange("minPrice", e.target.value)
                                  }
                                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                                />
                                <input
                                  type="number"
                                  placeholder="Max Price"
                                  value={filters.maxPrice}
                                  onChange={(e) =>
                                    handleFilterChange("maxPrice", e.target.value)
                                  }
                                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                                />
                              </div>
                            </div>

                            {/* Vendor Filter */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                                  <FiShoppingBag className="text-primary-600" />
                                  Vendor
                                </h3>
                                <span className="text-sm text-primary-600 font-semibold bg-primary-50 px-3 py-1 rounded-full">
                                  {vendors.length}+ Stores
                                </span>
                              </div>
                              <select
                                value={filters.vendor}
                                onChange={(e) => handleFilterChange('vendor', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-primary-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base font-medium"
                              >
                                <option value="">All Vendors ({vendors.length})</option>
                                {vendors.map((vendor) => (
                                  <option key={vendor.id} value={vendor.id}>
                                    {vendor.storeName || vendor.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Rating Filter */}
                            <div>
                              <h3 className="font-semibold text-gray-700 mb-3 text-base">Minimum Rating</h3>
                              <div className="space-y-2">
                                {[4, 3, 2, 1].map((rating) => (
                                  <label
                                    key={rating}
                                    className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                    <input
                                      type="radio"
                                      name="minRating"
                                      value={rating}
                                      checked={
                                        filters.minRating === rating.toString()
                                      }
                                      onChange={(e) =>
                                        handleFilterChange(
                                          "minRating",
                                          e.target.value
                                        )
                                      }
                                      className="w-5 h-5 text-primary-500"
                                    />
                                    <span className="text-sm text-gray-700 font-medium">
                                      {rating}+ Stars
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="border-t border-gray-200 p-4 space-y-2">
                            <button
                              onClick={clearFilters}
                              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                              Clear All
                            </button>
                            <button
                              onClick={() => setShowFilters(false)}
                              className="w-full py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all">
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

          {/* Products List */}
          <div className="px-4 py-4">
            {loading && products.length === 0 ? (
              <div className="text-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"
                />
                <p className="text-gray-600">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <FiSearch className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No products found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
                <button
                  onClick={clearFilters}
                  className="gradient-green text-white px-6 py-3 rounded-xl font-semibold"
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {displayedItems.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>

                {hasMore && (
                  <div ref={loadMoreRef} className="mt-6 flex flex-col items-center gap-4">
                    {isLoading && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"
                        />
                        <span className="text-sm">Loading more products...</span>
                      </div>
                    )}
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          Loading...
                        </span>
                      ) : 'Load More'}
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
                  <div ref={loadMoreRef} className="mt-6 flex flex-col items-center gap-4">
                    {isLoading && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"
                        />
                        <span className="text-sm">Loading more products...</span>
                      </div>
                    )}
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          Loading...
                        </span>
                      ) : (
                        'Load More'
                      )}
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

export default MobileSearch;

