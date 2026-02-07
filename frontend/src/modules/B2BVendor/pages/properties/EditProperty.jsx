import { useState, useEffect } from "react";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const EditProperty = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(null);

    useEffect(() => {
        fetchProperty();
    }, [id]);

    const fetchProperty = async () => {
        try {
            const response = await api.get(`/property/details/${id}`);
            if (response.success) {
                setFormData(response.data);
            }
        } catch (error) {
            toast.error('Failed to load property details');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await api.put(`/property/update/${id}`, formData);
            if (response.success) {
                toast.success('Property updated!');
                navigate('/b2b-vendor/properties/manage-properties');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-20 font-bold text-gray-400">Loading details...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-all">
                    <FiArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Edit Listing</h1>
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-50 space-y-6">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Title</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none font-bold text-slate-700"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Price Amount (₹)</label>
                        <input
                            type="number"
                            value={formData.price?.amount || ''}
                            onChange={(e) => setFormData({ ...formData, price: { ...formData.price, amount: e.target.value } })}
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none font-bold text-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Area (sq ft)</label>
                        <input
                            type="text"
                            value={formData.totalArea || ''}
                            onChange={(e) => setFormData({ ...formData, totalArea: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none font-bold text-slate-700"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none font-bold text-slate-700 min-h-[150px]"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3"
                >
                    <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </motion.div>
    );
};

export default EditProperty;
