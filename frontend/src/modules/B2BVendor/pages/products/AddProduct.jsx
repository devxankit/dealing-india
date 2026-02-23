import { useState } from 'react';
import B2BVendorProductForm from "../../components/ProductForm";
import ShopProductForm from "../../components/ShopProductForm";
import ItemListingForm from "../../components/ItemListingForm";
import { motion } from 'framer-motion';
import { useVendorSettings } from "../../hooks/useVendorSettings";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const AddProduct = ({ forceShop = false, forceItemListing = false }) => {
    const { settings, loading } = useVendorSettings();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const handleShopSubmit = async (formData) => {
        setSubmitting(true);
        try {
            await api.post('/b2b-vendor/products', formData);
            toast.success("Item listing published successfully");
            navigate("/b2b-vendor/products/manage-products");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to publish item listing");
        } finally {
            setSubmitting(false);
        }
    };

    const handleItemSubmit = async (formData) => {
        setSubmitting(true);
        try {
            await api.post('/b2b-vendor/products', formData);
            toast.success("Item listing published successfully");
            navigate("/b2b-vendor/products/manage-products");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to publish item listing");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !forceShop && !forceItemListing) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const isShopListing = forceShop || settings?.productFormType === 'shop-listing';
    const isItemListing = forceItemListing;

    // Determine which form to render:
    // 1. If forceItemListing – show ItemListingForm (items only, no shop fields)
    // 2. If forceShop or productFormType=shop-listing – show legacy ShopProductForm (backward compat)
    // 3. Otherwise – show standard ProductForm

    const getTitle = () => {
        if (isItemListing) return "Add Item Listing";
        if (isShopListing) return "Create Item Listing";
        return "Add New Listing";
    };

    const getSubtitle = () => {
        if (isItemListing) return "Add items to your shop for B2B buyers.";
        if (isShopListing) return "List your items for B2B buyers.";
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
                <p className="text-sm text-gray-500 font-medium">
                    {getSubtitle()}
                </p>
            </div>

            {isItemListing ? (
                <ItemListingForm onSubmit={handleItemSubmit} isLoading={submitting} />
            ) : isShopListing ? (
                <ShopProductForm onSubmit={handleShopSubmit} isLoading={submitting} />
            ) : (
                <B2BVendorProductForm isEdit={false} />
            )}
        </motion.div>
    );
};

export default AddProduct;
