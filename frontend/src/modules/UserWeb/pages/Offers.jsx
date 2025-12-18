import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiFilter, FiGrid, FiList, FiTrendingDown, FiX, FiLoader } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { getOffers } from '../../../data/products';
import { useCampaignStore } from '../../../shared/store/campaignStore';
import { formatPrice } from '../../../shared/utils/helpers';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import ProductCard from '../../../shared/components/ProductCard';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Badge from '../../../shared/components/Badge';
import useInfiniteScroll from '../../../shared/hooks/useInfiniteScroll';
import ProductGridSkeleton from '../../../shared/components/Skeletons/ProductGridSkeleton';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const Offers = () => {
  const location = useLocation();
  const { getCampaignsByType, initialize } = useCampaignStore();
  
  // Initialize campaigns
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get active special offer campaigns
  const specialOfferCampaigns = useMemo(() => {
    const allCampaigns = getCampaignsByType('special_offer');
    const now = new Date();
    return allCampaigns.filter(
      campaign =>
        campaign.isActive &&
        new Date(campaign.startDate) <= now &&
        new Date(campaign.endDate) >= now
    );
  }, [getCampaignsByType]);

  // Fallback to static data if no campaigns
  const allOffers = useMemo(() => {
    if (specialOfferCampaigns.length > 0) {
      return getOffers();
    }
    return getOffers();
  }, [specialOfferCampaigns]);
  const { responsivePadding } = useResponsiveHeaderPadding();
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('discount'); // discount, price-low, price-high, rating
  const [showFilters, setShowFilters] = useState(false);
  const [minDiscount, setMinDiscount] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState(100);

  // Calculate discount percentage for each product
  const offersWithDiscount = useMemo(() => {
    return allOffers.map((product) => {
      const discount = Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      );
      return { ...product, discount };
    });
  }, [allOffers]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = offersWithDiscount.filter(
      (p) => p.discount >= minDiscount && p.discount <= maxDiscount
    );

    // Sort products
    switch (sortBy) {
      case 'discount':
        filtered.sort((a, b) => b.discount - a.discount);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        break;
    }

    return filtered;
  }, [offersWithDiscount, sortBy, minDiscount, maxDiscount]);

  // Infinite scroll hook
  const { displayedItems, hasMore, isLoading, loadMore, loadMoreRef } = useInfiniteScroll(
    filteredAndSortedProducts,
    12,
    12
  );

  const averageDiscount = useMemo(() => {
    if (offersWithDiscount.length === 0) return 0;
    const total = offersWithDiscount.reduce((sum, p) => sum + p.discount, 0);
    return Math.round(total / offersWithDiscount.length);
  }, [offersWithDiscount]);

  // Force component update when location changes
  useEffect(() => {
    // Reset filters and view when route changes
    setShowFilters(false);
    // Force a re-render by updating a state that doesn't affect UI
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, location.key]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
        <Header />
        <Navbar />
        <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-2">
            <div className="max-w-7xl mx-auto">
              <Breadcrumbs />

              {/* Header Section */}
              <div className="mb-8 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient mb-2 relative z-10">
                      Special Offers
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base">
                      {filteredAndSortedProducts.length} amazing deals waiting for you!
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-colors ${
                          viewMode === 'grid'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <FiGrid className="text-lg" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-colors ${
                          viewMode === 'list'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <FiList className="text-lg" />
                      </button>
                    </div>
                    {/* Filter Toggle */}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <FiFilter className="text-lg" />
                      <span className="hidden sm:inline">Filters</span>
                    </button>
                  </div>
                </div>

                {/* Stats Banner */}
                <div className="glass-card rounded-2xl p-4 sm:p-6 mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-gradient mb-1">
                        {offersWithDiscount.length}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Total Offers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-accent-600 mb-1">
                        {averageDiscount}%
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Avg. Discount</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-primary-600 mb-1">
                        {Math.max(...offersWithDiscount.map((p) => p.discount))}%
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Max Discount</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                        {formatPrice(
                          offersWithDiscount.reduce((sum, p) => sum + (p.originalPrice - p.price), 0)
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Total Savings</div>
                    </div>
                  </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card rounded-2xl p-4 sm:p-6 mb-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Filter Offers</h3>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <FiX className="text-lg" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sort By */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        >
                          <option value="discount">Highest Discount</option>
                          <option value="price-low">Price: Low to High</option>
                          <option value="price-high">Price: High to Low</option>
                          <option value="rating">Highest Rating</option>
                        </select>
                      </div>

                      {/* Discount Range */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Discount Range: {minDiscount}% - {maxDiscount}%
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={minDiscount}
                            onChange={(e) => setMinDiscount(Number(e.target.value))}
                            className="flex-1"
                          />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={maxDiscount}
                            onChange={(e) => setMaxDiscount(Number(e.target.value))}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Products Grid/List */}
              {filteredAndSortedProducts.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <FiTrendingDown className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No offers found</h3>
                  <p className="text-gray-600">
                    Try adjusting your filters to see more offers.
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 relative z-0">
                    {displayedItems.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="relative"
                      >
                        <div className="absolute -top-2 -right-2 z-20">
                          <Badge variant="discount">{product.discount}% OFF</Badge>
                        </div>
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
                          <span>Loading more offers...</span>
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
              ) : (
                <>
                  <div className="space-y-4">
                    {displayedItems.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="glass-card rounded-2xl p-4 sm:p-6"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Product Image */}
                        <div className="relative flex-shrink-0">
                          <div className="w-full sm:w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src =
                                  'https://via.placeholder.com/200x200?text=Product+Image';
                              }}
                            />
                          </div>
                          <div className="absolute -top-2 -right-2">
                            <Badge variant="discount">{product.discount}% OFF</Badge>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-lg mb-2">
                              {product.name}
                            </h3>
                            <p className="text-gray-600 mb-2">{product.unit || 'Unit'}</p>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xl font-bold text-gray-800">
                                {formatPrice(product.price)}
                              </span>
                              <span className="text-sm text-gray-400 line-through">
                                {formatPrice(product.originalPrice)}
                              </span>
                              <span className="text-sm font-semibold text-accent-600">
                                Save {formatPrice(product.originalPrice - product.price)}
                              </span>
                            </div>
                            {product.rating && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-semibold">⭐ {product.rating}</span>
                                <span>({product.reviewCount || 0} reviews)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                    ))}
                  </div>
                  
                  {/* Loading indicator and Load More button */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="mt-8 flex flex-col items-center gap-4">
                      {isLoading && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <FiLoader className="animate-spin text-xl" />
                          <span>Loading more offers...</span>
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
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Offers;

