import { useState, useRef, useEffect } from "react";
import { getPlaceholderImage } from "../utils/helpers";
import {
  getOptimizedImagePath,
  getImagePriority,
  getImageLoadingStrategy
} from "../utils/imageOptimization";

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
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState(null);
  const imgRef = useRef(null);

  // Get optimized image path and loading strategy
  const optimizedSrc = getOptimizedImagePath(src, context);
  const loadingStrategy = getImageLoadingStrategy(context);

  useEffect(() => {
    // For high-priority images, load immediately without intersection observer
    if (loadingStrategy.fetchpriority === 'high') {
      setImageSrc(optimizedSrc);
      return;
    }

    // For low-priority images, use lazy loading
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
        rootMargin: "100px", // Start loading 100px before the image enters viewport
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
  }, [optimizedSrc, loadingStrategy.fetchpriority]);

  const handleLoad = () => {
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
      {/* Placeholder/Blur effect */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"></div>
      )}

      {/* Actual Image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${className || ""}`}
          onLoad={handleLoad}
          onError={handleError}
          {...loadingStrategy}
          {...props}
        />
      )}

      {/* Error Fallback - Only show if both original and placeholder failed */}
      {hasError && fallbackSrc && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-400 text-xs">Failed to load</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
