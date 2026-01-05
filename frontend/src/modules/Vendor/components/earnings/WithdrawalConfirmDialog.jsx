import { FiAlertCircle, FiArrowRight, FiLoader } from "react-icons/fi";
import { motion } from "framer-motion";
import { formatPrice } from "../../../../shared/utils/helpers";

const WithdrawalConfirmDialog = ({ amount, onClose, onConfirm, isLoading }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden relative"
            >
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiAlertCircle size={40} className="text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirm Withdrawal</h3>
                    <p className="text-gray-500">
                        Are you sure you want to withdraw your entire available balance?
                    </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-center border border-gray-100">
                    <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold mb-1">Amount to Transfer</p>
                    <p className="text-4xl font-extrabold text-indigo-700">{formatPrice(amount)}</p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                    >
                        {isLoading ? (
                            <FiLoader className="animate-spin" size={20} />
                        ) : (
                            <>
                                <span>Yes, Proceed to Withdraw</span>
                                <FiArrowRight size={20} />
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-4 text-gray-500 font-semibold hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                </div>

                {/* Info Box */}
                <div className="mt-6 flex gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <FiAlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        Requests are usually processed within 2-3 business days. Funds will be sent to your registered bank account.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default WithdrawalConfirmDialog;
