import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiFilter, FiX, FiLoader } from 'react-icons/fi';
import { motion } from 'framer-motion';
import ProductCard from '../../../shared/components/ProductCard';
import { products } from '../../../data/products';
import { categories } from '../../../data/categories';
import { getApprovedVendors } from '../../../data/vendors';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import useInfiniteScroll from '../../../shared/hooks/useInfiniteScroll';
import ProductGridSkeleton from '../../../shared/components/Skeletons/ProductGridSkeleton';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { responsivePadding } = useResponsiveHeaderPadding();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    vendor: searchParams.get('vendor') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minRating: searchParams.get('minRating') || '',
  });

  const filteredProducts = useMemo(() => {
    let result = products;

    // Search query filter
    if (searchQuery) {
      result = result.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (filters.category) {
      // This is a simplified category match - you can enhance this
      result = result.filter((product) => {
        const categoryMap = {
          'Fresh Vegetables': ['potato', 'cauliflower', 'onion', 'okra', 'coriander'],
          'Fresh Fruits': ['tomato', 'cherry'],
          'Chicken': ['chicken'],
          'Beef': ['beef', 'steak'],
        };
        const categoryKeywords = categoryMap[filters.category] || [];
        return categoryKeywords.some((keyword) =>
          product.name.toLowerCase().includes(keyword)
        );
      });
    }

    // Vendor filter
    if (filters.vendor) {
      result = result.filter((product) => {
        const productVendorId = typeof product.vendorId === 'string' 
          ? parseInt(product.vendorId.replace('vendor-', '')) 
          : product.vendorId;
        return productVendorId === parseInt(filters.vendor) || product.vendorId === filters.vendor;
      });
    }

    // Price range filter
    if (filters.minPrice) {
      result = result.filter((product) => product.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((product) => product.price <= parseFloat(filters.maxPrice));
    }

    // Rating filter
    if (filters.minRating) {
      result = result.filter(
        (product) => product.rating >= parseFloat(filters.minRating)
      );
    }

    return result;
  }, [searchQuery, filters]);

  // Infinite scroll hook
  const { displayedItems, hasMore, isLoading, loadMore, loadMoreRef } = useInfiniteScroll(
    filteredProducts,
    12,
    12
  );

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

  const handleSearch = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) {
      newParams.set('q', searchQuery);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      vendor: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
    });
    setSearchQuery('');
    setSearchParams({});
  };

  const approvedVendors = getApprovedVendors();

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
        <Header />
        <Navbar />
        <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-2">
            <div className="max-w-7xl mx-auto">
              <Breadcrumbs />
              {/* Search Header */}
              <div className="mb-6">
                <form onSubmit={handleSearch} className="mb-4">
                  <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-12 pr-4 py-4 glass-card rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700 placeholder:text-gray-400 text-lg"
                  />
                </div>
              </form>

              {/* Filter Toggle */}
              <div className="flex items-center justify-between">
              <p className="text-gray-600">
                Found {filteredProducts.length} product(s)
              </p>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl hover:bg-white/80 transition-colors"
              >
                <FiFilter className="text-gray-600" />
                  <span className="font-semibold text-gray-700">Filters</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}
            >
              <div className="glass-card rounded-2xl p-6 sticky top-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Filters</h2>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Clear All
                  </button>
                </div>

                {/* Category Filter */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Category</h3>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.name}
                          checked={filters.category === category.name}
                          onChange={(e) => handleFilterChange('category', e.target.value)}
                          className="w-4 h-4 text-green-500"
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Vendor Filter */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Vendor</h3>
                  <select
                    value={filters.vendor}
                    onChange={(e) => handleFilterChange('vendor', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="">All Vendors</option>
                    {approvedVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.storeName || vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Price Range</h3>
                  <div className="space-y-3">
                    <input
                      type="number"
                      placeholder="Min Price"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="number"
                      placeholder="Max Price"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Minimum Rating</h3>
                  <div className="space-y-2">
                    {[4, 3, 2, 1].map((rating) => (
                      <label
                        key={rating}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="minRating"
                          value={rating}
                          checked={filters.minRating === rating.toString()}
                          onChange={(e) => handleFilterChange('minRating', e.target.value)}
                          className="w-4 h-4 text-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          {rating}+ Stars
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <FiSearch className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    No products found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your search or filters
                  </p>
                  <button
                    onClick={clearFilters}
                    className="gradient-green text-white px-6 py-3 rounded-xl font-semibold"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
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
                  
                  {/* Loading indicator and Load More button */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="mt-8 flex flex-col items-center gap-4">
                      {isLoading && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <FiLoader className="animate-spin text-xl" />
                          <span>Loading more products...</span>
                        </div>
                      )}
                      <button
                        onClick={loadMore}
                        disabled={isLoading}
                        className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Search;

