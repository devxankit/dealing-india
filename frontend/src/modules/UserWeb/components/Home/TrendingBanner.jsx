import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { gsapAnimations } from "../../../../shared/utils/animations";
import LazyImage from "../../../../shared/components/LazyImage";
import heroBanner2 from "../../../../../data/hero/banner2.png";

const TrendingBanner = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    if (sectionRef.current) {
      gsapAnimations.scrollReveal(sectionRef.current);
    }
  }, []);

  return (
    <section ref={sectionRef} className="py-4 sm:py-8 md:py-0 bg-transparent">
      {/* Desktop Layout - White card container */}
      <div className="hidden md:block bg-white rounded-lg mb-4 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative w-full overflow-hidden rounded-lg"
          style={{ aspectRatio: "41/22" }}>
          <LazyImage
            src={heroBanner2}
            alt="Trending Items Banner"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/1200x300?text=Banner";
            }}
          />
        </motion.div>
      </div>

      {/* Mobile Layout - Unchanged */}
      <div className="md:hidden container mx-auto px-2 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-[1366px] mx-auto h-[180px] xs:h-[220px] sm:h-[300px] md:h-[400px] lg:h-[450px] xl:h-[500px] overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl shadow-lg sm:shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <LazyImage
            src={heroBanner2}
            alt="Trending Items Banner"
            className="w-full h-full object-cover object-center sm:object-cover"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/1200x300?text=Banner";
            }}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default TrendingBanner;
