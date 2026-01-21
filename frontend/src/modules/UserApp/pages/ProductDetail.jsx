import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  FiStar,
  FiHeart,
  FiShoppingBag,
  FiMinus,
  FiPlus,
  FiArrowLeft,
  FiShare2,
  FiCheckCircle,
  FiArrowDown,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { useCartStore } from "../../../shared/store/useStore";
import { useWishlistStore } from "../../../shared/store/wishlistStore";
import { useSettingsStore } from "../../../shared/store/settingsStore";

import { getProductReviews } from "../../../shared/services/reviewService";
import { getProductById as getProductByIdAPI, getProducts } from "../../../shared/services/productService";
import { formatPrice, calculateTotalStock, validateStockCalculation } from "../../../shared/utils/helpers";
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
  const location = useLocation();
  const preSelectedVariant = location.state?.preSelectedVariant;
  const [product, setProduct] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const formatReviewCount = (count) => {
    if (count >= 1000) return (count / 1000).toFixed(1) + "K+";
    return count;
  };


  const addItem = useCartStore((state) => state.addItem);
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();
  const isFavorite = product ? isInWishlist(product.id) : false;

  // Check if product is out of stock (checks stockQuantity first, then falls back to stock string)
  const isOutOfStock = product
    ? ((product.stockQuantity !== undefined && product.stockQuantity <= 0) || product.stock === "out_of_stock")
    : false;

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Fetch reviews when product loads
  useEffect(() => {
    if (product?.id) {
      const fetchReviews = async () => {
        setReviewsLoading(true);
        try {
          const response = await getProductReviews(product.id);
          if (response && response.reviews) {
            setReviews(response.reviews);
          }
        } catch (error) {
          console.error("Failed to fetch reviews", error);
        } finally {
          setReviewsLoading(false);
        }
      };
      fetchReviews();
    }
  }, [product?.id]);

  // Fetch product from API
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const productData = await getProductByIdAPI(id);

        if (productData) {
          // Transform product data to match frontend format
          const transformedProduct = {
            id: productData._id || productData.id,
            name: productData.name,
            price: productData.price,
            originalPrice: productData.originalPrice,
            image: productData.image,
            images: productData.images || [],
            unit: productData.unit || 'Piece',
            rating: productData.rating || 0,
            reviewCount: productData.reviewCount || 0,
            stock: productData.stock,
            stockQuantity: productData.stockQuantity,
            vendorId: productData.vendorId?._id || productData.vendorId,
            flashSale: productData.flashSale || false,
            variants: productData.variants,
            description: productData.description,
            sizes: productData.sizes || [],
            attributes: productData.attributes || [],
            faqs: productData.faqs || [],
            primaryColorName: productData.primaryColorName,
            primaryColorCode: productData.primaryColorCode,
            brandName: productData.brandName || productData.brandId?.name || '',
            sizeVariants: productData.sizeVariants || [],
          };

          setProduct(transformedProduct);

          // Handle vendor data
          const vendorData = productData.vendorId;
          if (vendorData && typeof vendorData === 'object' && (vendorData._id || vendorData.id)) {
            setVendor({
              id: (vendorData._id || vendorData.id).toString(),
              _id: vendorData._id || vendorData.id,
              storeName: vendorData.storeName || vendorData.businessName || vendorData.name,
              businessName: vendorData.businessName,
              name: vendorData.name,
              storeLogo: vendorData.storeLogo || vendorData.logo,
              isVerified: vendorData.isVerified !== undefined
                ? vendorData.isVerified
                : (vendorData.status === 'approved' || vendorData.isEmailVerified || false),
              rating: vendorData.rating || 0,
              reviewCount: vendorData.reviewCount || 0,
            });
          }

          // Fetch similar products (same category)
          if (productData.categoryId) {
            try {
              const similarResponse = await getProducts({
                categoryId: productData.categoryId._id || productData.categoryId,
                limit: 4,
                vendorType: 'b2c',
              });

              // Transform products to match frontend format (same as Home page)
              const transformProduct = (product) => {
                // Handle vendor data - can be ObjectId or populated object
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
                  variants: product.variants || {},
                  sizeVariants: product.sizeVariants || [],
                  primaryColorName: product.primaryColorName,
                  primaryColorCode: product.primaryColorCode,
                };
              };

              const similar = (similarResponse.data?.products || similarResponse.products || [])
                .filter(p => (p._id || p.id) !== transformedProduct.id)
                .slice(0, 4)
                .map(transformProduct);
              setSimilarProducts(similar);
            } catch (error) {
              console.error('Error fetching similar products:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const { settings, initialize: initializeSettings } = useSettingsStore();

  useEffect(() => {
    initializeSettings();
  }, []);

  const features = settings?.features || {};

  useEffect(() => {
    if (preSelectedVariant) {
      setSelectedVariant(preSelectedVariant);
    } else if (product?.variants?.defaultVariant) {
      setSelectedVariant(product.variants.defaultVariant);
    }
  }, [product, preSelectedVariant]);

  const productImages = useMemo(() => {
    if (!product) return [];

    const images = [];

    // Case 1: Specific color variant selected (colorIndex is 0, 1, 2...)
    if (selectedVariant && product.variants?.colorVariants &&
      selectedVariant.colorIndex !== undefined && selectedVariant.colorIndex !== null) {

      const cv = product.variants.colorVariants[selectedVariant.colorIndex];

      // Add the variant's thumbnail as the primary image
      if (cv?.thumbnailImage) {
        images.push(cv.thumbnailImage);
      } else {
        // Fallback to main image if variant has no thumbnail
        if (product.image) images.push(product.image);
      }

      // Add only this variant's specific gallery images
      if (cv?.images && Array.isArray(cv.images)) {
        cv.images.forEach((vimg) => {
          if (vimg && !images.includes(vimg)) {
            images.push(vimg);
          }
        });
      }
    }
    // Case 2: No variant selected OR Primary Color selected (colorIndex is null)
    else {
      // Main product image
      if (product.image) {
        images.push(product.image);
      }

      // Main product gallery
      if (product.images && product.images.length > 0) {
        product.images.forEach((img) => {
          if (img && !images.includes(img)) {
            images.push(img);
          }
        });
      }
    }

    return images.length > 0 ? images : (product.image ? [product.image] : []);
  }, [product, selectedVariant]);

  const currentPrice = useMemo(() => {
    if (!product) return 0;

    // Root sizeVariants structure
    if (selectedVariant && selectedVariant.isRootSize && product.sizeVariants && product.sizeVariants[selectedVariant.sizeIndex]) {
      const sizeVariant = product.sizeVariants[selectedVariant.sizeIndex];
      if (sizeVariant.price !== null && sizeVariant.price !== undefined) {
        return sizeVariant.price;
      }
    }

    // New colorVariants structure
    if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined && selectedVariant.colorIndex !== null) {
      const colorVariant = product.variants.colorVariants[selectedVariant.colorIndex];
      if (colorVariant && colorVariant.sizeVariants && colorVariant.sizeVariants[selectedVariant.sizeIndex]) {
        const sizeVariant = colorVariant.sizeVariants[selectedVariant.sizeIndex];
        if (sizeVariant.price !== null && sizeVariant.price !== undefined) {
          return sizeVariant.price;
        }
      }
    }

    // Legacy structure support
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

  const currentOriginalPrice = useMemo(() => {
    if (!product) return 0;

    // Root sizeVariants structure
    if (selectedVariant && selectedVariant.isRootSize && product.sizeVariants && product.sizeVariants[selectedVariant.sizeIndex]) {
      const sizeVariant = product.sizeVariants[selectedVariant.sizeIndex];
      // Use variant specific original price if available, otherwise fallback to root
      return sizeVariant.originalPrice || product.originalPrice;
    }

    // New colorVariants structure
    if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined && selectedVariant.colorIndex !== null) {
      const colorVariant = product.variants.colorVariants[selectedVariant.colorIndex];
      if (colorVariant && colorVariant.sizeVariants && colorVariant.sizeVariants[selectedVariant.sizeIndex]) {
        const sizeVariant = colorVariant.sizeVariants[selectedVariant.sizeIndex];
        return sizeVariant.originalPrice || product.originalPrice;
      }
    }

    return product.originalPrice;
  }, [product, selectedVariant]);

  const discount = useMemo(() => {
    const original = currentOriginalPrice;
    const current = currentPrice;
    if (!original || !current || original <= current) return 0;
    return Math.round(((original - current) / original) * 100);
  }, [currentOriginalPrice, currentPrice]);

  if (isLoading) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={false}>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading product...</p>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

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

  const handleBuyNow = () => {
    // Check stock for root size variants
    if (selectedVariant && selectedVariant.isRootSize && product.sizeVariants && product.sizeVariants[selectedVariant.sizeIndex]) {
      const sizeVariant = product.sizeVariants[selectedVariant.sizeIndex];
      if (sizeVariant.stockQuantity === 0 || sizeVariant.stockStatus === 'out_of_stock') {
        toast.error("This size is out of stock");
        return;
      }
    }
    // Check stock for variations
    else if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined && selectedVariant.colorIndex !== null) {
      const colorVariant = product.variants.colorVariants[selectedVariant.colorIndex];
      if (colorVariant && colorVariant.sizeVariants && colorVariant.sizeVariants[selectedVariant.sizeIndex]) {
        const sizeVariant = colorVariant.sizeVariants[selectedVariant.sizeIndex];
        if (sizeVariant.stockQuantity === 0 || sizeVariant.stockStatus === 'out_of_stock') {
          toast.error("This variation is out of stock");
          return;
        }
      }
    } else if (product.stock === "out_of_stock") {
      toast.error("Product is out of stock");
      return;
    }

    let finalPrice = product.price;

    // Root sizeVariants structure
    if (selectedVariant && selectedVariant.isRootSize && product.sizeVariants && product.sizeVariants[selectedVariant.sizeIndex]) {
      const sizeVariant = product.sizeVariants[selectedVariant.sizeIndex];
      if (sizeVariant.price !== null && sizeVariant.price !== undefined) {
        finalPrice = sizeVariant.price;
      }
    }
    // New colorVariants structure
    else if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined && selectedVariant.colorIndex !== null) {
      const colorVariant = product.variants.colorVariants[selectedVariant.colorIndex];
      if (colorVariant && colorVariant.sizeVariants && colorVariant.sizeVariants[selectedVariant.sizeIndex]) {
        const sizeVariant = colorVariant.sizeVariants[selectedVariant.sizeIndex];
        if (sizeVariant.price !== null && sizeVariant.price !== undefined) {
          finalPrice = sizeVariant.price;
        }
      }
    }
    // Legacy structure support
    else if (selectedVariant && product.variants?.prices) {
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

    const buyNowItem = {
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: productImages[0],
      quantity: quantity,
      variant: selectedVariant,
      vendorId: product.vendorId,
    };
    navigate("/app/checkout", { state: { buyNowItem } });
  };

  const handleAddToCart = () => {
    // Check stock for root size variants
    if (selectedVariant && selectedVariant.isRootSize && product.sizeVariants && product.sizeVariants[selectedVariant.sizeIndex]) {
      const sizeVariant = product.sizeVariants[selectedVariant.sizeIndex];
      if (sizeVariant.stockQuantity === 0 || sizeVariant.stockStatus === 'out_of_stock') {
        toast.error("This size is out of stock");
        return;
      }
      if (quantity > sizeVariant.stockQuantity) {
        toast.error(`Only ${sizeVariant.stockQuantity} items available for this size`);
        return;
      }
    }
    // Check stock for new colorVariants structure
    else if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined && selectedVariant.colorIndex !== null) {
      const colorVariant = product.variants.colorVariants[selectedVariant.colorIndex];
      if (colorVariant && colorVariant.sizeVariants && colorVariant.sizeVariants[selectedVariant.sizeIndex]) {
        const sizeVariant = colorVariant.sizeVariants[selectedVariant.sizeIndex];
        if (sizeVariant.stockQuantity === 0 || sizeVariant.stockStatus === 'out_of_stock') {
          toast.error("This variation is out of stock");
          return;
        }
        if (quantity > sizeVariant.stockQuantity) {
          toast.error(`Only ${sizeVariant.stockQuantity} items available for this variation`);
          return;
        }
      }
    } else if (product.stock === "out_of_stock") {
      toast.error("Product is out of stock");
      return;
    }

    let finalPrice = product.price;

    // Root sizeVariants structure
    if (selectedVariant && selectedVariant.isRootSize && product.sizeVariants && product.sizeVariants[selectedVariant.sizeIndex]) {
      const sizeVariant = product.sizeVariants[selectedVariant.sizeIndex];
      if (sizeVariant.price !== null && sizeVariant.price !== undefined) {
        finalPrice = sizeVariant.price;
      }
    }
    // New colorVariants structure
    else if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined && selectedVariant.colorIndex !== null) {
      const colorVariant = product.variants.colorVariants[selectedVariant.colorIndex];
      if (colorVariant && colorVariant.sizeVariants && colorVariant.sizeVariants[selectedVariant.sizeIndex]) {
        const sizeVariant = colorVariant.sizeVariants[selectedVariant.sizeIndex];
        if (sizeVariant.price !== null && sizeVariant.price !== undefined) {
          finalPrice = sizeVariant.price;
        }
      }
    }
    // Legacy structure support
    else if (selectedVariant && product.variants?.prices) {
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
      image: productImages[0] || product.image,
      quantity: quantity,
      variant: selectedVariant,
    });
  };

  const handleFavorite = () => {
    if (features.wishlistEnabled === false) {
      toast.error("Wishlist is currently disabled");
      return;
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

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;

    // Get max quantity based on selected variant
    let maxQuantity = product?.stockQuantity || 10;
    if (selectedVariant && selectedVariant.isRootSize && product.sizeVariants && product.sizeVariants[selectedVariant.sizeIndex]) {
      maxQuantity = product.sizeVariants[selectedVariant.sizeIndex].stockQuantity;
    } else if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined && selectedVariant.colorIndex !== null) {
      const colorVariant = product.variants.colorVariants[selectedVariant.colorIndex];
      if (colorVariant && colorVariant.sizeVariants && colorVariant.sizeVariants[selectedVariant.sizeIndex]) {
        maxQuantity = colorVariant.sizeVariants[selectedVariant.sizeIndex].stockQuantity;
      }
    }

    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  return (
    <PageTransition>
      <MobileLayout showBottomNav={false} showCartBar={true}>
        <div className="w-full pb-24">
          {/* Back Button */}
          <div className="px-4 pt-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
              <FiArrowLeft className="text-xl" />
              <span className="font-medium">Back</span>
            </button>
            {features.wishlistEnabled !== false && (
              <button
                onClick={handleFavorite}
                className={`p-2 rounded-full shadow-md transition-all ${isFavorite ? "bg-red-50 text-red-500" : "bg-white text-gray-400"}`}>
                <FiHeart className={`text-xl ${isFavorite ? "fill-current" : ""}`} />
              </button>
            )}
          </div>

          {/* Product Image */}
          <div className="relative w-full px-4 py-4">
            <ImageGallery images={productImages} productName={product.name} />
            {/* Rating Overlay */}
            {product.rating > 0 && (
              <div className="absolute bottom-10 left-8 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-md border border-gray-100 shadow-sm flex items-center gap-2 z-10 scale-90 origin-bottom-left">
                <span className="text-sm font-black text-gray-800 flex items-center gap-1">
                  {product.rating?.toFixed(0) || '0'} <FiStar className="text-green-600 fill-green-600 w-3.5 h-3.5" />
                </span>
                <span className="text-gray-300 w-[1px] h-3 bg-gray-300"></span>
                <span className="text-xs font-bold text-gray-500">
                  {formatReviewCount(product.reviewCount || 0)}
                </span>
              </div>
            )}

            {product.flashSale && features.flashSaleEnabled !== false && (
              <div className="absolute top-8 right-8 z-10">
                <Badge variant="flash">Flash Sale</Badge>
              </div>
            )}
          </div>

          <div className="px-4">
            {/* Variant Selector (Colors & Sizes) */}
            {(product.variants || (product.sizeVariants && product.sizeVariants.length > 0)) && (
              <div className="mb-6">
                <VariantSelector
                  variants={product.variants || {}}
                  sizeVariants={product.sizeVariants}
                  onVariantChange={setSelectedVariant}
                  currentPrice={product.price}
                  primaryColorName={product.primaryColorName}
                  primaryColorCode={product.primaryColorCode}
                  primaryThumbnail={product.image}
                  initialVariant={preSelectedVariant}
                />
              </div>
            )}

            {/* Brand & Product Info */}
            <div className="mt-8 space-y-1">
              {product.brandName && (
                <h2 className="text-base font-black text-gray-400 uppercase tracking-widest leading-none">
                  {product.brandName}
                </h2>
              )}
              <h1 className="text-lg font-medium text-gray-600 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Sale Badge */}
            <div className="mt-4">
              <div className="bg-[#9c33ff] text-white text-[10px] font-black px-3 py-1.5 rounded-md inline-block uppercase tracking-wider shadow-sm shadow-purple-200">
                Sale Price Live
              </div>
            </div>

            {/* Price Row */}
            <div className="mt-4 flex items-center gap-3">
              {discount > 0 && (
                <div className="flex items-center text-green-600 font-black gap-0.5">
                  <FiArrowDown className="w-5 h-5" />
                  <span className="text-2xl">{discount}%</span>
                </div>
              )}
              {currentOriginalPrice && currentOriginalPrice > currentPrice && (
                <span className="text-xl text-gray-400 line-through font-medium">
                  {formatPrice(Math.round(currentOriginalPrice))}
                </span>
              )}
              <span className="text-4xl font-black text-gray-900">
                {formatPrice(Math.round(currentPrice))}
              </span>
            </div>

            {/* Stock Status */}
            <div className="mt-4 mb-6">
              {product.stock !== "out_of_stock" && (
                <p className={`${product.stock === 'low_stock' ? 'text-orange-600' : 'text-primary-600'} font-bold text-sm flex items-center gap-1.5`}>
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {product.stock === 'low_stock' ? 'Limited Stock' : 'Quality Guaranteed'}
                </p>
              )}
              {product.stock === "out_of_stock" && (
                <p className="text-red-600 font-bold text-sm">
                  ✗ Currently Unavailable
                </p>
              )}
            </div>
          </div>

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
                disabled={(() => {
                  if (selectedVariant?.isRootSize && product.sizeVariants && selectedVariant.sizeIndex !== undefined) {
                    return quantity >= (product.sizeVariants[selectedVariant.sizeIndex]?.stockQuantity || 0);
                  }
                  if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined && selectedVariant.colorIndex !== null) {
                    return quantity >= (product.variants.colorVariants[selectedVariant.colorIndex]?.sizeVariants?.[selectedVariant.sizeIndex]?.stockQuantity || 0);
                  }
                  return quantity >= (product.stockQuantity || 10);
                })()}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <FiPlus className="text-gray-600" />
              </button>
            </div>
          </div>



          {/* Attributes */}
          {product.attributes &&
            product.attributes.filter((attr) => (attr.name && attr.value) || (attr.attributeId && attr.values && attr.values.length > 0)).length >
            0 && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Product Details
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {product.attributes
                    .filter((attr) => (attr.name && attr.value) || (attr.attributeId && attr.values && attr.values.length > 0))
                    .map((attr, index) => {
                      const name = attr.name || attr.attributeName || (attr.attributeId && attr.attributeId.name);
                      const value = attr.value || (attr.values && attr.values.map(v => v.value || v).join(', '));

                      if (!name || !value) return null;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <span className="text-gray-500 text-sm">{name}</span>
                          <span className="text-gray-900 text-sm font-semibold text-right">
                            {value}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              Description
            </h3>
            <p className="text-gray-600 leading-relaxed text-sm mb-6">
              {product.description || `High-quality ${product.name.toLowerCase()} available in ${product.unit.toLowerCase()}. This product is carefully selected to ensure the best quality and freshness. Perfect for your daily needs with excellent value for money.`}
            </p>

            {/* Action Buttons (Moved from floating) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 h-12 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] ${isOutOfStock
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50"
                    }`}>
                  <FiShoppingBag className="text-base" />
                  <span>
                    {isOutOfStock
                      ? "OUT OF STOCK"
                      : "ADD TO CART"}
                  </span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`flex-1 h-12 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] ${isOutOfStock
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "gradient-green text-white"
                    }`}>
                  <span>
                    {isOutOfStock
                      ? "OUT OF STOCK"
                      : "BUY NOW"}
                  </span>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleFavorite}
                  className={`w-12 h-12 rounded-xl transition-all duration-300 flex items-center justify-center flex-shrink-0 border ${isFavorite
                    ? "bg-red-50 text-red-600 border-red-100 shadow-sm"
                    : "bg-gray-50 text-gray-400 border-gray-100"
                    } active:scale-90`}>
                  <FiHeart
                    className={`text-lg ${isFavorite ? "fill-red-600" : ""}`}
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
                  className="w-12 h-12 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl transition-all duration-300 flex items-center justify-center flex-shrink-0 active:scale-90">
                  <FiShare2 className="text-lg" />
                </button>
              </div>
            </div>
          </div>

          {/* FAQs Section */}
          {product.faqs && product.faqs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Frequently Asked Questions
              </h3>
              <div className="space-y-3">
                {product.faqs.map((faq, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-start gap-2">
                      <span className="text-primary-600 font-bold">Q:</span>
                      {faq.question}
                    </h4>
                    <p className="text-gray-600 text-sm flex items-start gap-2">
                      <span className="text-accent-600 font-bold">A:</span>
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Summary */}
          {/* Reviews Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              Customer Reviews ({product.reviewCount || reviews.length || 0})
            </h3>
            {reviewsLoading ? (
              <div className="text-center py-4 text-gray-500">Loading reviews...</div>
            ) : reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review._id || review.id} className="bg-gray-50 rounded-xl p-3">
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
                        {review.userId?.name || review.customerName || 'Customer'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{review.review}</p>
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {review.images.map((img, idx) => (
                          <img key={idx} src={img} alt="Review" className="w-16 h-16 object-cover rounded-lg" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No reviews yet. Be the first to review!</p>
            )}
          </div>

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
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileProductDetail;
