import { useState } from "react";
import { FiSearch, FiAlertCircle, FiMessageCircle, FiCheckCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";

const DisputeResolution = () => {
    const [disputes] = useState([
        { _id: '1', vendor: 'Urban Fashion', b2bVendor: 'Global Wholesale Hub', subject: 'Quality Mismatch', status: 'Open', date: '2023-11-20' },
        { _id: '2', vendor: 'Tech Hub', b2bVendor: 'TechFlow Electronics', subject: 'Late Delivery', status: 'Resolved', date: '2023-11-15' },
    ]);

    const columns = [
        { key: "vendor", label: "Vendor" },
        { key: "b2bVendor", label: "B2B Vendor" },
        { key: "subject", label: "Subject" },
        {
            key: "status",
            label: "Status",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${val === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {val}
                </span>
            )
        },
        { key: "date", label: "Date" },
        {
            key: "actions",
            label: "Actions",
            render: () => (
                <div className="flex items-center gap-2">
                    <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><FiMessageCircle /></button>
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><FiCheckCircle /></button>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dispute Resolution</h1>
                    <p className="text-gray-500">Manage and resolve issues between vendors and B2B vendors.</p>
                </div>
                <div className="relative w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search disputes..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500" />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <DataTable
                    data={disputes}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
            </div>
        </motion.div>
    );
};

export default DisputeResolution;
