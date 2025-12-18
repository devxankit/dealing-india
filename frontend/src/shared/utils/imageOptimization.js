// Image optimization utilities for different contexts

// Image loading priorities
export const IMAGE_PRIORITIES = {
  HERO: 'high',
  PRODUCT_DETAIL: 'high',
  PRODUCT_LISTING: 'low',
  THUMBNAIL: 'low'
};

// Image formats by priority
export const IMAGE_FORMATS = {
  high: ['webp', 'avif', 'png', 'jpg'],
  low: ['webp', 'png', 'jpg']
};

// Get optimized image path based on context
export const getOptimizedImagePath = (originalPath, context = 'listing') => {
  if (!originalPath) return originalPath;

  // For hero images, use compressed versions if available
  if (context === 'hero' && originalPath.includes('/hero/')) {
    const filename = originalPath.split('/').pop();
    const compressedPath = originalPath.replace('.png', '_compressed.webp');

    // Check if compressed version exists (client-side check)
    if (typeof window !== 'undefined') {
      // For now, return original - compressed versions need to be created manually
      return originalPath;
    }
    return originalPath;
  }

  // For product listings, use compressed versions if available
  if (context === 'product-listing' && originalPath.includes('/products/')) {
    const filename = originalPath.split('/').pop();
    const compressedPath = originalPath.replace('.png', '_listing.webp');

    // Check if compressed version exists (client-side check)
    if (typeof window !== 'undefined') {
      // For now, return original - compressed versions need to be created manually
      return originalPath;
    }
    return originalPath;
  }

  // For product detail, use original high-quality
  return originalPath;
};

// Get loading priority based on context
export const getImagePriority = (context) => {
  switch (context) {
    case 'hero':
    case 'product-detail':
      return 'high';
    case 'product-listing':
    case 'thumbnail':
    default:
      return 'low';
  }
};

// Get image loading strategy
export const getImageLoadingStrategy = (context) => {
  switch (context) {
    case 'hero':
      return { loading: 'eager', fetchpriority: 'high', decoding: 'sync' };
    case 'product-detail':
      return { loading: 'eager', fetchpriority: 'high', decoding: 'async' };
    case 'product-listing':
    case 'thumbnail':
    default:
      return { loading: 'lazy', fetchpriority: 'low', decoding: 'async' };
  }
};

// Generate responsive image sources
export const getResponsiveImageSources = (originalPath, context) => {
  if (!originalPath) return null;

  const basePath = originalPath.replace(/\.(png|jpg|jpeg|webp|avif)$/i, '');
  const sources = [];

  // For high-priority images, provide multiple formats
  if (context === 'hero' || context === 'product-detail') {
    sources.push(
      { src: `${basePath}.avif`, type: 'image/avif' },
      { src: `${basePath}.webp`, type: 'image/webp' },
      { src: `${basePath}.png`, type: 'image/png' }
    );
  } else {
    // For low-priority, just WebP fallback
    sources.push(
      { src: `${basePath}.webp`, type: 'image/webp' },
      { src: `${basePath}.png`, type: 'image/png' }
    );
  }

  return sources;
};
