import { FiHeart, FiShoppingBag, FiStar } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCartStore, useUIStore } from "../../../../shared/store/useStore";
import { useWishlistStore } from "../../../../shared/store/wishlistStore";
import {
  formatPrice,
  getPlaceholderImage,
} from "../../../../shared/utils/helpers";
import toast from "react-hot-toast";
import LazyImage from "../../../../shared/components/LazyImage";
import { useState, useRef } from "react";
import useLongPress from "../../hooks/useLongPress";
import LongPressMenu from "./LongPressMenu";
import FlyingItem from "./FlyingItem";
import VendorBadge from "../../../Vendor/components/VendorBadge";
import { getVendorById } from "../../../../data/vendors";

const MobileProductCard = ({ product }) => {
  const navigate = useNavigate();
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
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showFlyingItem, setShowFlyingItem] = useState(false);
  const [flyingItemPos, setFlyingItemPos] = useState({
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
  });
  const buttonRef = useRef(null);

  // Check if product is out of stock
  const isOutOfStock = (product.stockQuantity !== undefined && product.stockQuantity <= 0) || product.stock === "out_of_stock";

  const handleBuyNow = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const buyNowItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    };

    navigate("/app/checkout", { state: { buyNowItem } });
  };

  const handleAddToCart = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Get button position
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    const startX = buttonRect ? buttonRect.left + buttonRect.width / 2 : 0;
    const startY = buttonRect ? buttonRect.top + buttonRect.height / 2 : 0;

    // Get cart bar position (prefer cart bar over header icon)
    setTimeout(() => {
      const cartBar = document.querySelector("[data-cart-bar]");
      let endX = window.innerWidth / 2;
      let endY = window.innerHeight - 100;

      if (cartBar) {
        const cartRect = cartBar.getBoundingClientRect();
        endX = cartRect.left + cartRect.width / 2;
        endY = cartRect.top + cartRect.height / 2;
      } else {
        // Fallback to cart icon in header
        const cartIcon = document.querySelector("[data-cart-icon]");
        if (cartIcon) {
          const cartRect = cartIcon.getBoundingClientRect();
          endX = cartRect.left + cartRect.width / 2;
          endY = cartRect.top + cartRect.height / 2;
        }
      }

      setFlyingItemPos({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
      });
      setShowFlyingItem(true);
    }, 50);

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

  const handleLongPress = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setShowLongPressMenu(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name}`,
        url: window.location.origin + `/app/product/${product.id}`,
      });
    } else {
      navigator.clipboard.writeText(
        window.location.origin + `/app/product/${product.id}`
      );
      toast.success("Link copied to clipboard");
    }
  };

  const longPressHandlers = useLongPress(handleLongPress, 500);

  return (
    <>
      <Link to={`/app/product/${product.id}`} className="block">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="glass-card rounded-2xl overflow-hidden mb-4"
          {...longPressHandlers}>
          <div className="flex gap-4 p-4">
            {/* Product Image */}
            <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
              <LazyImage
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = getPlaceholderImage(200, 200, "Product");
                }}
              />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-2 flex-1">
                  {product.name}
                </h3>
              </div>

              <p className="text-xs text-gray-500 mb-2">{product.unit}</p>

              {/* Vendor Badge */}
              {(product.vendor || product.vendorId) && (
                <div className="mb-2">
                  <VendorBadge
                    vendor={product.vendor || getVendorById(product.vendorId)}
                    showVerified={true}
                    size="sm"
                    disableLink={true}
                  />
                </div>
              )}

              {/* Rating */}
              {product.rating > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <FiStar
                        key={i}
                        className={`text-xs ${i < Math.floor(product.rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    {product.rating?.toFixed(1) || '0.0'} ({product.reviewCount || 0})
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-bold text-gray-800">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-xs text-gray-400 line-through font-medium">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Wishlist Button */}
              <motion.button
                ref={buttonRef}
                onClick={handleFavorite}
                whileTap={{ scale: 0.95 }}
                animate={
                  isFavorite
                    ? {
                      scale: [1, 1.05, 1],
                    }
                    : {}
                }
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${isFavorite
                  ? "bg-red-50 text-red-500 border-2 border-red-100"
                  : "bg-gray-50 text-gray-700 border-2 border-gray-100 hover:bg-gray-100"
                  }`}>
                <motion.div
                  animate={
                    isFavorite
                      ? {
                        scale: [1, 1.2, 1],
                      }
                      : {}
                  }
                  transition={{ duration: 0.3 }}>
                  <FiHeart className={`text-base ${isFavorite ? "fill-current" : ""}`} />
                </motion.div>
                <span>
                  {isFavorite ? "In Wishlist" : "Wishlist"}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </Link>

      <LongPressMenu
        isOpen={showLongPressMenu}
        onClose={() => setShowLongPressMenu(false)}
        position={menuPosition}
        onAddToCart={handleAddToCart}
        onAddToWishlist={handleFavorite}
        onShare={handleShare}
        isInWishlist={isFavorite}
      />

      {showFlyingItem && (
        <FlyingItem
          image={product.image}
          startPosition={flyingItemPos.start}
          endPosition={flyingItemPos.end}
          onComplete={() => setShowFlyingItem(false)}
        />
      )}
    </>
  );
};

export default MobileProductCard;
