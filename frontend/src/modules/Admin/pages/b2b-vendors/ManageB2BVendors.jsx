import { useState, useEffect } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiEye, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import B2BVendorDetailModal from "./components/B2BVendorDetailModal";
import { useB2BVendorManagementStore } from "../../store/b2bVendorManagementStore";
import toast from "react-hot-toast";
import useDebounce from "../../../../shared/hooks/useDebounce";
import api from "../../../../shared/utils/api";

const ManageB2BVendors = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { b2bVendors, isLoading, fetchB2BVendors, deleteB2BVendor } = useB2BVendorManagementStore();

    const handleApprove = async (id) => {
        if (!id) return;
        const toastId = toast.loading("Approving vendor...");
        try {
            const response = await api.put(`/admin/vendors/${id}/status`, {
                status: 'approved'
            });

            if (response.success) {
                toast.success("B2B Vendor approved successfully!", { id: toastId });
                // Refresh list
                fetchB2BVendors({
                    status: 'all',
                    search: debouncedSearchQuery,
                    page: 1,
                    limit: 100,
                });
            } else {
                throw new Error(response.message || 'Failed to approve vendor');
            }
        } catch (error) {
            console.error('Error approving vendor:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to approve vendor', { id: toastId });
        }
    };

    const handleReject = async (id) => {
        if (!id) return;
        const toastId = toast.loading("Rejecting vendor...");
        try {
            const response = await api.put(`/admin/vendors/${id}/status`, {
                status: 'rejected'
            });

            if (response.success) {
                toast.success("B2B Vendor rejected successfully!", { id: toastId });
                // Refresh list
                fetchB2BVendors({
                    status: 'all',
                    search: debouncedSearchQuery,
                    page: 1,
                    limit: 100,
                });
            } else {
                throw new Error(response.message || 'Failed to reject vendor');
            }
        } catch (error) {
            console.error('Error rejecting vendor:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to reject vendor', { id: toastId });
        }
    };

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

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this B2B vendor? This action cannot be undone.")) {
            return;
        }

        const toastId = toast.loading("Deleting vendor...");
        try {
            await deleteB2BVendor(id);
            toast.success("B2B Vendor deleted successfully", { id: toastId });
        } catch (error) {
            console.error('Error deleting vendor:', error);
            toast.error(error.message || "Failed to delete vendor", { id: toastId });
        }
    };

    const columns = [
        {
            key: "companyName",
            label: "Company",
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-slate-400" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800">{val || row.storeName || row.name || 'N/A'}</p>
                        <p className="text-xs text-gray-400 font-medium">{row.name}</p>
                    </div>
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
        { key: "products", label: "Products", render: (val) => val || 0 },
        {
            key: "joinDate",
            label: "Joined On",
            render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
        },
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
                    <button
                        onClick={() => handleDelete(row._id || row.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete Vendor"
                    >
                        <FiTrash2 />
                    </button>
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
                onApprove={() => {
                    handleApprove(selectedVendor?._id || selectedVendor?.id);
                    setIsModalOpen(false);
                }}
                onReject={() => {
                    handleReject(selectedVendor?._id || selectedVendor?.id);
                    setIsModalOpen(false);
                }}
            />
        </motion.div>
    );
};

export default ManageB2BVendors;
