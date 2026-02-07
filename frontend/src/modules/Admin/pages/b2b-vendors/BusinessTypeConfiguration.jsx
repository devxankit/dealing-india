import { useState, useEffect } from "react";
import { FiEdit2, FiSave, FiCheckCircle, FiXCircle, FiSettings, FiActivity, FiPlus, FiTrash2 } from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const BusinessTypeConfiguration = () => {
    const [businessSettings, setBusinessSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSettings, setEditingSettings] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newType, setNewType] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/business-settings');
            if (response.success) {
                setBusinessSettings(response.data);
            }
        } catch (error) {
            console.error('Error fetching business settings:', error);
            toast.error('Failed to load business settings');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newType.name) return toast.error('Name is required');
        try {
            const response = await api.post('/business-types/admin', newType);
            if (response.success) {
                toast.success('Business category created');
                setIsAddingNew(false);
                setNewType({ name: '', description: '' });
                fetchSettings();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to create');
        }
    };

    const handleEdit = (settings) => {
        setEditingSettings({ ...settings });
    };

    const handleSave = async () => {
        try {
            const response = await api.put(`/admin/business-settings/update/${editingSettings._id}`, editingSettings);
            if (response.success) {
                toast.success('Settings updated successfully');
                setEditingSettings(null);
                fetchSettings();
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Failed to update settings');
        }
    };

    const toggleModule = (module) => {
        const currentModules = editingSettings.enabledModules || [];
        const newModules = currentModules.includes(module)
            ? currentModules.filter(m => m !== module)
            : [...currentModules, module];

        setEditingSettings({ ...editingSettings, enabledModules: newModules });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Business Type Configuration</h1>
                    <p className="text-gray-500 text-sm">Manage features and limits for different business categories.</p>
                </div>
                <button
                    onClick={() => setIsAddingNew(true)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                    <FiPlus /> Create Category
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businessSettings.map((settings) => (
                    <motion.div
                        key={settings._id}
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 overflow-hidden relative"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center text-xl">
                                <FiSettings />
                            </div>
                            <button
                                onClick={() => handleEdit(settings)}
                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                                <FiEdit2 />
                            </button>
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-1">{settings.businessTypeId?.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{settings.businessTypeId?.description}</p>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enabled Modules</p>
                                <div className="flex flex-wrap gap-2">
                                    {settings.enabledModules?.map(module => (
                                        <span key={module} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase">
                                            {module}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <span className="text-xs font-semibold text-gray-600">Image Limit / Property</span>
                                <span className="text-sm font-bold text-slate-800">{settings.maxImagesPerProperty}</span>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <span className="text-xs font-semibold text-gray-600">Status</span>
                                <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${settings.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                    {settings.isActive ? <FiCheckCircle /> : <FiXCircle />}
                                    {settings.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Edit Modal */}
            {editingSettings && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-800 uppercase">Configure {editingSettings.businessTypeId?.name}</h2>
                            <button onClick={() => setEditingSettings(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <FiXCircle size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Modules Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Enabled Modules</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {['product', 'property', 'subscription', 'banner', 'profile', 'settings'].map(module => (
                                        <button
                                            key={module}
                                            onClick={() => toggleModule(module)}
                                            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-between ${editingSettings.enabledModules?.includes(module)
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                                : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-primary-300'
                                                }`}
                                        >
                                            {module}
                                            {editingSettings.enabledModules?.includes(module) && <FiCheckCircle />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Image Limits */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Max Images per Property</label>
                                <input
                                    type="number"
                                    value={editingSettings.maxImagesPerProperty}
                                    onChange={(e) => setEditingSettings({ ...editingSettings, maxImagesPerProperty: parseInt(e.target.value) || 0 })}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-primary-500 outline-none transition-all font-bold text-slate-700"
                                    placeholder="5"
                                />
                            </div>

                            {/* Status Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Operational Status</p>
                                    <p className="text-xs text-slate-500">Enable or disable this business category site-wide</p>
                                </div>
                                <button
                                    onClick={() => setEditingSettings({ ...editingSettings, isActive: !editingSettings.isActive })}
                                    className={`w-14 h-8 rounded-full p-1 transition-all ${editingSettings.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full transition-all transform ${editingSettings.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Save Action */}
                            <button
                                onClick={handleSave}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3"
                            >
                                <FiSave /> Save Configuration
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* Create Category Modal */}
            {isAddingNew && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-800 uppercase">New Category</h2>
                            <button onClick={() => setIsAddingNew(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <FiXCircle size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category Name</label>
                                <input
                                    type="text"
                                    value={newType.name}
                                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-300 outline-none transition-all font-bold text-slate-700"
                                    placeholder="e.g. Real Estate, Garments"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                                <textarea
                                    value={newType.description}
                                    onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-300 outline-none transition-all font-bold text-slate-700 min-h-[100px]"
                                    placeholder="Describe this business category..."
                                />
                            </div>

                            <button
                                onClick={handleCreate}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3"
                            >
                                <FiPlus /> Create Category
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default BusinessTypeConfiguration;
