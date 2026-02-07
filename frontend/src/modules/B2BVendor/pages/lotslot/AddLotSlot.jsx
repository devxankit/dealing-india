import LotSlotForm from "../../components/LotSlotForm";
import { motion } from 'framer-motion';

const AddLotSlot = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Add New Lot/Slot</h1>
                <p className="text-gray-500">Create a new lot or slot listing for bulk buyers.</p>
            </div>

            <LotSlotForm isEdit={false} />
        </motion.div>
    );
};

export default AddLotSlot;
