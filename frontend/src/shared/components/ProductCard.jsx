import { FiHeart, FiShoppingBag, FiStar } from "react-icons/fi";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCartStore, useUIStore } from "../store/useStore";
import { useWishlistStore } from "../store/wishlistStore";
import { formatPrice, getPlaceholderImage } from "../utils/helpers";
import toast from "react-hot-toast";
import LazyImage from "./LazyImage";
import { useState, useRef } from "react";
import useLongPress from "../../modules/UserApp/hooks/useLongPress";
import LongPressMenu from "../../modules/UserApp/components/Mobile/LongPressMenu";
import FlyingItem from "../../modules/UserApp/components/Mobile/FlyingItem";
import VendorBadge from "../../modules/Vendor/components/VendorBadge";
import { getVendorById } from "../../data/vendors";

const ProductCard = ({ product, hideRating = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // Check if we're in the mobile app section
  const isMobileApp = location.pathname.startsWith("/app");
  const productLink = isMobileApp
    ? `/app/product/${product.id}`
    : `/product/${product.id}`;

  const handleCardClick = (e) => {
    // Don't navigate if clicking on button or favorite icon
    if (e.target.closest('button') || e.target.closest('[data-no-navigate]')) {
      return;
    }
    navigate(productLink);
  };
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
  const [isAdding, setIsAdding] = useState(false);
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showFlyingItem, setShowFlyingItem] = useState(false);
  const [flyingItemPos, setFlyingItemPos] = useState({
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
  });
  const buttonRef = useRef(null);
  const cartIconRef = useRef(null);

  // Check if product is out of stock
  const isOutOfStock = (product.stockQuantity !== undefined && product.stockQuantity <= 0) || product.stock === "out_of_stock";

  const handleBuyNow = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      // Direct checkout with the product details without adding to cart store
      const buyNowItem = {
        id: product.id || product._id,
        name: product.name,
        price: product.price,
        image: product.image || product.images?.[0],
        quantity: 1,
        vendorId: product.vendorId || product.vendor?.id || product.vendor?._id,
        vendorName: product.vendorName || product.vendor?.storeName || product.vendor?.businessName,
      };

      const checkoutPath = isMobileApp ? "/app/checkout" : "/checkout";
      navigate(checkoutPath, { state: { buyNowItem } });
    } catch (error) {
      console.error('Error in Buy Now:', error);
    }
  };

  const handleAddToCart = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setIsAdding(true);

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

    try {
      // Add product to cart - pass product ID and let cartStore fetch full product data if needed
      await addItem({
        id: product.id || product._id,
        name: product.name,
        price: product.price,
        image: product.image || product.images?.[0],
        quantity: 1,
        vendorId: product.vendorId || product.vendor?.id || product.vendor?._id,
        vendorName: product.vendorName || product.vendor?.storeName || product.vendor?.businessName,
      });
      triggerCartAnimation();
      // Toast is shown by cartStore, so we don't need to show it here
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Error toast is shown by cartStore
    } finally {
      setTimeout(() => setIsAdding(false), 600);
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
        url: window.location.origin + productLink,
      });
    } else {
      navigator.clipboard.writeText(window.location.origin + productLink);
      toast.success("Link copied to clipboard");
    }
  };

  const longPressHandlers = useLongPress(handleLongPress, 500);

  const handleFavorite = (e) => {
    e.stopPropagation();
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
    <>
      <motion.div
        whileTap={{ scale: 0.98 }}
        style={{ willChange: "transform", transform: "translateZ(0)" }}
        className="glass-card rounded-lg overflow-hidden group cursor-pointer h-full flex flex-col"
        onClick={handleCardClick}
        {...longPressHandlers}>
        <div className="relative">
          {/* Product Image */}
          <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden relative">
            <LazyImage
              src={product.image || (product.images && product.images.length > 0 ? product.images[0] : getPlaceholderImage(300, 300, "Product Image"))}
              alt={product.name}
              className="w-full h-full object-cover"
              style={{ willChange: "transform", transform: "translateZ(0)" }}
              context="product-listing"
              onError={(e) => {
                e.target.src = getPlaceholderImage(300, 300, "Product Image");
              }}
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="p-2 flex-1 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-0.5 line-clamp-2 text-xs transition-colors leading-tight">
            {product.name}
          </h3>
          <p className="text-[10px] text-gray-500 mb-0.5 font-medium">
            {product.unit}
          </p>

          {/* Vendor Badge */}
          {(product.vendor || product.vendorId) && (
            <div className="mb-1">
              <VendorBadge
                vendor={product.vendor || getVendorById(product.vendorId)}
                showVerified={true}
                size="sm"
                showLogo={true}
              />
            </div>
          )}

          {/* Rating */}
          {product.rating > 0 && !hideRating && (
            <div className="flex items-center gap-0.5 mb-0.5">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <FiStar
                    key={i}
                    className={`text-[8px] ${i < Math.floor(product.rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                      }`}
                  />
                ))}
              </div>
              <span className="text-[9px] text-gray-600 font-medium">
                {product.rating?.toFixed(1) || '0.0'}
              </span>
              <span className="text-[8px] text-gray-400 ml-0.5">
                ({product.reviewCount || 0})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-bold text-gray-800">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-[9px] text-gray-400 line-through font-medium">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Button Group */}
          <div className="mt-auto flex gap-2">
            {/* Wishlist Button */}
            <motion.button
              ref={buttonRef}
              onClick={handleFavorite}
              data-no-navigate
              whileTap={{ scale: 0.95 }}
              animate={
                isFavorite
                  ? {
                    scale: [1, 1.1, 1],
                  }
                  : {}
              }
              style={{ willChange: "transform", transform: "translateZ(0)" }}
              className={`flex-1 py-1.5 rounded-md font-semibold text-[10px] transition-all duration-300 flex items-center justify-center gap-1 ${isFavorite
                ? "bg-red-50 text-red-500 border border-red-200"
                : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300"
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
                <FiHeart className={`text-xs ${isFavorite ? "fill-current" : ""}`} />
              </motion.div>
              <span>
                {isFavorite ? "In Wishlist" : "Wishlist"}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>

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

export default ProductCard;
