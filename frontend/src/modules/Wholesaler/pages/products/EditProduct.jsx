import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import WholesalerProductForm from "../../components/ProductForm";

const EditProduct = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);

    useEffect(() => {
        // Mock fetch product
        const loadProduct = async () => {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setProduct({
                id,
                name: "Premium Cotton T-Shirts",
                category: "Clothing",
                basePrice: 250,
                moq: 100,
                description: "High-quality cotton t-shirts for bulk purchase.",
                image: "https://via.placeholder.com/300",
                specifications: [
                    { name: "Material", value: "100% Cotton" },
                    { name: "GSM", value: "180" }
                ],
                bulkPricing: [
                    { minQty: "500", price: "230" },
                    { minQty: "1000", price: "210" }
                ],
            });
            setLoading(false);
        };
        loadProduct();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Edit Listing</h1>
                <p className="text-gray-500">Update your product details and B2B pricing.</p>
            </div>

            <WholesalerProductForm isEdit={true} initialData={product} />
        </motion.div>
    );
};

export default EditProduct;
