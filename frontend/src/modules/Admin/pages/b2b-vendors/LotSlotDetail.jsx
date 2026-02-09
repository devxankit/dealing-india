import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiPackage, FiDollarSign, FiUser, FiCalendar } from "react-icons/fi";
import { motion } from "framer-motion";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";

const LotSlotDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [lotSlot, setLotSlot] = useState(null);

    useEffect(() => {
        fetchLotSlot();
    }, [id]);

    const fetchLotSlot = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/admin/lot-slots/${id}`);
            if (response.success) {
                setLotSlot(response.data);
            }
        } catch (error) {
            console.error('Error fetching Lot/Slot:', error);
            toast.error('Failed to load details');
            navigate('/admin/b2b-vendors/lot-slots');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async () => {
        try {
            const response = await api.patch(`/admin/lot-slots/${id}/status`, {
                isActive: !lotSlot.isActive
            });
            if (response.success) {
                toast.success(`Lot/Slot ${!lotSlot.isActive ? 'activated' : 'deactivated'}`);
                setLotSlot({ ...lotSlot, isActive: !lotSlot.isActive });
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!lotSlot) return null;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/admin/b2b-vendors/lot-slots')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <FiArrowLeft /> Back to List
                </button>
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase ${lotSlot.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {lotSlot.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Images */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        {lotSlot.image ? (
                            <img
                                src={lotSlot.image}
                                alt={lotSlot.name}
                                className="w-full h-auto rounded-xl object-cover aspect-square"
                            />
                        ) : (
                            <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                                <FiPackage size={48} />
                            </div>
                        )}
                    </div>
                    {/* Additional Images Grid */}
                    {lotSlot.images && lotSlot.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {lotSlot.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    alt={`Product ${idx}`}
                                    className="w-full h-20 object-cover rounded-lg border border-gray-100"
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">{lotSlot.name}</h1>
                                <p className="text-sm text-gray-500 font-mono">SKU: {lotSlot.sku}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-primary-600">₹{lotSlot.price}</p>
                                <p className="text-xs text-gray-500">per lot/unit</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500 mb-1">Minimum Order Qty</p>
                                <p className="font-semibold text-gray-900">{lotSlot.moq} Units</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500 mb-1">Created Date</p>
                                <div className="flex items-center gap-2 font-semibold text-gray-900">
                                    <FiCalendar className="text-gray-400" />
                                    {new Date(lotSlot.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                                {lotSlot.description || 'No description provided.'}
                            </p>
                        </div>
                    </div>

                    {/* Vendor Info */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FiUser className="text-primary-500" /> Vendor Information
                        </h3>
                        {lotSlot.vendorId ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">Store Name</span>
                                    <span className="font-medium text-gray-900">{lotSlot.vendorId.storeName}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">Vendor Name</span>
                                    <span className="font-medium text-gray-900">{lotSlot.vendorId.name}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">Email</span>
                                    <span className="font-medium text-gray-900">{lotSlot.vendorId.email}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-sm">Phone</span>
                                    <span className="font-medium text-gray-900">{lotSlot.vendorId.phone}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">Vendor information not available</p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default LotSlotDetail;
