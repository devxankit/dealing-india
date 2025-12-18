import { useState } from 'react';
import { FiHeart, FiGrid, FiList, FiShoppingBag, FiTrash2, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useWishlistStore } from '../../../shared/store/wishlistStore';
import { useCartStore } from '../../../shared/store/useStore';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import ProductCard from '../../../shared/components/ProductCard';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const Wishlist = () => {
  const { items, removeItem, moveToCart, clearWishlist } = useWishlistStore();
  const { addItem } = useCartStore();
  const { responsivePadding } = useResponsiveHeaderPadding();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const handleMoveToCart = (item) => {
    const wishlistItem = moveToCart(item.id);
    if (wishlistItem) {
      addItem({
        ...wishlistItem,
        quantity: 1,
      });
      toast.success('Moved to cart!');
    }
  };

  const handleRemove = (id) => {
    removeItem(id);
    toast.success('Removed from wishlist');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your wishlist?')) {
      clearWishlist();
      toast.success('Wishlist cleared');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
        <Header />
        <Navbar />
        <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-2">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">My Wishlist</h1>
                  <p className="text-gray-600">
                    {items.length} {items.length === 1 ? 'item' : 'items'} saved
                  </p>
                </div>
                {items.length > 0 && (
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
                    <button
                      onClick={handleClearAll}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors text-sm"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {/* Empty State */}
              {items.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <FiHeart className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Your wishlist is empty</h3>
                  <p className="text-gray-600 mb-6">
                    Start adding products you love to your wishlist!
                  </p>
                  <Link
                    to="/"
                    className="inline-block px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300"
                  >
                    Continue Shopping
                  </Link>
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProductCard product={item} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card rounded-2xl p-4 sm:p-6"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Product Image */}
                        <Link to={`/product/${item.id}`} className="flex-shrink-0">
                          <div className="w-full sm:w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src =
                                  'https://via.placeholder.com/200x200?text=Product+Image';
                              }}
                            />
                          </div>
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <Link to={`/product/${item.id}`}>
                              <h3 className="font-bold text-gray-800 text-lg mb-2 hover:text-primary-600 transition-colors">
                                {item.name}
                              </h3>
                            </Link>
                            <p className="text-gray-600 mb-2">{item.unit || 'Unit'}</p>
                            <p className="text-xl font-bold text-gray-800">{formatPrice(item.price)}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => handleMoveToCart(item)}
                              className="flex items-center justify-center gap-2 px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 hover:scale-105"
                            >
                              <FiShoppingBag />
                              Move to Cart
                            </button>
                            <button
                              onClick={() => handleRemove(item.id)}
                              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors"
                            >
                              <FiTrash2 />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Quick Actions for Grid View */}
              {items.length > 0 && viewMode === 'grid' && (
                <div className="mt-8 flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={() => {
                      items.forEach((item) => handleMoveToCart(item));
                    }}
                    className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 flex items-center gap-2"
                  >
                    <FiShoppingBag />
                    Move All to Cart
                  </button>
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

export default Wishlist;

