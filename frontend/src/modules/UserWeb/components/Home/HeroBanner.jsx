import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import LazyImage from "../../../../shared/components/LazyImage";
import heroSlide1 from "../../../../../data/hero/slide1.png";
import heroSlide2 from "../../../../../data/hero/slide2.png";
import heroSlide3 from "../../../../../data/hero/slide3.png";
import heroSlide4 from "../../../../../data/hero/slide4.png";

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef(null);

  const slides = [
    {
      image: heroSlide1,
    },
    {
      image: heroSlide2,
    },
    {
      image: heroSlide3,
    },
    {
      image: heroSlide4,
    },
  ];

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <>
      {/* Desktop Layout - White card wrapper with proper aspect ratio */}
      <div className="hidden md:block bg-white rounded-lg mb-4 p-4">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-lg"
          data-carousel
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "211/35",
            overflow: "hidden",
          }}>
          {/* Slider Container - All slides in a row */}
          <motion.div
            className="flex h-full"
            style={{
              width: `${slides.length * 100}%`,
              height: "100%",
            }}
            animate={{
              x: `-${currentSlide * (100 / slides.length)}%`,
            }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.46, 0.45, 0.94], // Smooth easing
              type: "tween",
            }}>
            {slides.map((slide, index) => (
              <div
                key={index}
                className="flex-shrink-0"
                style={{
                  width: `${100 / slides.length}%`,
                  height: "100%",
                }}>
                {index === 0 ? (
                  <img
                    src={slide.image}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                    loading="eager"
                    onError={(e) => {
                      console.error(`Failed to load image: ${slide.image}`);
                      e.target.src = `https://via.placeholder.com/1200x650?text=Slide+${
                        index + 1
                      }`;
                    }}
                  />
                ) : (
                  <LazyImage
                    src={slide.image}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                    onError={(e) => {
                      console.error(`Failed to load image: ${slide.image}`);
                      e.target.src = `https://via.placeholder.com/1200x650?text=Slide+${
                        index + 1
                      }`;
                    }}
                  />
                )}
              </div>
            ))}
          </motion.div>

          {/* Carousel Indicators */}
          <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "bg-white w-8 shadow-lg"
                    : "bg-white/50 w-2 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Layout - Unchanged */}
      <div className="md:hidden container mx-auto px-2 sm:px-4 overflow-x-hidden w-full">
        <div
          ref={containerRef}
          className="relative w-full max-w-[1366px] mx-auto h-[200px] sm:h-[300px] md:h-[400px] lg:h-[500px] xl:h-[550px] overflow-hidden rounded-2xl sm:rounded-3xl my-4 sm:my-6 lg:my-2 shadow-2xl"
          data-carousel
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "1366px",
            overflow: "hidden",
          }}>
          {/* Slider Container - All slides in a row */}
          <motion.div
            className="flex h-full"
            style={{
              width: `${slides.length * 100}%`,
              height: "100%",
            }}
            animate={{
              x: `-${currentSlide * (100 / slides.length)}%`,
            }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.46, 0.45, 0.94], // Smooth easing
              type: "tween",
            }}>
            {slides.map((slide, index) => (
              <div
                key={index}
                className="flex-shrink-0"
                style={{
                  width: `${100 / slides.length}%`,
                  height: "100%",
                }}>
                {index === 0 ? (
                  <img
                    src={slide.image}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                    loading="eager"
                    onError={(e) => {
                      console.error(`Failed to load image: ${slide.image}`);
                      e.target.src = `https://via.placeholder.com/1200x650?text=Slide+${
                        index + 1
                      }`;
                    }}
                  />
                ) : (
                  <LazyImage
                    src={slide.image}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                    onError={(e) => {
                      console.error(`Failed to load image: ${slide.image}`);
                      e.target.src = `https://via.placeholder.com/1200x650?text=Slide+${
                        index + 1
                      }`;
                    }}
                  />
                )}
              </div>
            ))}
          </motion.div>

          {/* Carousel Indicators */}
          <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "bg-white w-8 shadow-lg"
                    : "bg-white/50 w-2 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default HeroBanner;
