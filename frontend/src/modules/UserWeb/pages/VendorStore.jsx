import { useState, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  FiArrowLeft,
  FiStar,
  FiShoppingBag,
  FiCheckCircle,
  FiFilter,
  FiGrid,
  FiList,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { getVendorById } from "../../../data/vendors";
import { products } from "../../../data/products";
import { formatPrice } from "../../../shared/utils/helpers";
import ProductCard from "../../../shared/components/ProductCard";
import ProductListItem from "../../UserApp/components/Mobile/ProductListItem";
import Header from "../components/Layout/Header";
import Navbar from "../components/Layout/Navbar";
import Footer from "../components/Layout/Footer";
import MobileLayout from "../../UserApp/components/Layout/MobileLayout";
import PageTransition from "../../../shared/components/PageTransition";
import Breadcrumbs from "../components/Layout/Breadcrumbs";
import useResponsiveHeaderPadding from "../../../shared/hooks/useResponsiveHeaderPadding";
import useInfiniteScroll from "../../../shared/hooks/useInfiniteScroll";
import Badge from "../../../shared/components/Badge";
import logoImage from "../../../../data/logos/ChatGPT Image Dec 2, 2025, 03_01_19 PM.png";
import { getImagePath } from "../../../shared/utils/imagePaths";

const VendorStore = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { responsivePadding } = useResponsiveHeaderPadding();
  const vendor = getVendorById(id);

  // Check if we're in the mobile app section
  const isMobileApp = location.pathname.startsWith("/app");

  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    minRating: "",
    inStock: false,
  });

  // Get vendor products
  const vendorProducts = useMemo(() => {
    if (!vendor) return [];
    return products.filter((p) => {
      const productVendorId =
        typeof p.vendorId === "string"
          ? parseInt(p.vendorId.replace("vendor-", ""))
          : p.vendorId;
      const vendorIdNum =
        typeof vendor.id === "string" ? parseInt(vendor.id) : vendor.id;
      return (
        productVendorId === vendorIdNum ||
        p.vendorId === vendor.id ||
        p.vendorId === vendorIdNum
      );
    });
  }, [vendor]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...vendorProducts];

    // Apply filters
    if (filters.minPrice) {
      filtered = filtered.filter(
        (p) => p.price >= parseFloat(filters.minPrice)
      );
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(
        (p) => p.price <= parseFloat(filters.maxPrice)
      );
    }
    if (filters.minRating) {
      filtered = filtered.filter(
        (p) => (p.rating || 0) >= parseFloat(filters.minRating)
      );
    }
    if (filters.inStock) {
      filtered = filtered.filter((p) => p.stock !== "out_of_stock");
    }

    // Sort products
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        filtered.sort((a, b) => b.id - a.id);
        break;
      default:
        // Popular (by rating and review count)
        filtered.sort((a, b) => {
          const scoreA = (a.rating || 0) * (a.reviewCount || 0);
          const scoreB = (b.rating || 0) * (b.reviewCount || 0);
          return scoreB - scoreA;
        });
    }

    return filtered;
  }, [vendorProducts, filters, sortBy]);

  const { displayedItems, hasMore, loadMore, loadMoreRef } = useInfiniteScroll(
    filteredProducts,
    12,
    12
  );

  if (!vendor) {
    if (isMobileApp) {
      return (
        <PageTransition>
          <MobileLayout showBottomNav={true} showCartBar={true}>
            <div className="w-full flex items-center justify-center min-h-[60vh] px-4">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Vendor Not Found
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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
          <Header />
          <Navbar />
          <main className="w-full overflow-x-hidden flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Vendor Not Found
              </h2>
              <Link
                to="/"
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold">
                Go Back Home
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  // Mobile App Layout
  if (isMobileApp) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={true} showCartBar={true}>
          <div className="w-full pb-24">
            {/* Back Button */}
            <div className="px-4 pt-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
                <FiArrowLeft className="text-xl" />
                <span className="font-medium">Back</span>
              </button>
            </div>

            {/* Vendor Header */}
            <div className="px-4 py-4">
              <div className="glass-card rounded-2xl p-4 mb-4">
                <div className="flex items-start gap-4">
                  {/* Vendor Logo */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                      {vendor.storeLogo ? (
                        <img
                          src={vendor.storeLogo}
                          alt={vendor.storeName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = logoImage;
                          }}
                        />
                      ) : (
                        <FiShoppingBag className="text-2xl text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Vendor Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-lg font-bold text-gray-800 truncate">
                        {vendor.storeName}
                      </h1>
                      {vendor.isVerified && (
                        <FiCheckCircle
                          className="text-green-600 flex-shrink-0"
                          title="Verified Vendor"
                        />
                      )}
                    </div>
                    {vendor.storeDescription && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {vendor.storeDescription}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {vendor.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <FiStar className="text-yellow-400 fill-yellow-400 text-sm" />
                          <span className="font-semibold text-gray-800">
                            {vendor.rating}
                          </span>
                          <span className="text-gray-500">
                            ({vendor.reviewCount})
                          </span>
                        </div>
                      )}
                      <div className="text-gray-600">
                        <span className="font-semibold">
                          {vendor.totalProducts || vendorProducts.length}
                        </span>{" "}
                        Products
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and View Options - Mobile */}
            <div className="px-4 mb-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                    showFilters
                      ? "bg-primary-50 border-primary-500 text-primary-700"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}>
                  <FiFilter className="text-base" />
                  <span className="font-semibold">Filters</span>
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                  <option value="popular">Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest</option>
                </select>
                <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === "grid"
                        ? "bg-primary-100 text-primary-700"
                        : "text-gray-600"
                    }`}>
                    <FiGrid className="text-base" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === "list"
                        ? "bg-primary-100 text-primary-700"
                        : "text-gray-600"
                    }`}>
                    <FiList className="text-base" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Panel - Mobile */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 mb-4">
                <div className="glass-card rounded-xl p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Min Price
                      </label>
                      <input
                        type="number"
                        value={filters.minPrice}
                        onChange={(e) =>
                          setFilters({ ...filters, minPrice: e.target.value })
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Max Price
                      </label>
                      <input
                        type="number"
                        value={filters.maxPrice}
                        onChange={(e) =>
                          setFilters({ ...filters, maxPrice: e.target.value })
                        }
                        placeholder="1000"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Min Rating
                      </label>
                      <select
                        value={filters.minRating}
                        onChange={(e) =>
                          setFilters({ ...filters, minRating: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                        <option value="">All Ratings</option>
                        <option value="4">4+ Stars</option>
                        <option value="3">3+ Stars</option>
                        <option value="2">2+ Stars</option>
                        <option value="1">1+ Star</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.inStock}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              inStock: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-xs font-semibold text-gray-700">
                          In Stock Only
                        </span>
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setFilters({
                        minPrice: "",
                        maxPrice: "",
                        minRating: "",
                        inStock: false,
                      })
                    }
                    className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-semibold">
                    Clear Filters
                  </button>
                </div>
              </motion.div>
            )}

            {/* Products Grid/List - Mobile */}
            <div className="px-4 pb-4">
              {filteredProducts.length > 0 ? (
                <>
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-2 gap-3">
                      {displayedItems.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedItems.map((product, index) => (
                        <ProductListItem
                          key={product.id}
                          product={product}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                  {hasMore && (
                    <div ref={loadMoreRef} className="text-center py-8">
                      <p className="text-gray-500 text-sm">
                        Loading more products...
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <FiShoppingBag className="text-5xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    No Products Found
                  </h3>
                  <p className="text-sm text-gray-600">
                    Try adjusting your filters
                  </p>
                </div>
              )}
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  // Desktop Layout
  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
        <Header />
        <Navbar />
        <main
          className="w-full overflow-x-hidden"
          style={{ paddingTop: `${responsivePadding}px` }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumbs */}
            <Breadcrumbs />

            {/* Vendor Header */}
            <div className="glass-card rounded-2xl p-6 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* Vendor Logo */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                    {vendor.storeLogo ? (
                      <img
                        src={vendor.storeLogo}
                        alt={vendor.storeName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = getImagePath("/images/logos/logo.png");
                        }}
                      />
                    ) : (
                      <FiShoppingBag className="text-3xl text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Vendor Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-gray-800">
                      {vendor.storeName}
                    </h1>
                    {vendor.isVerified && (
                      <FiCheckCircle
                        className="text-green-600"
                        title="Verified Vendor"
                      />
                    )}
                  </div>
                  {vendor.storeDescription && (
                    <p className="text-gray-600 mb-3">
                      {vendor.storeDescription}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {vendor.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <FiStar className="text-yellow-400 fill-yellow-400" />
                        <span className="font-semibold text-gray-800">
                          {vendor.rating}
                        </span>
                        <span className="text-gray-500">
                          ({vendor.reviewCount} reviews)
                        </span>
                      </div>
                    )}
                    <div className="text-gray-600">
                      <span className="font-semibold">
                        {vendor.totalProducts || vendorProducts.length}
                      </span>{" "}
                      Products
                    </div>
                    <div className="text-gray-600">
                      <span className="font-semibold">
                        {vendor.totalSales || 0}
                      </span>{" "}
                      Sales
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and View Options */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    showFilters
                      ? "bg-primary-50 border-primary-500 text-primary-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}>
                  <FiFilter />
                  <span className="text-sm font-semibold">Filters</span>
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                  <option value="popular">Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-primary-100 text-primary-700"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}>
                  <FiGrid />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-primary-100 text-primary-700"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}>
                  <FiList />
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Min Price
                    </label>
                    <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, minPrice: e.target.value })
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Max Price
                    </label>
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, maxPrice: e.target.value })
                      }
                      placeholder="1000"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Min Rating
                    </label>
                    <select
                      value={filters.minRating}
                      onChange={(e) =>
                        setFilters({ ...filters, minRating: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">All Ratings</option>
                      <option value="4">4+ Stars</option>
                      <option value="3">3+ Stars</option>
                      <option value="2">2+ Stars</option>
                      <option value="1">1+ Star</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.inStock}
                        onChange={(e) =>
                          setFilters({ ...filters, inStock: e.target.checked })
                        }
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">
                        In Stock Only
                      </span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setFilters({
                      minPrice: "",
                      maxPrice: "",
                      minRating: "",
                      inStock: false,
                    })
                  }
                  className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-semibold">
                  Clear Filters
                </button>
              </motion.div>
            )}

            {/* Products Grid/List */}
            {filteredProducts.length > 0 ? (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {displayedItems.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedItems.map((product, index) => (
                      <ProductListItem
                        key={product.id}
                        product={product}
                        index={index}
                      />
                    ))}
                  </div>
                )}
                {hasMore && (
                  <div ref={loadMoreRef} className="text-center py-8">
                    <p className="text-gray-500">Loading more products...</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <FiShoppingBag className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  No Products Found
                </h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default VendorStore;
