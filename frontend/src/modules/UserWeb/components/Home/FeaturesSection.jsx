import { useRef, useEffect } from "react";
import { FiHeart, FiTruck, FiShield, FiHeadphones } from "react-icons/fi";
import { motion } from "framer-motion";
import { gsapAnimations } from "../../../../shared/utils/animations";

const FeaturesSection = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    if (sectionRef.current) {
      gsapAnimations.scrollReveal(sectionRef.current);
    }
  }, []);

  const features = [
    {
      id: 1,
      icon: FiHeart,
      title: "Quality & Savings",
      description: "Comprehensive quality control and affordable prices",
    },
    {
      id: 2,
      icon: FiTruck,
      title: "Fast Delivery",
      description: "Fast and convenient door to door delivery",
    },
    {
      id: 3,
      icon: FiShield,
      title: "Secure Payment",
      description: "Different secure payment methods",
    },
    {
      id: 4,
      icon: FiHeadphones,
      title: "Professional Service",
      description: "Efficient customer support from passionate team",
    },
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-0 bg-transparent">
      {/* Desktop Layout - White card container */}
      <div className="hidden md:block bg-white rounded-lg mb-4 p-4">
        <div className="grid grid-cols-4 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-gray-50 rounded-lg p-6 text-center hover-lift group cursor-pointer">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 gradient-green rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow-green transition-all duration-300 group-hover:scale-110">
                    <Icon className="text-white text-2xl" />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-600">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile Layout - Unchanged */}
      <div className="md:hidden container mx-auto px-2 sm:px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="glass-card rounded-2xl p-4 sm:p-6 md:p-8 text-center hover-lift group cursor-pointer">
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 gradient-green rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-glow-green transition-all duration-300 group-hover:scale-110">
                    <Icon className="text-white text-2xl sm:text-3xl" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-800 mb-2 sm:mb-3 group-hover:text-gradient transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
