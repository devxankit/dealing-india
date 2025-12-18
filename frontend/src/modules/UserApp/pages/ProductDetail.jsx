import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiStar,
  FiHeart,
  FiShoppingBag,
  FiMinus,
  FiPlus,
  FiArrowLeft,
  FiShare2,
  FiCheckCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { useCartStore } from "../../../shared/store/useStore";
import { useWishlistStore } from "../../../shared/store/wishlistStore";
import { useReviewsStore } from "../../../shared/store/reviewsStore";
import { getProductById, getSimilarProducts } from "../../../data/products";
import { getVendorById } from "../../../data/vendors";
import { formatPrice } from "../../../shared/utils/helpers";
import toast from "react-hot-toast";
import MobileLayout from "../components/Layout/MobileLayout";
import ImageGallery from "../../../shared/components/Product/ImageGallery";
import VariantSelector from "../../../shared/components/Product/VariantSelector";
import MobileProductCard from "../components/Mobile/MobileProductCard";
import PageTransition from "../../../shared/components/PageTransition";
import Badge from "../../../shared/components/Badge";

const MobileProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = getProductById(id);
  const vendor = product ? getVendorById(product.vendorId) : null;
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const addItem = useCartStore((state) => state.addItem);
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();
  const { getReviews, sortReviews } = useReviewsStore();

  const isFavorite = product ? isInWishlist(product.id) : false;
  const productReviews = product ? sortReviews(product.id, "newest") : [];

  useEffect(() => {
    if (product?.variants?.defaultVariant) {
      setSelectedVariant(product.variants.defaultVariant);
    }
  }, [product]);

  if (!product) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={false}>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Product Not Found
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

  const handleAddToCart = () => {
    if (product.stock === "out_of_stock") {
      toast.error("Product is out of stock");
      return;
    }

    let finalPrice = product.price;
    if (selectedVariant && product.variants?.prices) {
      if (
        selectedVariant.size &&
        product.variants.prices[selectedVariant.size]
      ) {
        finalPrice = product.variants.prices[selectedVariant.size];
      } else if (
        selectedVariant.color &&
        product.variants.prices[selectedVariant.color]
      ) {
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
  };

  const handleFavorite = () => {
    if (isFavorite) {
      removeFromWishlist(product.id);
      toast.success("Removed from wishlist");
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      });
      toast.success("Added to wishlist");
    }
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (product.stockQuantity || 10)) {
      setQuantity(newQuantity);
    }
  };

  const productImages = useMemo(() => {
    return product.images && product.images.length > 0
      ? product.images
      : [product.image];
  }, [product]);

  const currentPrice = useMemo(() => {
    if (selectedVariant && product.variants?.prices) {
      if (
        selectedVariant.size &&
        product.variants.prices[selectedVariant.size]
      ) {
        return product.variants.prices[selectedVariant.size];
      }
      if (
        selectedVariant.color &&
        product.variants.prices[selectedVariant.color]
      ) {
        return product.variants.prices[selectedVariant.color];
      }
    }
    return product.price;
  }, [product, selectedVariant]);

  const similarProducts = useMemo(() => {
    return getSimilarProducts(product.id, 4);
  }, [product?.id]);

  return (
    <PageTransition>
      <MobileLayout showBottomNav={false} showCartBar={true}>
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

          {/* Product Image */}
          <div className="px-4 py-4">
            <ImageGallery images={productImages} productName={product.name} />
            {product.flashSale && (
              <div className="mt-3">
                <Badge variant="flash">Flash Sale</Badge>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              {product.name}
            </h1>

            {/* Vendor Badge */}
            {vendor && (
              <div className="mb-4">
                <Link
                  to={`/app/vendor/${vendor.id}`}
                  className="inline-flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 text-primary-700 rounded-xl transition-all duration-300 border border-primary-200/50 shadow-sm hover:shadow-md">
                  {vendor.storeLogo && (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-primary-200 flex-shrink-0">
                      <img
                        src={vendor.storeLogo}
                        alt={vendor.storeName || vendor.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  {!vendor.storeLogo && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                      <FiShoppingBag className="text-white text-sm" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">
                        {vendor.storeName || vendor.name}
                      </span>
                      {vendor.isVerified && (
                        <FiCheckCircle
                          className="text-accent-600 text-base"
                          title="Verified Vendor"
                        />
                      )}
                    </div>
                    {vendor.rating > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              className={`text-[10px] ${i < Math.floor(vendor.rating)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600 ml-1">
                          {vendor.rating.toFixed(1)} ({vendor.reviewCount || 0}{" "}
                          reviews)
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-primary-600 font-bold">→</span>
                </Link>
              </div>
            )}

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <FiStar
                      key={i}
                      className={`text-base ${i < Math.floor(product.rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                        }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {product.rating} ({product.reviewCount || 0} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-gray-800">
                {formatPrice(currentPrice)}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-gray-400 line-through font-medium">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              {product.originalPrice && (
                <span className="text-sm font-bold text-accent-600">
                  {Math.round(
                    ((product.originalPrice - currentPrice) /
                      product.originalPrice) *
                    100
                  )}
                  % OFF
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="mb-4">
              {product.stock === "in_stock" && (
                <p className="text-primary-600 font-semibold text-sm">
                  ✓ In Stock ({product.stockQuantity} available)
                </p>
              )}
              {product.stock === "low_stock" && (
                <p className="text-orange-600 font-semibold text-sm">
                  ⚠ Low Stock (Only {product.stockQuantity} left)
                </p>
              )}
              {product.stock === "out_of_stock" && (
                <p className="text-red-600 font-semibold text-sm">
                  ✗ Out of Stock
                </p>
              )}
            </div>

            {/* Unit */}
            <p className="text-gray-600 mb-4 text-sm">Unit: {product.unit}</p>

            {/* Variant Selector */}
            {product.variants && (
              <div className="mb-6">
                <VariantSelector
                  variants={product.variants}
                  onVariantChange={setSelectedVariant}
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
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <FiMinus className="text-gray-600" />
                </button>
                <span className="text-xl font-bold text-gray-800 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= (product.stockQuantity || 10)}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <FiPlus className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Description
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                High-quality {product.name.toLowerCase()} available in{" "}
                {product.unit.toLowerCase()}. This product is carefully selected
                to ensure the best quality and freshness. Perfect for your daily
                needs with excellent value for money.
              </p>
            </div>

            {/* Reviews Summary */}
            {productReviews.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Customer Reviews ({productReviews.length})
                </h3>
                <div className="space-y-3">
                  {productReviews.map((review) => (
                    <div key={review.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              className={`text-xs ${i < review.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {review.user}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Products */}
            {similarProducts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  You May Also Like
                </h3>
                <div className="space-y-0">
                  {similarProducts.map((similarProduct) => (
                    <MobileProductCard
                      key={similarProduct.id}
                      product={similarProduct}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 safe-area-bottom">
          <div className="flex items-center gap-3">
            <button
              onClick={handleFavorite}
              className={`p-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center ${isFavorite
                ? "bg-red-50 text-red-600 border-2 border-red-200"
                : "bg-gray-100 text-gray-700"
                }`}>
              <FiHeart
                className={`text-xl ${isFavorite ? "fill-red-600" : ""}`}
              />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: product.name,
                    text: `Check out ${product.name}`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard");
                }
              }}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl font-semibold transition-all duration-300">
              <FiShare2 className="text-xl" />
            </button>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === "out_of_stock"}
              className={`flex-1 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 ${product.stock === "out_of_stock"
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "gradient-green text-white hover:shadow-glow-green"
                }`}>
              <FiShoppingBag className="text-xl" />
              <span>
                {product.stock === "out_of_stock"
                  ? "Out of Stock"
                  : "Add to Cart"}
              </span>
            </button>
          </div>
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileProductDetail;
