import { useState } from "react";
import { FiAlertCircle, FiArrowRight, FiLoader, FiCreditCard } from "react-icons/fi";
import { motion } from "framer-motion";
import { formatPrice } from "../../../../shared/utils/helpers";

const WithdrawalConfirmDialog = ({ amount, onClose, onConfirm, isLoading }) => {
    const [method, setMethod] = useState("bank"); // 'bank' | 'upi'
    const [formData, setFormData] = useState({
        accountName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        upiId: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isFormValid = () => {
        if (method === "bank") {
            return (
                formData.accountName.trim() !== "" &&
                formData.accountNumber.trim() !== "" &&
                formData.ifscCode.trim() !== "" &&
                formData.bankName.trim() !== ""
            );
        } else {
            return formData.upiId.trim() !== "";
        }
    };

    const handleSubmit = () => {
        if (!isFormValid()) return;

        // Filter data based on method
        const submissionData = method === "bank"
            ? {
                method: "bank",
                accountName: formData.accountName,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode,
                bankName: formData.bankName
            }
            : {
                method: "upi",
                upiId: formData.upiId
            };

        onConfirm(submissionData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto"
            >
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Withdraw Details</h3>
                    <p className="text-gray-500 text-sm">
                        Please provide your payment details for the transfer.
                    </p>
                </div>

                <div className="bg-indigo-50 rounded-xl p-4 mb-6 text-center border border-indigo-100">
                    <p className="text-xs text-indigo-400 uppercase tracking-wider font-semibold mb-1">Withdrawing Amount</p>
                    <p className="text-3xl font-extrabold text-indigo-700">{formatPrice(amount)}</p>
                </div>

                {/* Method Selection */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                    <button
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${method === "bank" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
                        onClick={() => setMethod("bank")}
                    >
                        Bank Transfer
                    </button>
                    <button
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${method === "upi" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
                        onClick={() => setMethod("upi")}
                    >
                        UPI
                    </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 mb-6">
                    {method === "bank" ? (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Account Holder Name</label>
                                <input
                                    type="text"
                                    name="accountName"
                                    value={formData.accountName}
                                    onChange={handleChange}
                                    placeholder="e.g. John Doe"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    name="bankName"
                                    value={formData.bankName}
                                    onChange={handleChange}
                                    placeholder="e.g. HDFC Bank"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number</label>
                                <input
                                    type="text"
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleChange}
                                    placeholder="e.g. 1234567890"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">IFSC Code</label>
                                <input
                                    type="text"
                                    name="ifscCode"
                                    value={formData.ifscCode}
                                    onChange={handleChange}
                                    placeholder="e.g. HDFC0001234"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors uppercase"
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">UPI ID</label>
                            <input
                                type="text"
                                name="upiId"
                                value={formData.upiId}
                                onChange={handleChange}
                                placeholder="e.g. john@okaxis"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !isFormValid()}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100"
                    >
                        {isLoading ? (
                            <FiLoader className="animate-spin" size={20} />
                        ) : (
                            <>
                                <span>Send Withdrawal Request</span>
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
            </motion.div>
        </div>
    );
};

export default WithdrawalConfirmDialog;
