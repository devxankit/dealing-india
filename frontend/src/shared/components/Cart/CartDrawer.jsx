import { useEffect, useState, useRef, useMemo } from "react";
import {
  FiX,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiShoppingBag,
  FiHeart,
  FiAlertCircle,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, useUIStore } from "../../store/useStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { useAuthStore } from "../../store/authStore";
import { formatPrice } from "../../utils/helpers";
import { Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import useSwipeGesture from "../../../modules/UserApp/hooks/useSwipeGesture";

// Swipeable Cart Item Component
const SwipeableCartItem = ({ item, onUpdateQuantity, onRemove, onSaveForLater }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleted, setIsDeleted] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const deletedItemRef = useRef(null);

  // Only animate on mount
  useEffect(() => {
    setHasAnimated(true);
  }, []);

  const handleSwipeRight = () => {
    setIsDeleted(true);
    deletedItemRef.current = { ...item };
    onRemove(item.id);
    toast.success("Item removed", {
      duration: 3000,
      action: {
        label: "Undo",
        onClick: () => {
          if (deletedItemRef.current) {
            const { addItem: addToCart } = useCartStore.getState();
            addToCart(deletedItemRef.current);
            setIsDeleted(false);
            deletedItemRef.current = null;
          }
        },
      },
    });
  };

  const swipeHandlers = useSwipeGesture({
    onSwipeRight: handleSwipeRight,
    threshold: 100,
  });

  // Update offset based on swipe state
  useEffect(() => {
    if (swipeHandlers.swipeState.isSwiping) {
      setSwipeOffset(Math.max(0, swipeHandlers.swipeState.offset));
    } else if (!swipeHandlers.swipeState.isSwiping && swipeOffset < 100) {
      setSwipeOffset(0);
    }
  }, [swipeHandlers.swipeState.isSwiping, swipeHandlers.swipeState.offset]);

  const isLowStock = item.stock === "low_stock";
  const stockQuantity = item.stockQuantity || 0;
  const isMaxQuantity = item.quantity >= stockQuantity;

  if (isDeleted) return null;

  return (
    <motion.div
      initial={hasAnimated ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, x: Number.isFinite(swipeOffset) ? swipeOffset : 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
      className="relative"
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchMove={swipeHandlers.onTouchMove}
      onTouchEnd={swipeHandlers.onTouchEnd}>
      <div className="flex gap-4 p-4 bg-gray-50 rounded-xl relative">
        {/* Delete Background */}
        {swipeOffset > 0 && (
          <div className="absolute inset-0 bg-red-500 rounded-xl flex items-center justify-end pr-4">
            <FiTrash2 className="text-white text-xl" />
          </div>
        )}

        {/* Product Image */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 relative z-10">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0 relative z-10">
          <h3 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">
            {item.name}
          </h3>
          <p className="text-sm font-bold text-primary-600 mb-2">
            {formatPrice(item.price)}
          </p>

          {/* Stock Warning */}
          {isLowStock && (
            <div className="flex items-center gap-1 text-xs text-orange-600 mb-2">
              <FiAlertCircle className="text-xs" />
              <span>Only {stockQuantity} left!</span>
            </div>
          )}

          {/* Quantity Controls */}
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity, -1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
              <FiMinus className="text-xs text-gray-600" />
            </button>
            <motion.span
              key={item.quantity}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{ willChange: "transform", transform: "translateZ(0)" }}
              className="text-sm font-semibold text-gray-800 min-w-[2rem] text-center">
              {item.quantity}
            </motion.span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity, 1)}
              disabled={isMaxQuantity}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${isMaxQuantity
                ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-50"
                : "bg-white border-gray-300 hover:bg-gray-50"
                }`}>
              <FiPlus className="text-xs text-gray-600" />
            </button>
            <button
              onClick={() => onRemove(item.id)}
              className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <FiTrash2 className="text-sm" />
            </button>
          </div>
          {/* Save for Later Button */}
          <button
            onClick={() => onSaveForLater(item)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-pink-50 text-pink-600 rounded-lg font-medium hover:bg-pink-100 transition-colors text-sm">
            <FiHeart className="text-sm" />
            Save for Later
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const CartDrawer = () => {
  const location = useLocation();
  // Check if we're in the mobile app section
  const isMobileApp = location.pathname.startsWith("/app");
  const checkoutLink = isMobileApp ? "/app/checkout" : "/checkout";
  const { isCartOpen, toggleCart } = useUIStore();
  const {
    items,
    removeItem,
    updateQuantity,
    getTotal,
    clearCart,
    getItemsByVendor,
    initialize,
  } = useCartStore();
  const { addItem: addToWishlist } = useWishlistStore();
  const total = getTotal();

  // Initialize cart from backend when component mounts (only if user is authenticated)
  const { isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    // Only initialize cart if user is authenticated
    if (isAuthenticated) {
    initialize();
    } else {
      // If not authenticated, ensure cart is empty and initialized
      useCartStore.setState({ items: [], isInitialized: true, isLoading: false });
    }
  }, [initialize, isAuthenticated]);

  // Group items by vendor
  const itemsByVendor = useMemo(
    () => getItemsByVendor(),
    [items, getItemsByVendor]
  );

  // Prevent body scroll when cart is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflowY = "hidden";
    } else {
      document.body.style.overflowY = "";
    }
    return () => {
      document.body.style.overflowY = "";
    };
  }, [isCartOpen]);

  const handleQuantityChange = (id, currentQuantity, change) => {
    const item = items.find((i) => i.id === id);
    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }

    if (item && newQuantity > (item.stockQuantity || 0)) {
      toast.error(`Only ${item.stockQuantity} items available in stock`);
      return;
    }

    updateQuantity(id, newQuantity);
  };

  const handleSaveForLater = (item) => {
    addToWishlist({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
    });
    removeItem(item.id);
    toast.success("Saved for later!");
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="fixed inset-0 bg-black/50 z-[10000]"
          />

          {/* Cart Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(event, info) => {
              if (info.offset.x > 200) {
                toggleCart();
              }
            }}
            style={{ willChange: "transform", transform: "translateZ(0)" }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[10000] flex flex-col">
            {/* Drag Handle (Mobile Only) */}
            {isMobileApp && (
              <div className="flex justify-center pt-3 pb-2 sm:hidden">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Shopping Cart</h2>
              <button
                onClick={toggleCart}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <FiX className="text-xl text-gray-600" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FiShoppingBag className="text-6xl text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium mb-2">
                    Your cart is empty
                  </p>
                  <p className="text-sm text-gray-400">
                    Add some items to get started!
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  <div className="space-y-6">
                    {itemsByVendor.map((vendorGroup, vendorIndex) => (
                      <div key={vendorGroup.vendorId} className="space-y-3">
                        {/* Vendor Header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200/50 shadow-sm">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                            <FiShoppingBag className="text-white text-xs" />
                          </div>
                          <span className="text-sm font-bold text-primary-700 flex-1">
                            {vendorGroup.vendorName}
                          </span>
                          <span className="text-xs font-semibold text-primary-600 bg-white px-2 py-1 rounded-md">
                            {formatPrice(vendorGroup.subtotal)}
                          </span>
                        </div>
                        {/* Vendor Items */}
                        <div className="space-y-3 pl-2">
                          {vendorGroup.items.map((item) => (
                            <SwipeableCartItem
                              key={item.id}
                              item={item}
                              onUpdateQuantity={handleQuantityChange}
                              onRemove={removeItem}
                              onSaveForLater={handleSaveForLater}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>

            {/* Compact Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 p-4 bg-white/95 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Amount</span>
                  <span className="text-xl font-bold text-primary-600 tracking-tight">
                    {formatPrice(total)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    to={checkoutLink}
                    onClick={toggleCart}
                    className="w-full h-11 bg-transparent border-2 border-primary-600 text-primary-600 rounded-[1.25rem] font-bold text-xs tracking-wider flex items-center justify-center active:scale-[0.98] transition-all hover:bg-primary-50">
                    PROCEED TO CHECKOUT
                  </Link>
                  <button
                    onClick={clearCart}
                    className="w-full py-1 text-[9px] text-gray-300 hover:text-red-400 font-bold uppercase tracking-[0.2em] transition-colors">
                    Clear Cart
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
