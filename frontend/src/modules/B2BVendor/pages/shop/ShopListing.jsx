import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHome, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";
import ShopListingForm from "../../components/ShopListingForm";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { FiLock, FiArrowRight } from "react-icons/fi";

const ShopListing = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const { status, loading: subLoading, fetchStatus, hasActiveSubscription, refreshStatus } = useSubscriptionStore();
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const init = async () => {
            await fetchStatus();
            setInitializing(false);
        };
        init();
    }, [fetchStatus]);

    if ((subLoading || initializing) && !status) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold mt-4 text-sm uppercase tracking-widest">Loading status...</p>
            </div>
        );
    }

    if (!hasActiveSubscription() && !status?.isEligibleForShopListing) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm max-w-2xl mx-auto"
            >
                <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                    <FiLock className="text-5xl text-primary-600" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-3">Subscription Needed</h2>
                <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium text-lg leading-relaxed">
                    To list your shop and showcase your business, you need an active subscription plan.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full px-8">
                    <button
                        onClick={() => navigate('/b2b-vendor/subscription')}
                        className="flex-1 w-full flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 uppercase tracking-widest text-sm"
                    >
                        Purchase A Plan <FiArrowRight />
                    </button>
                </div>
            </motion.div>
        );
    }

    const handleShopSubmit = async (payload) => {
        setSubmitting(true);
        try {
            const response = await api.post('/b2b-vendor/shop-units', payload);
            if (response.success) {
                toast.success(response.data?._id ? "Shop updated successfully!" : "Shop created successfully!");
                // Refresh subscription status to update hasShop across the app
                await refreshStatus();
                // Increment refreshKey to force re-fetch in ShopListingForm
                setRefreshKey(prev => prev + 1);
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

            <ShopListingForm
                key={refreshKey}
                onSubmit={handleShopSubmit}
                isLoading={submitting}
            />
        </motion.div>
    );
};

export default ShopListing;
