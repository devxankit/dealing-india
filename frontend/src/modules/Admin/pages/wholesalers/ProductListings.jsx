import { useState } from "react";
import { FiSearch, FiCheck, FiX, FiFlag, FiEye } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";

const WholesalerProductListings = () => {
    const [products] = useState([
        { _id: '1', title: 'Premium Cotton T-Shirts', wholesaler: 'Global Wholesale Hub', price: '₹120-180', status: 'Pending', moq: 100 },
        { _id: '2', title: 'Wireless Earbuds', wholesaler: 'TechFlow Electronics', price: '₹450-600', status: 'Approved', moq: 50 },
    ]);

    const columns = [
        { key: "title", label: "Product Name", render: (val) => <span className="font-bold text-gray-800">{val}</span> },
        { key: "wholesaler", label: "Wholesaler" },
        { key: "price", label: "Price Range" },
        { key: "moq", label: "MOQ" },
        {
            key: "status",
            label: "Status",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${val === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                    {val}
                </span>
            )
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><FiEye /></button>
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><FiCheck /></button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><FiX /></button>
                    <button className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"><FiFlag /></button>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Wholesaler Product Listings</h1>
                    <p className="text-gray-500">Monitor and approve wholesale listings.</p>
                </div>
                <div className="relative w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search products..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500" />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <DataTable
                    data={products}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
            </div>
        </motion.div>
    );
};

export default WholesalerProductListings;
