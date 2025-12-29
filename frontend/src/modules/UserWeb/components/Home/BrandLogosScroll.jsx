import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useBrandStore } from '../../../../shared/store/brandStore';
import LazyImage from '../../../../shared/components/LazyImage';

const BrandLogosScroll = () => {
  const { brands, initialize, isLoading } = useBrandStore();
  const [displayBrands, setDisplayBrands] = useState([]);
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isTouching, setIsTouching] = useState(false);

  useEffect(() => {
    const loadBrands = async () => {
      await initialize();
      const activeBrands = brands.filter(brand => brand.isActive !== false);
      setDisplayBrands(activeBrands);
    };
    loadBrands();

    const refreshInterval = setInterval(async () => {
      const { refreshBrands } = useBrandStore.getState();
      if (refreshBrands) {
        await refreshBrands();
        const updatedBrands = useBrandStore.getState().brands;
        const activeBrands = updatedBrands.filter(brand => brand.isActive !== false);
        setDisplayBrands(activeBrands);
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [initialize, brands]);

  // Triple the brands to ensure we have enough content to scroll seamlessly
  // [Set 1] [Set 2] [Set 3]
  // We scroll from 0 to width of [Set 1]. When we pass [Set 1], we are at start of [Set 2] (which looks like Set 1).
  // Then we instantly jump back to 0.
  const marqueeBrands = [...displayBrands, ...displayBrands, ...displayBrands];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || displayBrands.length === 0) return;

    let animationFrameId;

    const scroll = () => {
      // Don't auto-scroll if user is interacting
      if (isPaused || isTouching) {
        animationFrameId = requestAnimationFrame(scroll);
        return;
      }

      // 1/3 of total width (width of a single set)
      const singleSetWidth = scrollContainer.scrollWidth / 3;

      // If we've scrolled past the first set, reset to 0 (plus the remainder)
      if (scrollContainer.scrollLeft >= singleSetWidth) {
        scrollContainer.scrollLeft -= singleSetWidth;
      } else {
        // Scroll speed
        scrollContainer.scrollLeft += 0.8;
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [displayBrands.length, isPaused, isTouching]);

  if (isLoading && displayBrands.length === 0) return null;
  if (displayBrands.length === 0) return null;

  return (
    <section className="bg-transparent w-full overflow-hidden py-2">
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={() => setIsTouching(true)}
        onTouchEnd={() => setIsTouching(false)}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex gap-4 w-max px-4">
          {marqueeBrands.map((brand, index) => (
            <div
              key={`${brand.id}-${index}`}
              className="flex-shrink-0 flex flex-col items-center"
              style={{
                width: 'clamp(5rem, 20vw, 6rem)',
              }}
            >
              <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 mb-2 w-full aspect-square flex items-center justify-center">
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="w-[80%] h-[80%] object-contain pointer-events-none select-none"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/120x80?text=Brand';
                  }}
                  loading="lazy"
                />
              </div>
              <p className="text-xs font-semibold text-gray-800 text-center truncate w-full px-1">
                {brand.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandLogosScroll;


