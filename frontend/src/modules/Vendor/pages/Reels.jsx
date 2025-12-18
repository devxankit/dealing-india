import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiVideo,
  FiPlus,
  FiList,
} from "react-icons/fi";

const Reels = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      path: "/vendor/reels/all-reels",
      label: "All Reels",
      icon: FiList,
      gradient: "from-blue-500 via-blue-600 to-blue-700",
      lightGradient: "from-blue-50 via-blue-100/80 to-blue-50",
      shadowColor: "shadow-blue-500/20",
      hoverShadow: "hover:shadow-blue-500/30",
      description: "View and manage your reels",
    },
    {
      path: "/vendor/reels/add-reel",
      label: "Add Reel",
      icon: FiPlus,
      gradient: "from-green-500 via-green-600 to-green-700",
      lightGradient: "from-green-50 via-green-100/80 to-green-50",
      shadowColor: "shadow-green-500/20",
      hoverShadow: "hover:shadow-green-500/30",
      description: "Create a new reel",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Reels Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your product reels and video content
          </p>
        </div>
      </div>

      {/* Menu Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(item.path)}
              className={`
                relative group cursor-pointer rounded-2xl p-6 sm:p-8
                bg-gradient-to-br ${item.lightGradient}
                border border-gray-200 dark:border-gray-700
                ${item.shadowColor} ${item.hoverShadow}
                shadow-lg transition-all duration-300
                hover:scale-[1.02] hover:-translate-y-1
                active:scale-[0.98]
              `}
            >
              {/* Icon */}
              <div
                className={`
                  w-14 h-14 sm:w-16 sm:h-16 rounded-xl
                  bg-gradient-to-br ${item.gradient}
                  flex items-center justify-center
                  ${item.shadowColor} shadow-lg
                  mb-4 group-hover:scale-110 transition-transform duration-300
                `}
              >
                <Icon className="text-white text-2xl sm:text-3xl" />
              </div>

              {/* Content */}
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                {item.label}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {item.description}
              </p>

              {/* Hover Effect Overlay */}
              <div
                className={`
                  absolute inset-0 rounded-2xl
                  bg-gradient-to-br ${item.gradient}
                  opacity-0 group-hover:opacity-5
                  transition-opacity duration-300
                `}
              />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default Reels;

