import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiTrash2, FiEye, FiUser, FiToggleLeft, FiToggleRight, FiArrowUpRight } from "react-icons/fi";
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
    const { b2bVendors, isLoading, fetchB2BVendors, deleteB2BVendor, toggleB2BVendorActive } = useB2BVendorManagementStore();
    const fetchedRef = useRef(false);

    const handleApprove = async (id) => {
        if (!id) return;
        const toastId = toast.loading("Approving vendor...");
        try {
            const response = await api.put(`/admin/b2b-vendors/${id}/status`, {
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
            const response = await api.put(`/admin/b2b-vendors/${id}/status`, {
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

        if (!fetchedRef.current || debouncedSearchQuery) {
            loadVendors();
            fetchedRef.current = true;
        }
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

    const handleToggleActive = async (id) => {
        const toastId = toast.loading("Updating status...");
        try {
            const updated = await toggleB2BVendorActive(id);
            toast.success(`Vendor is now ${updated.isActive ? 'Active' : 'Inactive'}`, { id: toastId });
        } catch (error) {
            console.error('Error toggling active status:', error);
            toast.error(error.message || "Failed to update status", { id: toastId });
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
                        <Link
                            to={`/admin/b2b-vendors/manage/${row._id || row.id}/dashboard`}
                            className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1 group/link"
                        >
                            {row.name}
                            <FiArrowUpRight className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </Link>
                    </div>
                </div>
            )
        },
        {
            key: "businessType",
            label: "Business Details",
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-black text-primary-600 uppercase tracking-tighter">{val}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {row.selectedSubTypes?.map((st, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded text-[9px] font-bold border border-primary-100">
                                {st}
                            </span>
                        ))}
                    </div>
                </div>
            )
        },
        { key: "email", label: "Email" },
        {
            key: "status",
            label: "Status",
            render: (val, row) => (
                <div className="flex flex-col gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit border ${val === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        val === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-red-50 text-red-600 border-red-100'
                        }`}>
                        {val || 'pending'}
                    </span>
                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase w-fit ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
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
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Full Details"
                    >
                        <FiEye />
                    </button>
                    <button
                        onClick={() => handleToggleActive(row._id || row.id)}
                        className={`p-2 rounded-lg transition-colors ${row.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={row.isActive ? 'Mark Inactive' : 'Mark Active'}
                    >
                        {row.isActive ? <FiToggleRight className="text-xl" /> : <FiToggleLeft className="text-xl" />}
                    </button>
                    <button
                        onClick={() => handleDelete(row._id || row.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none transition-all shadow-sm focus:shadow-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-hidden">
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
