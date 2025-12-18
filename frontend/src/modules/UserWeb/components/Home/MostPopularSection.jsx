import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { gsapAnimations } from "../../../../shared/utils/animations";
import ProductCard from "../../../../shared/components/ProductCard";
import { getMostPopular } from "../../../../data/products";

const MostPopularSection = () => {
  const sectionRef = useRef(null);
  const products = getMostPopular();

  useEffect(() => {
    if (sectionRef.current) {
      gsapAnimations.scrollReveal(sectionRef.current);
    }
  }, []);

  return (
    <section ref={sectionRef} className="py-16 md:py-0 bg-transparent relative">
      {/* Desktop Layout - White card container with horizontal scroll */}
      <div className="hidden md:block bg-white rounded-lg mb-4 p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Most Popular</h2>
        </div>
        <div
          className="overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="flex gap-4 min-w-max pb-2">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex-shrink-0"
                style={{ width: "216px" }}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Layout - Unchanged */}
      <div className="md:hidden container mx-auto px-2 sm:px-4 relative">
        <div className="flex items-center justify-between mb-10 relative z-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gradient relative z-20">
            Most Popular
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 relative z-[1]">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}>
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MostPopularSection;
