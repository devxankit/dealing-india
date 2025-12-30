import { useState, useEffect } from 'react';

/**
 * Hook to calculate the height of the mobile header
 * This is useful for adding padding-top to mobile page content
 */
const useMobileHeaderHeight = () => {
  // Default to a closer estimate of the full header (Logo + Search + Icons)
  // 64px (base) + 50px (search) + 70px (icons/padding) ≈ 184px
  const [headerHeight, setHeaderHeight] = useState(184);

  useEffect(() => {
    const calculateHeight = () => {
      const header = document.querySelector('header[class*="fixed"]');

      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    // Initial calculation
    calculateHeight();

    // Recalculate on resize
    window.addEventListener('resize', calculateHeight);

    // Recalculate after delays to ensure elements are rendered
    const timeoutId = setTimeout(calculateHeight, 100);
    const timeoutId2 = setTimeout(calculateHeight, 500);

    return () => {
      window.removeEventListener('resize', calculateHeight);
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, []);

  return headerHeight;
};

export default useMobileHeaderHeight;
