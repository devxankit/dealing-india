import B2BVendorProductForm from "../../components/ProductForm";
import { motion } from 'framer-motion';

const AddProduct = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto space-y-6"
        >
            <div className="px-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Add New Listing</h1>
                <p className="text-sm text-gray-500 font-medium">Create a new product listing for your B2B catalog.</p>
            </div>

            <B2BVendorProductForm isEdit={false} />
        </motion.div>
    );
};

export default AddProduct;
