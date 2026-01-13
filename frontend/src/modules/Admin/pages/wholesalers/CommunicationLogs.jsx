import { useState } from "react";
import { FiSearch, FiEye, FiMessageCircle, FiFlag } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";

const WholesalerCommunicationLogs = () => {
    const [logs] = useState([
        { _id: '1', vendor: 'Urban Fashion', wholesaler: 'Global Wholesale Hub', lastMessage: 'Interested in bulk cotton shirts', date: '2023-11-20 10:30' },
        { _id: '2', vendor: 'Tech Hub', wholesaler: 'TechFlow Electronics', lastMessage: 'What is the MOQ for earbuds?', date: '2023-11-20 09:15' },
    ]);

    const columns = [
        { key: "vendor", label: "Vendor" },
        { key: "wholesaler", label: "Wholesaler" },
        { key: "lastMessage", label: "Last Message Snippet", render: (val) => <span className="text-gray-500 italic">"{val}"</span> },
        { key: "date", label: "Timestamp" },
        {
            key: "actions",
            label: "Actions",
            render: () => (
                <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><FiEye /></button>
                    <button className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"><FiFlag /></button>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Communication Logs</h1>
                    <p className="text-gray-500">Monitor B2B interactions for quality and security.</p>
                </div>
                <div className="relative w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search logs..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500" />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <DataTable
                    data={logs}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
            </div>
        </motion.div>
    );
};

export default WholesalerCommunicationLogs;
