import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiThumbsUp, FiArrowRight } from "react-icons/fi";
import ProductCard from "../../../../shared/components/ProductCard";
import { getRecommendedProducts } from '../../../../shared/services/productService';

const RecommendedSection = () => {
  const [recommended, setRecommended] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommended = async () => {
      try {
        setIsLoading(true);
        const products = await getRecommendedProducts(6);
        setRecommended(products || []);
      } catch (error) {
        console.error('Error fetching recommended products:', error);
        setRecommended([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommended();
  }, []);

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (recommended.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Recommended for You
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">Curated just for you</p>
        </div>
        <Link
          to="/app/search"
          className="flex items-center gap-1 text-sm text-green-600 font-semibold hover:text-green-700 transition-colors">
          <span>See All</span>
          <FiArrowRight className="text-sm" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
        {recommended.slice(0, 6).map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedSection;
