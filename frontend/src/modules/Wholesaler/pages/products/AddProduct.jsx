import { motion } from "framer-motion";
import WholesalerProductForm from "../../components/ProductForm";

const AddProduct = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Add New Listing</h1>
                <p className="text-gray-500">Create a new product listing for your B2B catalog.</p>
            </div>

            <WholesalerProductForm isEdit={false} />
        </motion.div>
    );
};

export default AddProduct;
