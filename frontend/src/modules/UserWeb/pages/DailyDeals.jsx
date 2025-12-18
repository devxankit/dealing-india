import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiGrid, FiList, FiZap, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getDailyDeals } from '../../../data/products';
import { useCampaignStore } from '../../../shared/store/campaignStore';
import { formatPrice } from '../../../shared/utils/helpers';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import ProductCard from '../../../shared/components/ProductCard';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Badge from '../../../shared/components/Badge';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const DailyDeals = () => {
  const navigate = useNavigate();
  const { getCampaignsByType, initialize } = useCampaignStore();
  
  // Initialize campaigns
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get active daily deal campaigns
  const dailyDealCampaigns = useMemo(() => {
    const allCampaigns = getCampaignsByType('daily_deal');
    const now = new Date();
    return allCampaigns.filter(
      campaign =>
        campaign.isActive &&
        new Date(campaign.startDate) <= now &&
        new Date(campaign.endDate) >= now
    );
  }, [getCampaignsByType]);

  // If there's exactly one active daily deal campaign, redirect to it
  useEffect(() => {
    if (dailyDealCampaigns.length === 1 && dailyDealCampaigns[0].route) {
      navigate(dailyDealCampaigns[0].route, { replace: true });
    }
  }, [dailyDealCampaigns, navigate]);

  // Fallback to static data if no campaigns
  const allDeals = useMemo(() => {
    if (dailyDealCampaigns.length > 0) {
      return getDailyDeals();
    }
    return getDailyDeals();
  }, [dailyDealCampaigns]);
  const { responsivePadding } = useResponsiveHeaderPadding();
  const [viewMode, setViewMode] = useState('grid');
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

  // Countdown timer - resets daily
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const difference = endOfDay - now;

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
  }, []);

  // Calculate discount for each deal
  const dealsWithDiscount = useMemo(() => {
    return allDeals.map((product) => {
      const discount = product.originalPrice
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;
      return { ...product, discount };
    });
  }, [allDeals]);

  const formatTime = (value) => {
    return value.toString().padStart(2, '0');
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
        <Header />
        <Navbar />
        <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-2">
            <div className="max-w-7xl mx-auto">
              <Breadcrumbs />

              {/* Header Section with Countdown */}
              <div className="mb-8 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient relative z-10">
                        Daily Deals
                      </h1>
                      <Badge variant="flash" className="animate-pulse">
                        <FiZap className="inline mr-1" />
                        Today Only
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Limited time offers - Don't miss out!
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
                  </div>
                </div>

                {/* Countdown Timer Banner */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-4 sm:p-6 mb-6 bg-gradient-to-r from-accent-50 to-primary-50 border-2 border-accent-200"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-accent-500 rounded-xl">
                        <FiClock className="text-2xl text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">
                          Deal Ends In
                        </h3>
                        <p className="text-sm text-gray-600">
                          These deals expire at midnight!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      {/* Hours */}
                      <div className="text-center">
                        <div className="bg-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
                          <div className="text-2xl sm:text-4xl font-bold text-accent-600">
                            {formatTime(timeLeft.hours)}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 mt-1">Hours</div>
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-400">:</div>
                      {/* Minutes */}
                      <div className="text-center">
                        <div className="bg-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
                          <div className="text-2xl sm:text-4xl font-bold text-accent-600">
                            {formatTime(timeLeft.minutes)}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 mt-1">Minutes</div>
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-400">:</div>
                      {/* Seconds */}
                      <div className="text-center">
                        <div className="bg-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg animate-pulse">
                          <div className="text-2xl sm:text-4xl font-bold text-accent-600">
                            {formatTime(timeLeft.seconds)}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 mt-1">Seconds</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Stats */}
                <div className="glass-card rounded-2xl p-4 sm:p-6 mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-gradient mb-1">
                        {allDeals.length}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Deals Available</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-accent-600 mb-1">
                        Up to{' '}
                        {Math.max(...dealsWithDiscount.map((p) => p.discount || 0), 0)}%
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Maximum Discount</div>
                    </div>
                    <div className="text-center col-span-2 sm:col-span-1">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                        {formatPrice(
                          dealsWithDiscount.reduce(
                            (sum, p) =>
                              sum + (p.originalPrice ? p.originalPrice - p.price : 0),
                            0
                          )
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Total Savings</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid/List */}
              {allDeals.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <FiZap className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No deals available</h3>
                  <p className="text-gray-600 mb-6">
                    Check back tomorrow for new daily deals!
                  </p>
                  <Link
                    to="/"
                    className="inline-block px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300"
                  >
                    Continue Shopping
                  </Link>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 relative z-0">
                  {dealsWithDiscount.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="relative"
                    >
                      <div className="absolute -top-2 -right-2 z-20">
                        <Badge variant="flash">
                          {product.discount > 0 ? `${product.discount}% OFF` : 'Deal'}
                        </Badge>
                      </div>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {dealsWithDiscount.map((product, index) => (
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
                            <Badge variant="flash">
                              {product.discount > 0 ? `${product.discount}% OFF` : 'Deal'}
                            </Badge>
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
                              {product.originalPrice && (
                                <>
                                  <span className="text-sm text-gray-400 line-through">
                                    {formatPrice(product.originalPrice)}
                                  </span>
                                  <span className="text-sm font-semibold text-accent-600">
                                    Save {formatPrice(product.originalPrice - product.price)}
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
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default DailyDeals;

