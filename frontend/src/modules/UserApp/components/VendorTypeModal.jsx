import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiBriefcase, FiShoppingBag } from 'react-icons/fi';

const VendorTypeModal = ({ isOpen, onClose, onSelectVendorType, userEmail, userName }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[99999] backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }}
            animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }}
            exit={{ scale: 0.9, opacity: 0, x: "-50%", y: "-50%" }}
            className="fixed top-1/2 left-1/2 w-[90%] max-w-md bg-white rounded-2xl p-6 z-[100000] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Become a Seller</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-6">
              Choose the type of seller account you want to create:
            </p>

            {/* Options */}
            <div className="space-y-3">
              {/* B2B Vendor Option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectVendorType('b2b')}
                className="w-full p-4 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl text-white shadow-lg hover:shadow-xl transition-all text-left flex items-center gap-4 group"
              >
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-colors">
                  <FiBriefcase className="text-2xl" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-base mb-1">B2B Vendor</h4>
                  <p className="text-xs text-gray-300">
                    Wholesale & bulk business
                  </p>
                </div>
                <div className="text-white/50 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>

              {/* Regular Vendor Option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectVendorType('vendor')}
                className="w-full p-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl text-white shadow-lg hover:shadow-xl transition-all text-left flex items-center gap-4 group"
              >
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-colors">
                  <FiShoppingBag className="text-2xl" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-base mb-1">Vendor</h4>
                  <p className="text-xs text-blue-200">
                    Retail & individual seller
                  </p>
                </div>
                <div className="text-white/50 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VendorTypeModal;
