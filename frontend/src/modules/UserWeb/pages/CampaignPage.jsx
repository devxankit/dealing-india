import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { FiClock, FiGrid, FiList, FiZap, FiTag, FiFilter, FiX, FiTrendingDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useCampaignStore } from '../../../shared/store/campaignStore';
import { getProductById, products } from '../../../data/products';
import { formatPrice } from '../../../shared/utils/helpers';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import ProductCard from '../../../shared/components/ProductCard';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Badge from '../../../shared/components/Badge';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';
import useInfiniteScroll from '../../../shared/hooks/useInfiniteScroll';

const CampaignPage = () => {
  const { slug, id } = useParams();
  const { getCampaignBySlug, getCampaignById, initialize } = useCampaignStore();
  const { responsivePadding } = useResponsiveHeaderPadding();
  
  // Initialize campaigns if needed
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get campaign by slug or ID
  const campaign = useMemo(() => {
    if (slug) {
      return getCampaignBySlug(slug);
    } else if (id) {
      return getCampaignById(id);
    }
    return null;
  }, [slug, id, getCampaignBySlug, getCampaignById]);

  // Redirect if campaign not found
  if (!campaign) {
    return <Navigate to="/" replace />;
  }

  const pageConfig = campaign.pageConfig || {
    showCountdown: true,
    countdownType: 'campaign_end',
    viewModes: ['grid', 'list'],
    defaultViewMode: 'grid',
    enableFilters: true,
    enableSorting: true,
    productsPerPage: 12,
    showStats: true,
  };

  const [viewMode, setViewMode] = useState(pageConfig.defaultViewMode || 'grid');
  const [sortBy, setSortBy] = useState('discount');
  const [showFilters, setShowFilters] = useState(false);
  const [minDiscount, setMinDiscount] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState(100);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Get products for this campaign
  const campaignProducts = useMemo(() => {
    if (!campaign.productIds || campaign.productIds.length === 0) {
      return [];
    }
    
    // Get products from localStorage first, then fallback to static data
    const savedProducts = localStorage.getItem('admin-products');
    const allProducts = savedProducts ? JSON.parse(savedProducts) : products;
    
    return campaign.productIds
      .map(productId => {
        const product = allProducts.find(p => p.id === parseInt(productId));
        return product ? {
          ...product,
          // Apply campaign discount if applicable
          campaignPrice: campaign.discountType === 'percentage' 
            ? product.price * (1 - campaign.discountValue / 100)
            : product.price - campaign.discountValue,
          originalPrice: product.originalPrice || product.price,
        } : null;
      })
      .filter(Boolean);
  }, [campaign.productIds, campaign.discountType, campaign.discountValue]);

  // Calculate discount for each product
  const productsWithDiscount = useMemo(() => {
    return campaignProducts.map((product) => {
      const finalPrice = product.campaignPrice || product.price;
      const originalPrice = product.originalPrice || product.price;
      const discount = originalPrice > finalPrice
        ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
        : 0;
      return { ...product, discount, finalPrice };
    });
  }, [campaignProducts]);

  // Countdown timer
  useEffect(() => {
    if (!pageConfig.showCountdown) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      let targetDate;

      if (pageConfig.countdownType === 'campaign_end') {
        targetDate = new Date(campaign.endDate);
      } else if (pageConfig.countdownType === 'daily_reset') {
        targetDate = new Date();
        targetDate.setHours(23, 59, 59, 999);
      } else {
        // Custom or no countdown
        return;
      }

      const difference = targetDate - now;

      if (difference > 0) {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [pageConfig.showCountdown, pageConfig.countdownType, campaign.endDate]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    if (!pageConfig.enableFilters && !pageConfig.enableSorting) {
      return productsWithDiscount;
    }

    let filtered = productsWithDiscount;

    // Apply filters
    if (pageConfig.enableFilters) {
      filtered = filtered.filter(
        (p) => p.discount >= minDiscount && p.discount <= maxDiscount
      );
    }

    // Apply sorting
    if (pageConfig.enableSorting) {
      switch (sortBy) {
        case 'discount':
          filtered.sort((a, b) => b.discount - a.discount);
          break;
        case 'price-low':
          filtered.sort((a, b) => a.finalPrice - b.finalPrice);
          break;
        case 'price-high':
          filtered.sort((a, b) => b.finalPrice - a.finalPrice);
          break;
        case 'rating':
          filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        default:
          break;
      }
    }

    return filtered;
  }, [productsWithDiscount, sortBy, minDiscount, maxDiscount, pageConfig]);

  // Infinite scroll hook
  const { displayedItems, hasMore, isLoading, loadMore, loadMoreRef } = useInfiniteScroll(
    filteredAndSortedProducts,
    pageConfig.productsPerPage || 12,
    pageConfig.productsPerPage || 12
  );

  const formatTime = (value) => {
    return value.toString().padStart(2, '0');
  };

  const getCampaignTypeIcon = () => {
    switch (campaign.type) {
      case 'flash_sale':
        return FiZap;
      case 'daily_deal':
        return FiClock;
      case 'festival':
        return FiTag;
      default:
        return FiTag;
    }
  };

  const getCampaignTypeLabel = () => {
    switch (campaign.type) {
      case 'flash_sale':
        return 'Flash Sale';
      case 'daily_deal':
        return 'Daily Deal';
      case 'festival':
        return 'Festival Offer';
      case 'special_offer':
        return 'Special Offer';
      default:
        return 'Campaign';
    }
  };

  const Icon = getCampaignTypeIcon();

  const averageDiscount = useMemo(() => {
    if (productsWithDiscount.length === 0) return 0;
    const total = productsWithDiscount.reduce((sum, p) => sum + p.discount, 0);
    return Math.round(total / productsWithDiscount.length);
  }, [productsWithDiscount]);

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
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient relative z-10">
                        {campaign.name}
                      </h1>
                      <Badge variant="flash" className="animate-pulse">
                        <Icon className="inline mr-1" />
                        {getCampaignTypeLabel()}
                      </Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-gray-600 text-sm sm:text-base">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    {pageConfig.viewModes && pageConfig.viewModes.length > 1 && (
                      <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                        {pageConfig.viewModes.includes('grid') && (
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
                        )}
                        {pageConfig.viewModes.includes('list') && (
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
                        )}
                      </div>
                    )}
                    {/* Filter Toggle */}
                    {pageConfig.enableFilters && (
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <FiFilter className="text-lg" />
                        <span className="hidden sm:inline">Filters</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Countdown Timer Banner */}
                {pageConfig.showCountdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-4 sm:p-6 mb-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200"
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-xl">
                          <FiClock className="text-2xl text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">
                            {pageConfig.countdownType === 'daily_reset' ? 'Deal Ends Today' : 'Campaign Ends In'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {pageConfig.countdownType === 'daily_reset' 
                              ? 'These deals expire at midnight!' 
                              : 'Hurry up! These deals are going fast!'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="text-center">
                          <div className="bg-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
                            <div className="text-2xl sm:text-4xl font-bold text-blue-600">
                              {formatTime(timeLeft.hours)}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1">Hours</div>
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-400">:</div>
                        <div className="text-center">
                          <div className="bg-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
                            <div className="text-2xl sm:text-4xl font-bold text-blue-600">
                              {formatTime(timeLeft.minutes)}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1">Minutes</div>
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-400">:</div>
                        <div className="text-center">
                          <div className="bg-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg animate-pulse">
                            <div className="text-2xl sm:text-4xl font-bold text-blue-600">
                              {formatTime(timeLeft.seconds)}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1">Seconds</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Stats Banner */}
                {pageConfig.showStats && (
                  <div className="glass-card rounded-2xl p-4 sm:p-6 mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-gradient mb-1">
                          {productsWithDiscount.length}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Total Products</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                          {Math.max(...productsWithDiscount.map((p) => p.discount), 0)}%
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Max Discount</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-accent-600 mb-1">
                          {averageDiscount}%
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Avg. Discount</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                          {formatPrice(
                            productsWithDiscount.reduce(
                              (sum, p) => sum + ((p.originalPrice || p.finalPrice) - p.finalPrice),
                              0
                            )
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Total Savings</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filters Panel */}
                {pageConfig.enableFilters && showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card rounded-2xl p-4 sm:p-6 mb-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Filter Products</h3>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <FiX className="text-lg" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sort By */}
                      {pageConfig.enableSorting && (
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
                      )}

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
                  <Icon className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No products available</h3>
                  <p className="text-gray-600 mb-6">
                    Check back later for exciting deals!
                  </p>
                  <Link
                    to="/"
                    className="inline-block px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300"
                  >
                    Continue Shopping
                  </Link>
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
                          <Badge variant="flash">{product.discount}% OFF</Badge>
                        </div>
                        <ProductCard product={{ ...product, price: product.finalPrice }} />
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Loading indicator and Load More button */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="mt-8 flex flex-col items-center gap-4">
                      {isLoading && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <FiTrendingDown className="animate-spin text-xl" />
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
                              <Badge variant="flash">{product.discount}% OFF</Badge>
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
                                  {formatPrice(product.finalPrice)}
                                </span>
                                {product.originalPrice && product.originalPrice > product.finalPrice && (
                                  <>
                                    <span className="text-sm text-gray-400 line-through">
                                      {formatPrice(product.originalPrice)}
                                    </span>
                                    <span className="text-sm font-semibold text-blue-600">
                                      Save {formatPrice(product.originalPrice - product.finalPrice)}
                                    </span>
                                  </>
                                )}
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
                          <FiTrendingDown className="animate-spin text-xl" />
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
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default CampaignPage;

