import { useState } from "react";
import { FiSearch, FiMessageCircle, FiTrash2, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import toast from "react-hot-toast";

const VendorList = () => {
    const [searchQuery, setSearchQuery] = useState("");

    // Mock vendors data
    const [vendors, setVendors] = useState([
        { _id: '1', storeName: 'Urban Fashion Store', email: 'urban@example.com', phone: '9876543210', totalOrders: 15, status: 'Active' },
        { _id: '2', storeName: 'Tech Hub', email: 'techhub@example.com', phone: '9876543211', totalOrders: 8, status: 'Active' },
    ]);

    const columns = [
        {
            key: "storeName",
            label: "Vendor Store",
            sortable: true,
            render: (value) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-slate-400" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800">{value}</p>
                    </div>
                </div>
            ),
        },
        {
            key: "email",
            label: "Contact Email",
        },
        {
            key: "totalOrders",
            label: "Inquiries/Orders",
            sortable: true,
        },
        {
            key: "status",
            label: "Status",
            render: (value) => (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">
                    {value}
                </span>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg" title="Message Vendor">
                        <FiMessageCircle />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Remove Connection">
                        <FiTrash2 />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">My Vendors</h1>
                <p className="text-gray-500">Manage your B2B relationships with registered vendors.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500"
                        />
                    </div>
                </div>

                <DataTable
                    data={vendors.filter(v => v.storeName.toLowerCase().includes(searchQuery.toLowerCase()))}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
            </div>
        </motion.div>
    );
};

export default VendorList;
