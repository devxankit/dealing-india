import { useState } from 'react';
import B2BVendorProductForm from "../../components/ProductForm";
import { motion } from 'framer-motion';
import { useVendorSettings } from "../../hooks/useVendorSettings";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import SubscriptionGate from '../../components/SubscriptionGate';
import QuotaBanner from '../../components/QuotaBanner';

const AddProduct = () => {
    const { settings, loading } = useVendorSettings();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const getTitle = () => {
        return "Add New Listing";
    };

    const getSubtitle = () => {
        return "Create a new product listing for your B2B catalog.";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto space-y-6"
        >
            <div className="px-1 text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                    {getTitle()}
                </h1>
                <p className="text-sm text-gray-500 font-medium pb-6">
                    {getSubtitle()}
                </p>
                <div className="max-w-2xl mx-auto">
                    <QuotaBanner action="product" />
                </div>
            </div>

            <SubscriptionGate action="product" showLimitInfo={false}>
                <B2BVendorProductForm isEdit={false} />
            </SubscriptionGate>
        </motion.div>
    );
};

export default AddProduct;
