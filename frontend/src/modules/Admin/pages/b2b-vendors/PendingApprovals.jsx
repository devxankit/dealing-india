import { useState, useEffect } from "react";
import { FiCheck, FiX, FiFileText, FiEye, FiSearch } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import B2BVendorDetailModal from "./components/B2BVendorDetailModal";
import api from "../../../../shared/utils/api";

const B2BVendorPendingApprovals = () => {
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [approvals, setApprovals] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch pending B2B vendors from API
    useEffect(() => {
        const fetchPendingVendors = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    search: searchQuery,
                    page: '1',
                    limit: '100',
                });

                const response = await api.get(`/admin/b2b-vendors/pending?${params.toString()}`);

                if (response.success && response.data) {
                    // Transform vendor data for display
                    // Backend returns formatted vendors with companyName, joinDate, etc.
                    const transformedVendors = (response.data.vendors || []).map((vendor) => {
                        // Backend service formats vendors, so we use the formatted data
                        const documents = vendor.documents || [];
                        const docNames = documents.map(doc => {
                            if (typeof doc === 'string') return doc;
                            // Documents have structure: { name: string, url: string, type: string }
                            if (doc.name) {
                                // Extract document type from name (e.g., "PAN Card" -> "PAN", "Business License" -> "Business License")
                                const name = doc.name.toLowerCase();
                                if (name.includes('pan')) return 'PAN';
                                if (name.includes('gst')) return 'GST';
                                if (name.includes('business') || name.includes('license')) return 'Business License';
                                if (name.includes('aadhar')) return 'Aadhar';
                                return doc.name;
                            }
                            if (doc.type) return doc.type;
                            return 'Document';
                        });

                        return {
                            _id: vendor._id || vendor.id,
                            name: vendor.name,
                            companyName: vendor.companyName || vendor.storeName || vendor.name,
                            email: vendor.email,
                            phone: vendor.phone,
                            status: vendor.status,
                            documents: docNames.length > 0 ? docNames : ['No Documents'],
                            date: vendor.joinDate || (vendor.createdAt ? new Date(vendor.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                            gstNumber: vendor.gstNumber || 'N/A',
                            businessTypes: vendor.businessTypes || [],
                            subscription: vendor.subscription || (vendor.currentSubscription ? {
                                name: vendor.currentSubscription?.planId?.name || 'N/A',
                                price: vendor.currentSubscription?.planId?.price || 0,
                                duration: vendor.currentSubscription?.planId?.duration || 0
                            } : null),
                            address: vendor.address || {},
                            vendor: vendor // Store full vendor object for modal
                        };
                    });
                    setApprovals(transformedVendors);
                } else {
                    throw new Error(response.message || 'Failed to fetch pending vendors');
                }
            } catch (error) {
                console.error('Error fetching pending B2B vendors:', error);
                toast.error(error.response?.data?.message || error.message || 'Failed to fetch pending vendors');
                setApprovals([]);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchPendingVendors();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleApprove = async (id) => {
        try {
            const response = await api.put(`/admin/vendors/${id}/status`, {
                status: 'approved'
            });

            if (response.success) {
                toast.success("B2B Vendor approved successfully!");
                // Remove approved vendor from list
                setApprovals(prev => prev.filter(v => v._id !== id));
            } else {
                throw new Error(response.message || 'Failed to approve vendor');
            }
        } catch (error) {
            console.error('Error approving vendor:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to approve vendor');
        }
    };

    const handleReject = async (id) => {
        try {
            const response = await api.put(`/admin/vendors/${id}/status`, {
                status: 'rejected'
            });

            if (response.success) {
                toast.success("Application rejected.");
                // Remove rejected vendor from list
                setApprovals(prev => prev.filter(v => v._id !== id));
            } else {
                throw new Error(response.message || 'Failed to reject vendor');
            }
        } catch (error) {
            console.error('Error rejecting vendor:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to reject vendor');
        }
    };

    const handleViewDetails = (vendor) => {
        // Use full vendor object if available, otherwise use row data
        // Ensure we pass the complete vendor object with all nested data
        const vendorToPass = vendor.vendor || vendor;
        console.log('Opening modal with vendor:', vendorToPass);
        console.log('Vendor documents:', vendorToPass?.documents);
        setSelectedVendor(vendorToPass);
        setIsModalOpen(true);
    };

    const columns = [
        { key: "companyName", label: "B2B Vendor Name", render: (val) => <span className="font-bold text-gray-800">{val}</span> },
        { key: "email", label: "Email Address" },
        {
            key: "documents",
            label: "Documents",
            render: (val) => (
                <div className="flex gap-2">
                    {val.map((doc, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                            {doc}
                        </span>
                    ))}
                </div>
            )
        },
        { key: "date", label: "Applied On" },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleViewDetails(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                    >
                        <FiEye />
                    </button>
                    <button onClick={() => handleApprove(row._id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><FiCheck /></button>
                    <button onClick={() => handleReject(row._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Reject"><FiX /></button>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Pending</h1>
                <p className="text-gray-500">Review and verify new B2B vendor applications.</p>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : approvals.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No pending B2B vendor applications found.</p>
                    </div>
                ) : (
                    <DataTable
                        data={approvals}
                        columns={columns}
                        pagination={true}
                        itemsPerPage={10}
                    />
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

export default B2BVendorPendingApprovals;
