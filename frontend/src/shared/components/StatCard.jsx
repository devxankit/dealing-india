import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color = "bg-blue-500", 
  bgColor = "bg-blue-50", 
  textColor = "text-blue-700",
  link,
  onClick 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (link) {
      navigate(link);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={`${bgColor} rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow ${
        link || onClick ? 'cursor-pointer' : ''
      }`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className={`${color} p-2 rounded-lg`}>
          <Icon className="text-white text-lg" />
        </div>
        {(link || onClick) && (
          <FiArrowRight className={`${textColor} text-sm`} />
        )}
      </div>
      <h3 className={`${textColor} text-xs font-medium mb-0.5`}>
        {label}
      </h3>
      <p className={`${textColor} text-xl font-bold`}>
        {value}
      </p>
    </motion.div>
  );
};

export default StatCard;

