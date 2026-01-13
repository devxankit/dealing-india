import { useState } from "react";
import { FiSearch, FiMessageCircle, FiFilter, FiPackage } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../../Admin/components/DataTable";

const B2BInquiries = () => {
    const [searchQuery, setSearchQuery] = useState("");

    const inquiries = [
        { _id: '1', wholesaler: 'Global Wholesale Hub', product: 'Premium Cotton T-Shirts', moq: 100, status: 'Pending', date: '2023-11-20' },
        { _id: '2', wholesaler: 'TechFlow Electronics', product: 'Wireless Earbuds', moq: 50, status: 'Approved', date: '2023-11-18' },
    ];

    const columns = [
        {
            key: "wholesaler",
            label: "Wholesaler",
            render: (val) => <span className="font-bold text-gray-800">{val}</span>
        },
        { key: "product", label: "Product" },
        { key: "moq", label: "Requested Qty" },
        {
            key: "status",
            label: "Status",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${val === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
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
                <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg">
                    <FiMessageCircle />
                </button>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My B2B Inquiries</h1>
                    <p className="text-gray-500">Track and manage your requests to wholesalers.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search inquiries..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <DataTable
                    data={inquiries}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
            </div>
        </motion.div>
    );
};

export default B2BInquiries;
