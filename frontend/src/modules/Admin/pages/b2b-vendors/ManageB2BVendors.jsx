import { useState } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiEye, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";

const ManageB2BVendors = () => {
    const [searchQuery, setSearchQuery] = useState("");

    const mockB2BVendors = [
        { _id: '1', companyName: 'Global Wholesale Hub', email: 'contact@globalhub.com', status: 'Active', products: 124, joinDate: '2023-01-15' },
        { _id: '2', companyName: 'Urban Textiles', email: 'sales@urbantex.com', status: 'Pending', products: 0, joinDate: '2023-11-20' },
    ];

    const columns = [
        {
            key: "companyName",
            label: "Company",
            render: (val) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-slate-400" />
                    </div>
                    <span className="font-bold text-gray-800">{val}</span>
                </div>
            )
        },
        { key: "email", label: "Email" },
        {
            key: "status",
            label: "Status",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${val === 'Active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                    {val}
                </span>
            )
        },
        { key: "products", label: "Products" },
        { key: "joinDate", label: "Joined On" },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><FiEye /></button>
                    <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><FiEdit2 /></button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 /></button>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Manage B2B Vendors</h1>
                    <p className="text-gray-500">Search and manage all B2B vendors on the platform.</p>
                </div>
                <div className="relative w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search B2B vendors..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <DataTable
                    data={mockB2BVendors}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
            </div>
        </motion.div>
    );
};

export default ManageB2BVendors;
