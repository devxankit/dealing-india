import { useState, useMemo, useEffect, useRef } from 'react';
import { FiArrowLeft, FiFilter, FiGrid, FiList } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import MobileFilterPanel from "../components/Mobile/MobileFilterPanel";
import ProductCard from '../../../shared/components/ProductCard';
import ProductListItem from '../components/Mobile/ProductListItem';
import { getProducts } from '../../../shared/services/productService';
import PageTransition from '../../../shared/components/PageTransition';
import useInfiniteScroll from '../../../shared/hooks/useInfiniteScroll';
import toast from 'react-hot-toast';

const MobileFlashSale = () => {
  const navigate = useNavigate();
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
  });

  // Transform product to match frontend format
  const transformProduct = (product) => {
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
    
    return {
      id: product._id || product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      images: product.images || [],
      unit: product.unit || 'Piece',
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0,
      stock: product.stock,
      stockQuantity: product.stockQuantity,
      vendorId: vendorData?.id || (typeof vendor === 'object' ? vendor?._id?.toString() : vendor?.toString() || vendor),
      vendor: vendorData,
      flashSale: product.flashSale || false,
    };
  };

  // Fetch flash sale products from API
  useEffect(() => {
    const fetchFlashSale = async () => {
      try {
        setIsLoadingProducts(true);
        const response = await getProducts({
          flashSale: true, // Only fetch products where vendor checked flashSale checkbox
          limit: 100, // Fetch more products for infinite scroll
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        const products = (response.data?.products || response.products || []).map(p => ({
          ...transformProduct(p),
          isFlashSale: true
        }));
        setFlashSaleProducts(products);
      } catch (error) {
        console.error('Error fetching flash sale products:', error);
        toast.error('Failed to load flash sale products');
        setFlashSaleProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchFlashSale();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = flashSaleProducts;

    if (filters.minPrice) {
      result = result.filter((product) => product.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((product) => product.price <= parseFloat(filters.maxPrice));
    }
    if (filters.minRating) {
      result = result.filter(
        (product) => product.rating >= parseFloat(filters.minRating)
      );
    }

    return result;
  }, [flashSaleProducts, filters]);

  const { displayedItems, hasMore, isLoading, loadMore, loadMoreRef } = useInfiniteScroll(
    filteredProducts,
    10,
    10
  );

  const filterButtonRef = useRef(null);

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
    });
  };

  // Check if any filter is active
  const hasActiveFilters =
    filters.minPrice || filters.maxPrice || filters.minRating || filters.category;

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

  return (
    <PageTransition>
      <MobileLayout showBottomNav={true} showCartBar={true}>
        <div className="w-full pb-24">
          {/* Header */}
          <div className="px-4 py-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200 sticky top-1 z-30">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
              >
                <FiArrowLeft className="text-xl text-gray-700" />
              </button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-800">Flash Sale</h1>
                <p className="text-sm text-gray-600">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} on sale
                </p>
              </div>
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
                    className={`p-2 glass-card rounded-xl hover:bg-white/80 transition-colors ${showFilters ? "bg-white/80" : ""
                      }`}
                  >
                    <FiFilter
                      className={`text-lg transition-colors ${hasActiveFilters ? "text-blue-600" : "text-gray-600"
                        }`}
                    />
                  </button>

                  {/* Filter Bottom Sheet */}
                  <MobileFilterPanel
                    isOpen={showFilters}
                    onClose={() => setShowFilters(false)}
                    filters={filters}
                    onFilterChange={(name, value) => setFilters({ ...filters, [name]: value })}
                    onClearFilters={() => setFilters({ category: '', minPrice: '', maxPrice: '', minRating: '' })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Products List */}
          <div className="px-4 py-4">
            {isLoadingProducts ? (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-300 mx-auto mb-4 animate-pulse">⚡</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Loading flash sale...</h3>
                <p className="text-gray-600">Please wait</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-300 mx-auto mb-4">⚡</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No flash sale items</h3>
                <p className="text-gray-600">Check back later for flash sales!</p>
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
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
                        <span className="text-sm">Loading more products...</span>
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
                        <span className="text-sm">Loading more products...</span>
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
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileFlashSale;

