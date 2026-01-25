import { useState, useEffect } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiEye, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import B2BVendorDetailModal from "./components/B2BVendorDetailModal";
import { useB2BVendorManagementStore } from "../../store/b2bVendorManagementStore";
import toast from "react-hot-toast";
import useDebounce from "../../../../shared/hooks/useDebounce";

const ManageB2BVendors = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { b2bVendors, isLoading, fetchB2BVendors } = useB2BVendorManagementStore();

    useEffect(() => {
        const loadVendors = async () => {
            try {
                await fetchB2BVendors({
                    status: 'all',
                    search: debouncedSearchQuery,
                    page: 1,
                    limit: 100,
                });
            } catch (error) {
                // Error toast is shown by API interceptor
            }
        };

        loadVendors();
    }, [debouncedSearchQuery, fetchB2BVendors]);

    const handleViewDetails = (vendor) => {
        setSelectedVendor(vendor);
        setIsModalOpen(true);
    };

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
                    <button
                        onClick={() => handleViewDetails(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Full Details"
                    >
                        <FiEye />
                    </button>
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
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading B2B vendors...</p>
                    </div>
                ) : b2bVendors.length > 0 ? (
                    <DataTable
                        data={b2bVendors}
                        columns={columns}
                        pagination={true}
                        itemsPerPage={10}
                    />
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No B2B vendors found</p>
                    </div>
                )}
            </div>

            <B2BVendorDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                vendor={selectedVendor}
            />
        </motion.div>
    );
};

export default ManageB2BVendors;
