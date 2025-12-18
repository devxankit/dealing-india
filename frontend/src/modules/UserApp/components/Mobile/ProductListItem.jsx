import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiShoppingBag, FiHeart } from "react-icons/fi";
import { useCartStore, useUIStore } from "../../../../shared/store/useStore";
import { useWishlistStore } from "../../../../shared/store/wishlistStore";
import { formatPrice } from "../../../../shared/utils/helpers";
import toast from "react-hot-toast";
import LazyImage from '../../../../shared/components/LazyImage';
import VendorBadge from "../../../Vendor/components/VendorBadge";
import { getVendorById } from '../../../../data/vendors';

const ProductListItem = ({ product, index }) => {
  const location = window.location.pathname;
  const isMobileApp = location.startsWith("/app");
  const productLink = isMobileApp
    ? `/app/product/${product.id}`
    : `/product/${product.id}`;
  const addItem = useCartStore((state) => state.addItem);
  const triggerCartAnimation = useUIStore(
    (state) => state.triggerCartAnimation
  );
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();
  const isFavorite = isInWishlist(product.id);

  const handleAddToCart = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
    triggerCartAnimation();
  };

  const handleFavorite = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card rounded-xl p-1.5 mb-1.5">
      <div className="flex gap-2">
        {/* Product Image */}
        <Link to={productLink} className="flex-shrink-0">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
            <LazyImage
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src =
                  "https://via.placeholder.com/200x200?text=Product";
              }}
            />
          </div>
        </Link>

        {/* Product Info Section */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Row: Name + Favorite Button */}
          <div className="flex items-start justify-between gap-1.5 mb-0.5">
            <Link to={productLink} className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800 text-xs mb-0 line-clamp-2 leading-tight">
                {product.name}
              </h3>
            </Link>
            <button
              onClick={handleFavorite}
              className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isFavorite
                ? "bg-red-50 text-red-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
              <FiHeart
                className={`text-xs ${isFavorite ? "fill-current" : ""}`}
              />
            </button>
          </div>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-0.5 mb-0.5">
              <span className="text-[10px] text-gray-600 font-medium">
                ⭐ {product.rating} ({product.reviewCount || 0})
              </span>
            </div>
          )}

          {/* Vendor Badge */}
          {product.vendorId && (
            <div className="mb-0.5">
              <VendorBadge
                vendor={getVendorById(product.vendorId)}
                showVerified={true}
                size="sm"
              />
            </div>
          )}

          {/* Price Row */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-bold text-gray-800">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-[10px] text-gray-400 line-through font-medium">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="w-full py-1.5 gradient-green text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1 hover:shadow-glow-green transition-all">
            <FiShoppingBag className="text-xs" />
            Add to Cart
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductListItem;
