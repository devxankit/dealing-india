import B2BVendorProductForm from "../../components/ProductForm";
import ShopProductForm from "../../components/ShopProductForm";
import { motion } from 'framer-motion';
import { useVendorSettings } from "../../hooks/useVendorSettings";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const AddProduct = ({ forceShop = false }) => {
    const { settings, loading } = useVendorSettings();
    const navigate = useNavigate();

    const handleShopSubmit = async (formData) => {
        try {
            await api.post('/b2b-vendor/products', formData);
            toast.success("Shop listing published successfully");
            navigate("/b2b-vendor/products/manage-products");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to publish shop listing");
        }
    };

    if (loading && !forceShop) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const isShopListing = forceShop || settings?.productFormType === 'shop-listing';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto space-y-6"
        >
            <div className="px-1 text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                    {isShopListing ? "Create Shop Listing" : "Add New Listing"}
                </h1>
                <p className="text-sm text-gray-500 font-medium">
                    {isShopListing ? "List your shop unit and items for B2B buyers." : "Create a new product listing for your B2B catalog."}
                </p>
            </div>

            {isShopListing ? (
                <ShopProductForm onSubmit={handleShopSubmit} />
            ) : (
                <B2BVendorProductForm isEdit={false} />
            )}
        </motion.div>
    );
};

export default AddProduct;

