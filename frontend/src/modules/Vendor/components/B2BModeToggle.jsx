import { FiRepeat } from "react-icons/fi";
import { useB2BModeStore } from "../store/b2bModeStore";
import { motion } from "framer-motion";

const B2BModeToggle = () => {
    const { isB2BMode, toggleB2BMode } = useB2BModeStore();

    return (
        <button
            onClick={toggleB2BMode}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 border ${isB2BMode
                    ? "bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-200"
                    : "bg-white border-gray-200 text-gray-700 hover:border-primary-400"
                }`}
        >
            <motion.div
                animate={{ rotate: isB2BMode ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 200 }}
            >
                <FiRepeat className={isB2BMode ? "text-white" : "text-primary-600"} />
            </motion.div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">
                {isB2BMode ? "B2B Mode On" : "Switch to B2B"}
            </span>

            {isB2BMode && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
            )}
        </button>
    );
};

export default B2BModeToggle;
