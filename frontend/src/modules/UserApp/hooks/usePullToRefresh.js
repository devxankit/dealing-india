import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for pull-to-refresh functionality
 * @param {Function} onRefresh - Callback function to execute on refresh
 * @param {Object} options - Configuration options
 * @param {Number} options.threshold - Distance in pixels to trigger refresh (default: 80)
 * @param {Number} options.resistance - Resistance factor for pull (default: 2.5)
 * @returns {Object} - State and refs for pull-to-refresh
 */
const usePullToRefresh = (onRefresh, options = {}) => {
  const { threshold = 80, resistance = 2.5 } = options;
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const elementRef = useRef(null);

  // Keep latest callback to avoid re-binding listeners
  const onRefreshLatest = useRef(onRefresh);
  useEffect(() => {
    onRefreshLatest.current = onRefresh;
  }, [onRefresh]);

  // Refs for mutable state in event handlers
  const stateRef = useRef({
    startY: 0,
    currentY: 0,
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0
  });

  // Sync state variables to ref for external access if needed (though we set them in handlers)
  useEffect(() => {
    stateRef.current.isPulling = isPulling;
    stateRef.current.isRefreshing = isRefreshing;
  }, [isPulling, isRefreshing]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e) => {
      // Don't start if already refreshing
      if (stateRef.current.isRefreshing) return;

      const touch = e.touches[0];
      stateRef.current.startY = touch.clientY;
      stateRef.current.currentY = touch.clientY;

      // Only enable pull if we are at the top
      if (element.scrollTop <= 0) {
        stateRef.current.isPulling = true;
        setIsPulling(true);
      } else {
        stateRef.current.isPulling = false;
        setIsPulling(false);
      }
    };

    const handleTouchMove = (e) => {
      if (!stateRef.current.isPulling || stateRef.current.isRefreshing) return;

      const touch = e.touches[0];
      stateRef.current.currentY = touch.clientY;
      const deltaY = stateRef.current.currentY - stateRef.current.startY;

      // If pulling down
      if (deltaY > 0 && element.scrollTop <= 0) {
        if (e.cancelable) {
          e.preventDefault(); // Critical: prevent native scroll
        }

        const distance = Math.min(deltaY / resistance, threshold * 1.5);
        stateRef.current.pullDistance = distance;
        setPullDistance(distance);
      } else {
        // If scrolling up or not pulling, let native scroll happen and reset
        stateRef.current.isPulling = false;
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!stateRef.current.isPulling || stateRef.current.isRefreshing) return;

      if (stateRef.current.pullDistance >= threshold) {
        setIsRefreshing(true);
        stateRef.current.isRefreshing = true;
        setPullDistance(threshold);

        Promise.resolve(onRefreshLatest.current()).finally(() => {
          setTimeout(() => {
            setIsRefreshing(false);
            stateRef.current.isRefreshing = false;
            setPullDistance(0);
            setIsPulling(false);
            stateRef.current.isPulling = false;
            stateRef.current.pullDistance = 0;
          }, 300);
        });
      } else {
        setPullDistance(0);
        setIsPulling(false);
        stateRef.current.isPulling = false;
        stateRef.current.pullDistance = 0;
      }

      stateRef.current.startY = 0;
      stateRef.current.currentY = 0;
    };

    // Attach listeners. Passive: false is required for touchmove to preventDefault.
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, resistance]);

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    elementRef
  };
};

export default usePullToRefresh;

