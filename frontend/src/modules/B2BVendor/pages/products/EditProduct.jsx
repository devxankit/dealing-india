import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import B2BVendorProductForm from "../../components/ProductForm";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);

    useEffect(() => {
        const loadProduct = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/b2b-vendor/products/${id}`);
                
                if (response.success && response.data?.product) {
                    const productData = response.data.product;
                    
                    // Extract category and subcategory from attributes
                    const categoryAttr = productData.attributes?.find(attr => attr.name === 'category');
                    const subcategoryAttr = productData.attributes?.find(attr => attr.name === 'subcategory');
                    const bulkPricingAttr = productData.attributes?.find(attr => attr.name === 'bulkPricing');
                    
                    // Extract specifications (excluding category, subcategory, bulkPricing)
                    const specifications = productData.attributes?.filter(attr => 
                        !['category', 'subcategory', 'bulkPricing'].includes(attr.name)
                    ) || [];
                    
                    // Parse bulk pricing if exists
                    let bulkPricing = [{ minQty: "", price: "" }];
                    if (bulkPricingAttr?.value) {
                        try {
                            bulkPricing = JSON.parse(bulkPricingAttr.value);
                        } catch (e) {
                            console.error('Failed to parse bulk pricing:', e);
                        }
                    }
                    
                    // Determine availability from stock
                    let availability = "In Stock";
                    if (productData.stock === 'out_of_stock') {
                        availability = "Out of Stock";
                    } else if (productData.stock === 'pre_order') {
                        availability = "Available on Order";
                    }
                    
                    // Prepare images array
                    const images = [];
                    if (productData.image) images.push(productData.image);
                    if (productData.images && productData.images.length > 0) {
                        images.push(...productData.images);
                    }
                    
                    setProduct({
                        name: productData.name || "",
                        category: categoryAttr?.value || "",
                        subcategory: subcategoryAttr?.value || "",
                        price: productData.price || "",
                        moq: productData.minimumOrderQuantity || 1,
                        brand: productData.brandName || "",
                        availability: availability,
                        description: productData.description || "",
                        images: images,
                        specifications: specifications.length > 0 
                            ? specifications.map(spec => ({ name: spec.name, value: spec.value }))
                            : [{ name: "", value: "" }],
                        bulkPricing: bulkPricing.length > 0 ? bulkPricing : [{ minQty: "", price: "" }],
                    });
                } else {
                    toast.error("Product not found");
                    navigate("/b2b-vendor/products/manage-products");
                }
            } catch (error) {
                console.error('Error loading product:', error);
                toast.error("Failed to load product");
                navigate("/b2b-vendor/products/manage-products");
            } finally {
                setLoading(false);
            }
        };
        
        if (id) {
            loadProduct();
        }
    }, [id, navigate]);

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

            {product && <B2BVendorProductForm isEdit={true} initialData={product} productId={id} />}
        </motion.div>
    );
};

export default EditProduct;
