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

import { getProductReviews } from "../../../shared/services/reviewService";
import { getProductById as getProductByIdAPI, getProducts } from "../../../shared/services/productService";
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
  const [product, setProduct] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const addItem = useCartStore((state) => state.addItem);
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();
  const isFavorite = product ? isInWishlist(product.id) : false;

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
            brandName: productData.brandName || productData.brandId?.name || '',

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

  useEffect(() => {
    if (product?.variants?.defaultVariant) {
      setSelectedVariant(product.variants.defaultVariant);
    }
  }, [product]);

  const productImages = useMemo(() => {
    if (!product) return [];
    return product.images && product.images.length > 0
      ? product.images
      : [product.image];
  }, [product]);

  const currentPrice = useMemo(() => {
    if (!product) return 0;

    // New colorVariants structure
    if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined) {
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
    // Check stock for variations
    if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined) {
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

    // New colorVariants structure
    if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined) {
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
    // Check stock for new colorVariants structure
    if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined) {
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

    // New colorVariants structure
    if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined) {
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

    // Get max quantity based on selected variant
    let maxQuantity = product?.stockQuantity || 10;
    if (selectedVariant && product.variants?.colorVariants && selectedVariant.colorIndex !== undefined && selectedVariant.sizeIndex !== undefined) {
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
            {product.rating > 0 && (
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
                  {product.rating?.toFixed(1) || '0.0'} ({product.reviewCount || 0} reviews)
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

            {/* Unit & Brand */}
            <div className="flex items-center gap-4 mb-4">
              <p className="text-gray-600 text-sm">Unit: {product.unit}</p>
              {product.brandName && (
                <p className="text-gray-600 text-sm border-l border-gray-300 pl-4">
                  Brand: <span className="font-semibold text-gray-800">{product.brandName}</span>
                </p>
              )}
            </div>

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

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Available Sizes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm border border-gray-200">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
                    disabled={product.stock === "out_of_stock"}
                    className={`flex-1 h-12 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] ${product.stock === "out_of_stock"
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50"
                      }`}>
                    <FiShoppingBag className="text-base" />
                    <span>
                      {product.stock === "out_of_stock"
                        ? "OUT OF STOCK"
                        : "ADD TO CART"}
                    </span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={product.stock === "out_of_stock"}
                    className={`flex-1 h-12 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] ${product.stock === "out_of_stock"
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "gradient-green text-white"
                      }`}>
                    <span>
                      {product.stock === "out_of_stock"
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
        </div>


      </MobileLayout>
    </PageTransition>
  );
};

export default MobileProductDetail;
