import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiStar, FiHeart, FiShoppingBag, FiMinus, FiPlus, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useCartStore } from '../../../shared/store/useStore';
import { useWishlistStore } from '../../../shared/store/wishlistStore';
import { useReviewsStore } from '../../../shared/store/reviewsStore';
import { getProductById, getSimilarProducts } from '../../../data/products';
import { getVendorById } from '../../../data/vendors';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import Badge from '../../../shared/components/Badge';
import ProductCard from '../../../shared/components/ProductCard';
import VendorBadge from '../../Vendor/components/VendorBadge';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import ImageGallery from '../../../shared/components/Product/ImageGallery';
import VariantSelector from '../../../shared/components/Product/VariantSelector';
import ReviewForm from '../../../shared/components/Product/ReviewForm';
import ReviewItem from '../../../shared/components/Product/ReviewItem';
import SocialShare from '../../../shared/components/Product/SocialShare';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = getProductById(id);
  const { responsivePadding } = useResponsiveHeaderPadding();
  const vendor = product ? getVendorById(product.vendorId) : null;
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [reviewSortBy, setReviewSortBy] = useState('newest');
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  const addItem = useCartStore((state) => state.addItem);
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { getReviews, addReview, sortReviews, voteHelpful, voteNotHelpful, hasVoted } = useReviewsStore();
  
  const isFavorite = product ? isInWishlist(product.id) : false;
  const productReviews = product ? sortReviews(product.id, reviewSortBy) : [];
  
  // Initialize variant if product has variants
  useEffect(() => {
    if (product?.variants?.defaultVariant) {
      setSelectedVariant(product.variants.defaultVariant);
    }
  }, [product]);

  if (!product) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
          <Header />
          <Navbar />
          <main className="w-full overflow-x-hidden flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h2>
              <Link to="/" className="gradient-green text-white px-6 py-3 rounded-xl font-semibold">
                Go Back Home
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  const handleAddToCart = () => {
    if (product.stock === 'out_of_stock') {
      toast.error('Product is out of stock');
      return;
    }
    
    // Get variant price if variant is selected
    let finalPrice = product.price;
    if (selectedVariant && product.variants?.prices) {
      if (selectedVariant.size && product.variants.prices[selectedVariant.size]) {
        finalPrice = product.variants.prices[selectedVariant.size];
      } else if (selectedVariant.color && product.variants.prices[selectedVariant.color]) {
        finalPrice = product.variants.prices[selectedVariant.color];
      }
    }
    
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: product.image,
      quantity: quantity,
      variant: selectedVariant,
    });
    toast.success(`Added ${quantity} item(s) to cart!`);
  };

  const handleFavorite = () => {
    if (isFavorite) {
      removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      });
      toast.success('Added to wishlist');
    }
  };

  const handleReviewSubmit = (reviewData) => {
    addReview(product.id, {
      ...reviewData,
      user: 'You', // In real app, get from auth store
    });
    setShowReviewForm(false);
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (product.stockQuantity || 10)) {
      setQuantity(newQuantity);
    }
  };

  // Get similar/recommended products
  const similarProducts = useMemo(() => {
    if (!product) return [];
    return getSimilarProducts(product.id, 6);
  }, [product?.id]);

  // Get product images for ImageGallery
  const productImages = useMemo(() => {
    if (!product) return [];
    return product.images && product.images.length > 0 ? product.images : [product.image];
  }, [product]);

  // Get current price based on variant
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    if (selectedVariant && product.variants?.prices) {
      if (selectedVariant.size && product.variants.prices[selectedVariant.size]) {
        return product.variants.prices[selectedVariant.size];
      }
      if (selectedVariant.color && product.variants.prices[selectedVariant.color]) {
        return product.variants.prices[selectedVariant.color];
      }
    }
    return product.price;
  }, [product, selectedVariant]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
        <Header />
        <Navbar />
        <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-1">
            <div className="max-w-6xl mx-auto">
              {/* Breadcrumbs */}
              <Breadcrumbs />

          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <FiArrowLeft className="text-lg" />
            <span className="font-medium">Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Product Image Gallery */}
            <div className="w-full">
              <ImageGallery images={productImages} productName={product.name} />
              {product.flashSale && (
                <div className="mt-4">
                  <Badge variant="flash">Flash Sale</Badge>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
                  {product.name}
                </h1>

                {/* Vendor Badge */}
                {vendor && (
                  <div className="mb-4">
                    <Link
                      to={`/vendor/${vendor.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-colors"
                    >
                      <FiShoppingBag />
                      <span className="font-semibold">{vendor.storeName || vendor.name}</span>
                      {vendor.isVerified && (
                        <FiCheckCircle className="text-green-600" title="Verified Vendor" />
                      )}
                      <span className="text-sm text-primary-600">→ View Store</span>
                    </Link>
                  </div>
                )}

                {/* Rating */}
                {product.rating && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          className={`text-lg ${
                            i < Math.floor(product.rating)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-600 font-medium">
                      {product.rating} ({product.reviewCount || 0} reviews)
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-3xl sm:text-4xl font-bold text-gray-800">
                    {formatPrice(currentPrice)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xl text-gray-400 line-through font-medium">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  {product.originalPrice && (
                    <span className="text-lg font-bold text-accent-600">
                      {Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)}% OFF
                    </span>
                  )}
                </div>

                {/* Stock Status */}
                <div className="mb-6">
                  {product.stock === 'in_stock' && (
                    <p className="text-primary-600 font-semibold">
                      ✓ In Stock ({product.stockQuantity} available)
                    </p>
                  )}
                  {product.stock === 'low_stock' && (
                    <p className="text-orange-600 font-semibold">
                      ⚠ Low Stock (Only {product.stockQuantity} left)
                    </p>
                  )}
                  {product.stock === 'out_of_stock' && (
                    <p className="text-red-600 font-semibold">✗ Out of Stock</p>
                  )}
                </div>

                {/* Unit */}
                <p className="text-gray-600 mb-6">Unit: {product.unit}</p>
              </div>

              {/* Variant Selector */}
              {product.variants && (
                <div className="mb-6">
                  <VariantSelector
                    variants={product.variants}
                    onVariantChange={handleVariantChange}
                    currentPrice={product.price}
                  />
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiMinus className="text-gray-600" />
                  </button>
                  <span className="text-xl font-bold text-gray-800 min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (product.stockQuantity || 10)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiPlus className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 'out_of_stock'}
                  className={`flex-1 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                    product.stock === 'out_of_stock'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'gradient-green text-white hover:shadow-glow-green hover:scale-105'
                  }`}
                >
                  <FiShoppingBag className="text-xl" />
                  <span>
                    {product.stock === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}
                  </span>
                </button>
                <button
                  onClick={handleFavorite}
                  className={`px-6 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    isFavorite
                      ? 'bg-red-50 text-red-600 border-2 border-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiHeart className={`text-xl ${isFavorite ? 'fill-red-600' : ''}`} />
                </button>
                <div className="flex items-center">
                  <SocialShare
                    productName={product.name}
                    productUrl={window.location.href}
                    productImage={product.image}
                  />
                </div>
              </div>

              {/* Product Description */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">
                  High-quality {product.name.toLowerCase()} available in {product.unit.toLowerCase()}. 
                  This product is carefully selected to ensure the best quality and freshness. 
                  Perfect for your daily needs with excellent value for money.
                </p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12 border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Customer Reviews ({productReviews.length})
              </h2>
              <div className="flex items-center gap-4">
                <select
                  value={reviewSortBy}
                  onChange={(e) => setReviewSortBy(e.target.value)}
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none text-sm font-medium"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="most-helpful">Most Helpful</option>
                  <option value="highest-rating">Highest Rating</option>
                  <option value="lowest-rating">Lowest Rating</option>
                </select>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2 gradient-green text-white rounded-lg font-semibold hover:shadow-glow-green transition-all duration-300"
                >
                  {showReviewForm ? 'Cancel Review' : 'Write a Review'}
                </button>
              </div>
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <ReviewForm
                productId={product.id}
                onSubmit={handleReviewSubmit}
              />
            )}

            {/* Reviews List */}
            {productReviews.length > 0 ? (
              <div className="space-y-6">
                {productReviews.map((review) => (
                  <ReviewItem
                    key={review.id}
                    review={review}
                    onHelpful={() => voteHelpful(product.id, review.id)}
                    onNotHelpful={() => voteNotHelpful(product.id, review.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <p className="text-gray-500 font-medium mb-2">No reviews yet</p>
                <p className="text-sm text-gray-400">Be the first to review this product!</p>
              </div>
            )}
          </div>

          {/* Recommended/Similar Products Section */}
          {similarProducts.length > 0 && (
            <div className="mt-12 border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">You May Also Like</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
                {similarProducts.map((similarProduct, index) => (
                  <motion.div
                    key={similarProduct.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ProductCard product={similarProduct} />
                  </motion.div>
                ))}
              </div>
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

export default ProductDetail;

