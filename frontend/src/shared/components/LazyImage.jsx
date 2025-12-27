import { useState, useRef, useEffect } from "react";
import { getPlaceholderImage } from "../utils/helpers";
import {
  getOptimizedImagePath,
  getImagePriority,
  getImageLoadingStrategy
} from "../utils/imageOptimization";

// Global cache to track loaded images prevents flickering on scroll
const loadedImages = new Set();

const LazyImage = ({
  src,
  alt,
  className,
  onError,
  placeholderWidth = 200,
  placeholderHeight = 200,
  placeholderText,
  context = 'listing', // 'hero', 'product-detail', 'product-listing', 'thumbnail'
  ...props
}) => {
  // Get optimized image path and loading strategy
  const optimizedSrc = getOptimizedImagePath(src, context);
  const loadingStrategy = getImageLoadingStrategy(context);
  const isPriority = loadingStrategy.fetchpriority === 'high';
  const isCached = loadedImages.has(optimizedSrc);

  const [imageSrc, setImageSrc] = useState(isPriority || isCached ? optimizedSrc : null);
  const [isLoaded, setIsLoaded] = useState(isCached);
  const [hasError, setHasError] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    // If already set (from cache or priority), skip observer
    if (imageSrc === optimizedSrc) return;

    // For low-priority images that aren't cached, use lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(optimizedSrc);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Increased margin to load earlier
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
      observer.disconnect();
    };
  }, [optimizedSrc, imageSrc]);

  const handleLoad = () => {
    // Mark as loaded in global cache
    if (optimizedSrc) loadedImages.add(optimizedSrc);
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = (e) => {
    // If we haven't tried a fallback yet, use the placeholder
    if (!fallbackSrc) {
      const placeholder = getPlaceholderImage(
        placeholderWidth,
        placeholderHeight,
        placeholderText || alt || "Image"
      );
      setFallbackSrc(placeholder);
      setImageSrc(placeholder);
      setHasError(false);
      setIsLoaded(false);
      return;
    }

    // If fallback also failed, show error state
    setHasError(true);
    setIsLoaded(false);
    if (onError) {
      onError(e);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className || ""}`} ref={imgRef}>
      {/* Placeholder/Blur effect - Only show if not loaded */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}

      {/* Actual Image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"
            } ${className || ""}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={isPriority ? "eager" : "lazy"}
          {...props}
        />
      )}

      {/* Error Fallback - Only show if both original and placeholder failed */}
      {hasError && fallbackSrc && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-xs">Failed</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
