import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiBox, FiLayers } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../../Admin/components/DataTable";
import Badge from "../../../../shared/components/Badge";
import ConfirmModal from "../../../Admin/components/ConfirmModal";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";
import SubscriptionGate from "../../components/SubscriptionGate";

const ManageLotSlot = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [lotSlots, setLotSlots] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

    useEffect(() => {
        fetchLotSlots();
    }, []);

    const fetchLotSlots = async () => {
        setLoading(true);
        try {
            const response = await api.get('/b2b-vendor/lot-slots', {
                params: { page: 1, limit: 100 }
            });

            if (response.success && response.data) {
                setLotSlots(response.data.lotSlots);
            }
        } catch (error) {
            console.error('Error fetching lot slots:', error);
            toast.error('Failed to load listings');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: "name",
            label: "Lot/Slot Name",
            sortable: true,
            render: (value, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                        {row.image || (row.images && row.images[0]) ? (
                            <img src={row.image || row.images[0]} alt={value} className="w-full h-full object-cover" />
                        ) : (
                            <FiBox className="text-gray-400 text-xl" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm">{value}</span>
                        <span className="text-[10px] text-gray-400 font-medium">SKU: {row.sku || 'N/A'}</span>
                    </div>
                </div>
            ),
        },
        {
            key: "category",
            label: "Category",
            sortable: true,
            render: (value) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <FiLayers className="text-primary-400" size={12} />
                    <span className="text-xs font-bold">{value || 'Uncategorized'}</span>
                </div>
            )
        },
        {
            key: "price",
            label: "Lot Price",
            sortable: true,
            render: (value) => <span className="font-black text-gray-900">₹{parseFloat(value).toLocaleString()}</span>,
        },
        {
            key: "moq",
            label: "Min. Order",
            sortable: true,
            render: (value, row) => <span className="text-xs font-bold text-gray-600">{value} {row.unit}</span>,
        },
        {
            key: "availability",
            label: "Status",
            render: (value) => {
                const variant = value === "In Stock" ? "success" : value === "Out of Stock" ? "danger" : "warning";
                return (
                    <Badge variant={variant}>
                        {value?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                );
            },
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/b2b-vendor/lotslot/edit/${row._id}`)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <FiEdit size={18} />
                    </button>
                    <button onClick={() => setDeleteModal({ isOpen: true, id: row._id })} className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <FiTrash2 size={18} />
                    </button>
                </div>
            ),
        },
    ];

    const confirmDelete = async () => {
        try {
            await api.delete(`/b2b-vendor/lot-slots/${deleteModal.id}`);
            toast.success("Listing removed from catalog");
            setDeleteModal({ isOpen: false, id: null });
            fetchLotSlots();
        } catch (error) {
            toast.error('Failed to delete listing');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Manage Lots/Slots</h1>
                    <p className="text-gray-500 font-medium">Control your bulk inventory and special offerings.</p>
                </div>
                {/* Wrapped with SubscriptionGate to enforce Diamond plan requirement */}
                <SubscriptionGate action="lotslot" showLimitInfo={false}>
                    <button
                        onClick={() => navigate("/b2b-vendor/lotslot/add-lotslot")}
                        className="flex items-center gap-3 px-6 py-3.5 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-100"
                    >
                        <FiPlus size={20} /> Publish New Lot
                    </button>
                </SubscriptionGate>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <div className="mb-8 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all outline-none font-bold text-gray-700"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-bold text-sm tracking-widest">LOADING CATALOG...</p>
                    </div>
                ) : (
                    <DataTable
                        data={lotSlots.filter(l =>
                            l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            l.category?.toLowerCase().includes(searchQuery.toLowerCase())
                        )}
                        columns={columns}
                        pagination={true}
                        itemsPerPage={10}
                    />
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Permanently Remove?"
                message="This listing will be deleted from your catalog. This action cannot be undone."
                type="danger"
            />
        </motion.div>
    );
};

export default ManageLotSlot;
