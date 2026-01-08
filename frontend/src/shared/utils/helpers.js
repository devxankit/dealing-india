/**
 * Format price with currency symbol
 */
export const formatPrice = (price, currency = "₹") => {
  const numPrice = price ?? 0;
  return `${currency}${numPrice.toLocaleString("en-IN")}`;
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text, length = 50) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Calculate discount percentage
 */
export const calculateDiscount = (originalPrice, discountedPrice) => {
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};

/**
 * Validate email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Indian format)
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
};

/**
 * Get image URL (with fallback)
 */
export const getImageUrl = (image, fallback = "/placeholder.jpg") => {
  if (!image) return fallback;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_IMAGE_BASE_URL || ""}${image}`;
};

/**
 * Generate a placeholder image as SVG data URI
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} text - Text to display on placeholder
 * @param {string} bgColor - Background color (hex or color name)
 * @param {string} textColor - Text color (hex or color name)
 * @returns {string} SVG data URI
 */
export const getPlaceholderImage = (
  width = 200,
  height = 200,
  text = "Image",
  bgColor = "#e5e7eb",
  textColor = "#9ca3af"
) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${Math.min(width, height) / 8}" 
        fill="${textColor}" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >${text}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Calculate total stock quantity for a product
 * Aggregates main product stock and all variant stocks
 */
export const calculateTotalStock = (product) => {
  if (!product) return 0;
  const mainStock = parseInt(product.stockQuantity) || 0;
  const primaryColorName = (product.primaryColorName || product?.variants?.defaultVariant?.color || '').toString().trim().toLowerCase();
  let variantSum = 0;
  let primaryVariantSum = 0;
  if (product.variants?.colorVariants && Array.isArray(product.variants.colorVariants)) {
    product.variants.colorVariants.forEach((cv) => {
      const cvColor = (cv.color || cv.colorName || '').toString().trim().toLowerCase();
      const cvTotal = cv.sizeVariants?.reduce((sizeAcc, sv) => sizeAcc + (parseInt(sv.stockQuantity) || 0), 0) || 0;
      variantSum += cvTotal;
      if (!primaryVariantSum && primaryColorName && cvColor === primaryColorName) {
        primaryVariantSum = cvTotal;
      }
    });
    if (!primaryVariantSum && mainStock > 0) {
      const candidateSum = product.variants.colorVariants.reduce((found, cv) => {
        if (found) return found;
        const sum = cv.sizeVariants?.reduce((acc, sv) => acc + (parseInt(sv.stockQuantity) || 0), 0) || 0;
        return sum === mainStock ? sum : 0;
      }, 0);
      primaryVariantSum = candidateSum || 0;
    }
    // Guard: if variants sum equals main, treat as same entity
    if (primaryVariantSum === 0 && variantSum === mainStock) {
      return mainStock;
    }
  }
  return mainStock + Math.max(variantSum - primaryVariantSum, 0);
};

/**
 * Format date
 */
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const validateStockCalculation = (product) => {
  const mainStock = parseInt(product?.stockQuantity) || 0;
  const totals = (product?.variants?.colorVariants || []).map((cv) => {
    return cv.sizeVariants?.reduce((acc, sv) => acc + (parseInt(sv.stockQuantity) || 0), 0) || 0;
  });
  const variantSum = totals.reduce((a, b) => a + b, 0);
  const total = calculateTotalStock(product);
  let isConsistent = false;
  const pName = (product?.primaryColorName || '').toString().trim().toLowerCase();
  if (pName) {
    const idx = (product?.variants?.colorVariants || []).findIndex((cv) => {
      const cvColor = (cv.color || cv.colorName || '').toString().trim().toLowerCase();
      return cvColor === pName;
    });
    const pSum = idx >= 0 ? totals[idx] : 0;
    isConsistent = total === mainStock + (variantSum - pSum);
  } else {
    isConsistent = variantSum === mainStock ? total === mainStock : total === mainStock + variantSum;
  }
  return { mainStock, variantSum, total, isConsistent };
};

/**
 * Format video URL for better compatibility (Cloudinary specific)
 */
export const formatVideoUrl = (url) => {
  if (!url) return "";
  if (url.includes("cloudinary.com")) {
    if (url.includes('/video/upload/')) {
      let formattedUrl = url;
      if (!url.includes('f_auto')) {
        formattedUrl = url.replace('/video/upload/', '/video/upload/f_auto,q_auto/');
      }
      // Replace unsupported extensions with .mp4
      return formattedUrl.replace(/\.(avi|mov|mkv|flv|wmv)$/i, '.mp4');
    }
  }
  return url;
};
