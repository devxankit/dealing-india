import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { FiFilter, FiGrid, FiList, FiLoader } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useCategoryStore } from '../../../shared/store/categoryStore';
import { getProductsByCategory } from '../../../shared/services/productService';
import { formatPrice } from '../../../shared/utils/helpers';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import ProductCard from '../../../shared/components/ProductCard';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import useInfiniteScroll from '../../../shared/hooks/useInfiniteScroll';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';
import toast from 'react-hot-toast';

const Category = () => {
  const { id } = useParams();
  const categoryId = id; // Keep as string for API
  const { categories, initialize, getCategoryById, getCategoriesByParent } = useCategoryStore();
  
  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get category from store
  const category = useMemo(() => {
    return getCategoryById(categoryId);
  }, [categoryId, categories, getCategoryById]);

  // Get subcategories for this category
  const subcategories = useMemo(() => {
    if (!categoryId) return [];
    return getCategoriesByParent(categoryId).filter(cat => cat.isActive !== false);
  }, [categoryId, categories, getCategoriesByParent]);

  const { responsivePadding } = useResponsiveHeaderPadding();
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('default'); // default, price-low, price-high, rating
  const [showFilters, setShowFilters] = useState(false);
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
      // Determine sortBy and sortOrder based on sortBy state
      let sortByParam = 'createdAt';
      let sortOrderParam = 'desc';
      
      switch (sortBy) {
        case 'price-low':
          sortByParam = 'price';
          sortOrderParam = 'asc';
          break;
        case 'price-high':
          sortByParam = 'price';
          sortOrderParam = 'desc';
          break;
        case 'rating':
          sortByParam = 'rating';
          sortOrderParam = 'desc';
          break;
        default:
          sortByParam = 'createdAt';
          sortOrderParam = 'desc';
      }

      const result = await getProductsByCategory(categoryId, {
        page: 1,
        limit: 100, // Get more products for better UX
        sortBy: sortByParam,
        sortOrder: sortOrderParam,
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
  }, [categoryId, sortBy]);

  // Fetch products when category or sortBy changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Infinite scroll hook
  const { displayedItems, hasMore, isLoading, loadMore, loadMoreRef } = useInfiniteScroll(
    products,
    12,
    12
  );

  if (!category) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
          <Header />
          <Navbar />
          <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-2 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Category Not Found</h1>
              <p className="text-gray-600">The category you're looking for doesn't exist.</p>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

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
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/80x80?text=Category';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {category.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient mb-2 relative z-10">
                        {category.name}
                      </h1>
                      <p className="text-gray-600 text-sm sm:text-base">
                        {loadingProducts ? "Loading..." : `${products.length} product${products.length !== 1 ? 's' : ''} available`}
                      </p>
                    </div>
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

                {/* Filters Panel */}
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card rounded-2xl p-4 sm:p-6 mb-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Sort Products</h3>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <FiFilter className="text-lg" />
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
                          <option value="default">Default</option>
                          <option value="price-low">Price: Low to High</option>
                          <option value="price-high">Price: High to Low</option>
                          <option value="rating">Highest Rating</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Products Grid/List */}
              {loadingProducts ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <div className="text-6xl text-gray-300 mx-auto mb-4">📦</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No products found</h3>
                  <p className="text-gray-600">
                    There are no products available in this category at the moment.
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
                                  <span className="text-sm text-gray-400 line-through">
                                    {formatPrice(product.originalPrice)}
                                  </span>
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
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Category;
