import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHome, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";
import ShopListingForm from "../../components/ShopListingForm";
import { useSubscriptionStore } from "../../store/subscriptionStore";

const ShopListing = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const { refreshStatus } = useSubscriptionStore();

    const handleShopSubmit = async (payload) => {
        setSubmitting(true);
        try {
            const response = await api.post('/b2b-vendor/shop-units', payload);
            if (response.success) {
                toast.success(response.data?._id ? "Shop updated successfully!" : "Shop created successfully!");
                // Refresh subscription status to update hasShop across the app
                await refreshStatus();
                // Stay on the same page so vendor can see updated data
            } else {
                toast.error(response.message || "Failed to save shop details");
            }
        } catch (err) {
            console.error("Error saving shop:", err);
            toast.error(err?.message || "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-white rounded-xl hover:bg-slate-50 transition-all shadow-sm border border-gray-100"
                >
                    <FiArrowLeft size={18} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-2">
                        <FiHome className="text-primary-600" />
                        Shop Listing
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">Create or update your shop profile details.</p>
                </div>
            </div>

            <ShopListingForm
                onSubmit={handleShopSubmit}
                isLoading={submitting}
            />
        </motion.div>
    );
};

export default ShopListing;
