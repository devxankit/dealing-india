import { useState, useEffect, useRef } from "react";
import { FiEdit2, FiSave, FiCheckCircle, FiXCircle, FiSettings, FiActivity, FiPlus, FiTrash2 } from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const BusinessTypeConfiguration = () => {
    const [businessSettings, setBusinessSettings] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSettings, setEditingSettings] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newType, setNewType] = useState({ name: '', description: '', subTypes: [] });
    const [newSubType, setNewSubType] = useState('');
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (!fetchedRef.current) {
            fetchSettings();
            fetchPlans();
            fetchedRef.current = true;
        }
    }, []);

    const fetchPlans = async () => {
        try {
            const response = await api.get('/admin/b2b-subscription-plans');
            if (response.success) {
                setAllPlans(response.data);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    };

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
        setEditingSettings({
            ...settings,
            dashboardWidgets: settings.dashboardWidgets || [],
            allowedPlans: settings.allowedPlans || []
        });
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

    const toggleWidget = (widget) => {
        const currentWidgets = editingSettings.dashboardWidgets || [];
        const newWidgets = currentWidgets.includes(widget)
            ? currentWidgets.filter(w => w !== widget)
            : [...currentWidgets, widget];

        setEditingSettings({ ...editingSettings, dashboardWidgets: newWidgets });
    };

    const togglePlan = (planId) => {
        const currentPlans = editingSettings.allowedPlans || [];
        const newPlans = currentPlans.includes(planId)
            ? currentPlans.filter(p => p !== planId)
            : [...currentPlans, planId];

        setEditingSettings({ ...editingSettings, allowedPlans: newPlans });
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

                        <h3 className="text-xl font-bold text-slate-800 mb-1">
                            {settings.businessTypeId?.name?.toUpperCase() === 'TAXTILE' ? 'TEXTILE' : settings.businessTypeId?.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">{settings.businessTypeId?.description}</p>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enabled Modules</p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    {settings.enabledModules?.map(module => (
                                        <span key={module} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md uppercase">
                                            {module}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Widgets</p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    {(settings.dashboardWidgets?.length || 0) > 0 ? (
                                        settings.dashboardWidgets.map(widget => (
                                            <span key={widget} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md uppercase border border-blue-100">
                                                {widget.replace('_', ' ')}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-400 italic font-medium">No widgets selected</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sub-Types</p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    {(settings.businessTypeId?.subTypes?.length || 0) > 0 ? (
                                        settings.businessTypeId.subTypes.map(st => (
                                            <span key={st} className="px-2 py-1 bg-purple-50 text-purple-600 rounded-md uppercase border border-purple-100">
                                                {st}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-400 italic font-medium">None</span>
                                    )}
                                </div>
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header - Fixed */}
                        <div className="p-8 pb-4 border-b border-slate-50 flex items-center justify-between bg-white z-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                    Configure {editingSettings.businessTypeId?.name?.toUpperCase() === 'TAXTILE' ? 'TEXTILE' : editingSettings.businessTypeId?.name}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Vendor Panel Settings</p>
                            </div>
                            <button
                                onClick={() => setEditingSettings(null)}
                                className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"
                            >
                                <FiXCircle size={24} />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-10 custom-scrollbar">
                            {/* Modules Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Enabled Modules</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {['product', 'property', 'lotslot', 'subscription', 'banner', 'notifications', 'profile', 'settings'].map(module => (
                                        <button
                                            key={module}
                                            onClick={() => toggleModule(module)}
                                            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-between ${editingSettings.enabledModules?.includes(module)
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                                : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-primary-300'
                                                }`}
                                        >
                                            {module === 'lotslot' ? 'Lot/Slot' : module}
                                            {editingSettings.enabledModules?.includes(module) && <FiCheckCircle />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dashboard Widgets */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Dashboard Widgets</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {[
                                        { id: 'stats', label: 'Core Stats' },
                                        { id: 'listings_overview', label: 'Inventory' },
                                        { id: 'subscription_status', label: 'Subscriptions' },
                                        { id: 'banner_promo', label: 'Promotion' },
                                        { id: 'alerts', label: 'Action Center' },
                                        { id: 'quick_actions', label: 'Quick Links' },
                                    ].map(widget => (
                                        <button
                                            key={widget.id}
                                            onClick={() => toggleWidget(widget.id)}
                                            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-between ${editingSettings.dashboardWidgets?.includes(widget.id)
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-blue-300'
                                                }`}
                                        >
                                            {widget.label}
                                            {editingSettings.dashboardWidgets?.includes(widget.id) && <FiCheckCircle />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Allowed Subscriptions */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Allowed Subscription Plans</label>
                                <div className="space-y-3">
                                    {allPlans.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {allPlans.map(plan => (
                                                <button
                                                    key={plan._id}
                                                    onClick={() => togglePlan(plan._id)}
                                                    className={`px-5 py-4 rounded-2xl text-left transition-all border-2 ${editingSettings.allowedPlans?.includes(plan._id)
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                                        : 'bg-slate-50 border-slate-100 text-slate-500 opacity-60'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-black text-sm uppercase tracking-tight">{plan.name}</p>
                                                            <p className="text-[10px] font-bold opacity-70">₹{plan.price} • {plan.duration} Mos</p>
                                                        </div>
                                                        {editingSettings.allowedPlans?.includes(plan._id) && <FiCheckCircle className="text-emerald-600" size={20} />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase">No active plans found</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Features Toggle */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Advanced Features</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { id: 'canPostJob', label: 'Can Post Jobs', desc: 'Allows vendor to post hiring requirements' },
                                        { id: 'canReceiveLeads', label: 'Receive Leads', desc: 'Allow user inquiries as direct leads' },
                                        { id: 'hasPremiumBadge', label: 'Premium Badge', desc: 'Display "Verified Premium" on profile' },
                                        { id: 'canAccessAnalytics', label: 'Access Analytics', desc: 'Show performance metrics in dashboard' },
                                    ].map((feature) => (
                                        <div key={feature.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{feature.label}</p>
                                                <p className="text-[10px] text-slate-500">{feature.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newFeatures = { ...(editingSettings.features || {}) };
                                                    newFeatures[feature.id] = !newFeatures[feature.id];
                                                    setEditingSettings({ ...editingSettings, features: newFeatures });
                                                }}
                                                className={`w-12 h-6 rounded-full p-1 transition-all ${editingSettings.features?.[feature.id] ? 'bg-primary-600' : 'bg-slate-300'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${editingSettings.features?.[feature.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
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

                            {/* Product Form Type Selection */}
                            <div className="pt-6 border-t border-slate-100">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Product Form Layout</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'standard', label: 'Standard', desc: 'Single product entry' },
                                        { id: 'shop-listing', label: 'Shop Listing', desc: 'Shop details + items list' }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setEditingSettings({ ...editingSettings, productFormType: type.id })}
                                            className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-left ${editingSettings.productFormType === type.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                                        >
                                            <span className="text-xs font-black uppercase tracking-wider mb-1">{type.label}</span>
                                            <span className={`text-[10px] ${editingSettings.productFormType === type.id ? 'text-slate-300' : 'text-slate-400'}`}>{type.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sub-Types Management */}
                            <div className="pt-6 border-t border-slate-100">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Business Sub-Types</label>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={newSubType}
                                        onChange={(e) => setNewSubType(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (newSubType.trim()) {
                                                    const current = editingSettings.businessTypeId?.subTypes || [];
                                                    const updatedBT = { ...editingSettings.businessTypeId, subTypes: [...current, newSubType.trim()] };
                                                    setEditingSettings({ ...editingSettings, businessTypeId: updatedBT });
                                                    setNewSubType('');
                                                }
                                            }
                                        }}
                                        className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-slate-300 outline-none transition-all text-sm font-bold"
                                        placeholder="Add a sub-type (e.g. Dyer)"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newSubType.trim()) {
                                                const current = editingSettings.businessTypeId?.subTypes || [];
                                                const updatedBT = { ...editingSettings.businessTypeId, subTypes: [...current, newSubType.trim()] };
                                                setEditingSettings({ ...editingSettings, businessTypeId: updatedBT });
                                                setNewSubType('');
                                            }
                                        }}
                                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(editingSettings.businessTypeId?.subTypes || []).map((st, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black border border-slate-200 uppercase">
                                            {st}
                                            <button
                                                onClick={() => {
                                                    const current = editingSettings.businessTypeId?.subTypes || [];
                                                    const updatedBT = { ...editingSettings.businessTypeId, subTypes: current.filter((_, idx) => idx !== i) };
                                                    setEditingSettings({ ...editingSettings, businessTypeId: updatedBT });
                                                }}
                                            >
                                                <FiTrash2 size={12} className="text-red-500" />
                                            </button>
                                        </span>
                                    ))}
                                    {(editingSettings.businessTypeId?.subTypes || []).length === 0 && (
                                        <p className="text-xs text-slate-400 italic">No sub-types defined for this category.</p>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Footer - Fixed */}
                        <div className="p-8 pt-4 border-t border-slate-50 bg-slate-50/50">
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

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Sub-Types (Optional)</label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newSubType}
                                        onChange={(e) => setNewSubType(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (newSubType.trim()) {
                                                    setNewType({ ...newType, subTypes: [...newType.subTypes, newSubType.trim()] });
                                                    setNewSubType('');
                                                }
                                            }
                                        }}
                                        className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-slate-300 outline-none transition-all text-sm font-bold"
                                        placeholder="Add a sub-type (e.g. Weaver)"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newSubType.trim()) {
                                                setNewType({ ...newType, subTypes: [...newType.subTypes, newSubType.trim()] });
                                                setNewSubType('');
                                            }
                                        }}
                                        className="px-4 py-3 bg-slate-900 text-white rounded-xl font-bold"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {newType.subTypes.map((st, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-bold border border-primary-100 uppercase uppercase">
                                            {st}
                                            <button onClick={() => setNewType({ ...newType, subTypes: newType.subTypes.filter((_, idx) => idx !== i) })}>
                                                <FiTrash2 size={12} className="text-red-500" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
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
