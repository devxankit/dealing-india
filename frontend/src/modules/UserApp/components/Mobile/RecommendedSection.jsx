import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiThumbsUp, FiArrowRight } from "react-icons/fi";
import ProductCard from "../../../../shared/components/ProductCard";
import { getRecommendedProducts } from '../../../../data/products';

const RecommendedSection = () => {
  const recommended = useMemo(() => getRecommendedProducts(6), []);

  if (recommended.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-5 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/40 rounded-2xl mx-2">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-md">
            <FiThumbsUp className="text-white text-lg" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 leading-tight">
              Recommended for You
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Curated just for you</p>
          </div>
        </div>
        <Link
          to="/app/search"
          className="flex items-center gap-1 text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors active:scale-95">
          <span>See All</span>
          <FiArrowRight className="text-sm" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        {recommended.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0 w-36"
            style={{ minWidth: "144px" }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedSection;
