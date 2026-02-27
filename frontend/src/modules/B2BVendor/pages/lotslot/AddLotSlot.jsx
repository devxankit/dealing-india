import LotSlotForm from "../../components/LotSlotForm";
import { motion } from 'framer-motion';
import SubscriptionGate from "../../components/SubscriptionGate";

const AddLotSlot = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto space-y-6"
        >
            <div className="px-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Add New Lot/Slot</h1>
                <p className="text-sm text-gray-500 font-medium">Create a new lot or slot listing for bulk buyers.</p>
            </div>

            <SubscriptionGate action="lotslot" showLimitInfo={false}>
                <LotSlotForm isEdit={false} />
            </SubscriptionGate>
        </motion.div>
    );
};

export default AddLotSlot;
