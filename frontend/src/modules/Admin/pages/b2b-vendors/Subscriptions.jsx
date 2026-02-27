import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit2, FiTrash2, FiEye, FiCheckCircle, FiXCircle, FiTrendingUp, FiSettings, FiActivity, FiPlus, FiSave, FiX, FiShoppingBag } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import { getB2BPlans, updateB2BPlan, createB2BPlan, initializeDefaultPlans } from "../../../../shared/utils/b2bPlanManager";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const Subscriptions = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("subscriptions");
    const [subscriptionFilter, setSubscriptionFilter] = useState("all");
    const [plans, setPlans] = useState([]);
    const [editingPlan, setEditingPlan] = useState(null);
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);
    const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [selectedBusinessType, setSelectedBusinessType] = useState("All Business Types");
    const [selectedCity, setSelectedCity] = useState("All Cities");
    const [citySearchQuery, setCitySearchQuery] = useState("");
    const [stats, setStats] = useState({
        active: 0,
        monthlyRevenue: 0,
        expiringSoon: 0,
        totalCollectedRevenue: 0
    });
    const initializedRef = useRef(false);

    // Optimize: Combined initial load into single useEffect with parallel execution
    useEffect(() => {
        const init = async () => {
            try {
                await Promise.all([
                    loadPlans(),
                    loadSubscriptions(),
                    loadBusinessTypes()
                ]);
            } catch (error) {
                console.error("Initialization error:", error);
            }
        };

        if (!initializedRef.current) {
            init();
            initializedRef.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount



    // Separate effect for subscription filter changes (only when filter changes, not tab)
    useEffect(() => {
        // Only reload subscriptions when filter changes AND we're on subscriptions tab
        if (activeTab === 'subscriptions') {
            loadSubscriptions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subscriptionFilter, selectedBusinessType]); // Only depends on filter, not activeTab

    const loadPlans = async () => {
        try {
            setLoading(true);
            // Fetch as admin to see ALL plans and bypass public cache
            const allPlans = await getB2BPlans(true, { isAdmin: true });

            // Sort plans: duration first (ASC), then price (ASC)
            const sortedPlans = [...allPlans].sort((a, b) => {
                if (a.duration !== b.duration) return a.duration - b.duration;
                return a.price - b.price;
            });

            setPlans(sortedPlans);

            // If we don't have any plans, try to initialize defaults
            if (sortedPlans.length === 0) {
                try {
                    await initializeDefaultPlans();
                    const updatedPlans = await getB2BPlans(true, { isAdmin: true });
                    setPlans(updatedPlans.sort((a, b) => {
                        if (a.duration !== b.duration) return a.duration - b.duration;
                        return a.price - b.price;
                    }));
                } catch (error) {
                    console.error('Error initializing default plans:', error);
                }
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            toast.error('Failed to load subscription plans');
        } finally {
            setLoading(false);
        }
    };

    const handleEditPlan = (plan) => {
        setEditingPlan({ ...plan });
        setShowPlanForm(true);
    };

    const handleSavePlan = async () => {
        if (!editingPlan.name || !editingPlan.price || editingPlan.price <= 0) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            const planId = editingPlan._id || editingPlan.id;

            if (planId) {
                // Update existing plan
                await updateB2BPlan(planId, {
                    name: editingPlan.name,
                    price: editingPlan.price,
                    features: editingPlan.features,
                    isActive: editingPlan.isActive,
                    description: editingPlan.description,
                });
                toast.success('Plan updated successfully');
            } else {
                // Create new plan
                await createB2BPlan({
                    name: editingPlan.name,
                    duration: editingPlan.duration,
                    price: editingPlan.price,
                    features: editingPlan.features,
                    description: editingPlan.description,
                });
                toast.success('Plan created successfully');
            }

            // Reload plans after save
            await loadPlans();
            setShowPlanForm(false);
            setEditingPlan(null);
        } catch (error) {
            console.error('Error saving plan:', error);
            toast.error(error.message || 'Failed to save plan');
        }
    };

    const handleFeatureChange = (index, value) => {
        const newFeatures = [...editingPlan.features];
        newFeatures[index] = value;
        setEditingPlan({ ...editingPlan, features: newFeatures });
    };

    const loadBusinessTypes = async () => {
        try {
            const response = await api.get('/business-types');
            if (response.success) {
                setBusinessTypes(response.data || []);
            }
        } catch (error) {
            console.error('Error loading business types:', error);
        }
    };

    const handleAddFeature = () => {
        setEditingPlan({
            ...editingPlan,
            features: [...editingPlan.features, '']
        });
    };

    const handleRemoveFeature = (index) => {
        const newFeatures = editingPlan.features.filter((_, i) => i !== index);
        setEditingPlan({ ...editingPlan, features: newFeatures });
    };

    const loadSubscriptions = async () => {
        try {
            setSubscriptionsLoading(true);
            const params = new URLSearchParams();
            if (subscriptionFilter !== 'all') params.append('status', subscriptionFilter);
            if (selectedBusinessType !== 'All Business Types') params.append('businessType', selectedBusinessType);

            // Fetch analytics and subscriptions in parallel
            const [analyticsRes, subsRes] = await Promise.all([
                api.get('/subscriptions/analytics'),
                api.get(`/subscriptions/getAllB2BSubscriptions?${params.toString()}`)
            ]);

            if (analyticsRes.success) {
                setStats({
                    active: analyticsRes.activeSubscriptions || 0,
                    monthlyRevenue: parseFloat(analyticsRes.monthlyGrowth.replace('+', '').replace('%', '')) || 0, // Placeholder for actual growth if needed separately
                    expiringSoon: 0, // Need to implement in service if critical
                    totalCollectedRevenue: analyticsRes.totalRevenue || 0,
                    actualMonthlyRevenue: analyticsRes.revenue || 0
                });
            }

            if (subsRes.success) {
                setSubscriptions(subsRes.data || []);
            }
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            toast.error('Failed to load subscriptions');
            setSubscriptions([]);
        } finally {
            setSubscriptionsLoading(false);
        }
    };

    const statsCards = [
        { label: "Active Subscriptions", value: stats.active.toString(), icon: FiCheckCircle, color: "text-green-600", bg: "bg-green-100" },
        { label: "Monthly Revenue", value: `₹${(stats.actualMonthlyRevenue || 0).toLocaleString('en-IN')}`, icon: FiTrendingUp, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Expiring Soon", value: stats.expiringSoon.toString(), icon: FiActivity, color: "text-orange-600", bg: "bg-orange-100" },
        {
            label: "Total Collection",
            value: `₹${stats.totalCollectedRevenue.toLocaleString('en-IN')}`,
            icon: FiShoppingBag,
            color: "text-purple-600",
            bg: "bg-purple-100",
            clickable: true,
            onClick: () => navigate('/admin/b2b-vendors/subscription-wallet')
        },
    ];

    const columns = [
        {
            key: "vendorName",
            label: "Vendor",
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{val}</span>
                    <span className="text-[10px] text-gray-400 font-medium uppercase">{row.businessType || 'B2B Vendor'}</span>
                </div>
            )
        },
        {
            key: "plan",
            label: "Plan",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${val.toLowerCase().includes('premium') ? 'bg-purple-100 text-purple-700' :
                    val.toLowerCase().includes('diamond') ? 'bg-blue-100 text-blue-700' :
                        val.toLowerCase().includes('silver') ? 'bg-gray-100 text-gray-700' :
                            'bg-amber-100 text-amber-700'
                    }`}>
                    {val}
                </span>
            )
        },
        {
            key: "billingCycle",
            label: "Cycle"
        },
        {
            key: "amount",
            label: "Amount",
            render: (val) => <span className="font-bold text-gray-700">₹{typeof val === 'number' ? val.toLocaleString('en-IN') : val}</span>
        },
        {
            key: "status",
            label: "Status",
            render: (val) => (
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 w-fit ${val === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {val === 'Active' ? <FiCheckCircle /> : <FiXCircle />}
                    {val}
                </span>
            )
        },
        { key: "expiryDate", label: "Expiry" },
    ];

    // City dropdown options derived from subscriptions
    const cityOptions = useMemo(() => {
        const citySet = new Set();
        subscriptions.forEach(sub => {
            const city = (sub.vendorCity || '').trim();
            if (city) citySet.add(city);
        });
        const cities = Array.from(citySet).sort();
        return ['All Cities', ...cities];
    }, [subscriptions]);

    const filteredCityOptions = useMemo(() => {
        if (!citySearchQuery.trim()) return cityOptions;
        const q = citySearchQuery.toLowerCase();
        return cityOptions.filter(city => city.toLowerCase().includes(q));
    }, [cityOptions, citySearchQuery]);

    // Apply city + search filtering on subscriptions list
    const filteredSubscriptions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return (subscriptions || []).filter(sub => {
            const city = (sub.vendorCity || '').trim();
            const cityMatch = selectedCity === 'All Cities' || city === selectedCity;

            if (!q) return cityMatch;

            const vendorName = (sub.vendorName || sub.vendor || '').toLowerCase();
            const email = (sub.vendorEmail || '').toLowerCase();
            const plan = (sub.plan || '').toLowerCase();

            const searchMatch =
                vendorName.includes(q) ||
                email.includes(q) ||
                plan.includes(q);

            return cityMatch && searchMatch;
        });
    }, [subscriptions, selectedCity, searchQuery]);


    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Subscription Management</h1>
                    <p className="text-gray-500 text-sm">Monitor and manage B2B vendor subscription plans and cycles.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <select
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm text-sm font-bold text-gray-700 outline-none"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                        >
                            {filteredCityOptions.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Search city..."
                            className="px-3 py-2 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm text-xs text-gray-700"
                            value={citySearchQuery}
                            onChange={(e) => setCitySearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm text-sm font-bold text-gray-700 outline-none"
                        value={selectedBusinessType}
                        onChange={(e) => setSelectedBusinessType(e.target.value)}
                    >
                        <option value="All Business Types">All Business Types</option>
                        {businessTypes.map(type => (
                            <option key={type._id} value={type.name}>{type.name}</option>
                        ))}
                    </select>
                    <div className="relative w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search subscriptions..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        onClick={stat.onClick}
                        className={`bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 ${stat.clickable ? 'cursor-pointer hover:border-purple-200 transition-all' : ''}`}
                    >
                        <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-2xl shadow-inner`}>
                            <stat.icon />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-6 mb-8 border-b border-gray-50">
                    {[
                        { id: "subscriptions", label: "Subscriptions" },
                        { id: "plans", label: "Plan Management" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === tab.id ? "text-primary-600" : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {activeTab === "subscriptions" ? (
                    <>
                        <div className="flex items-center gap-6 mb-8 border-b border-gray-50">
                            {["all", "active", "expired", "pending"].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setSubscriptionFilter(filter)}
                                    className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${subscriptionFilter === filter ? "text-primary-600" : "text-gray-400 hover:text-gray-600"
                                        }`}
                                >
                                    {filter}
                                    {subscriptionFilter === filter && (
                                        <motion.div layoutId="activeFilter" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {subscriptionsLoading ? (
                            <div className="text-center py-12">
                                <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-gray-500">Loading subscriptions...</p>
                            </div>
                        ) : filteredSubscriptions.length === 0 ? (
                            <div className="text-center py-12">
                                <FiCheckCircle className="text-gray-300 text-5xl mx-auto mb-4" />
                                <p className="text-gray-500">No subscriptions found</p>
                            </div>
                        ) : (
                            <DataTable
                                data={filteredSubscriptions}
                                columns={columns}
                                pagination={true}
                                itemsPerPage={10}
                            />
                        )}
                    </>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Manage Subscription Plans</h2>
                                <p className="text-sm text-gray-500 mt-1">Configure 3, 6, and 12 months subscription plans for B2B vendors</p>
                            </div>
                        </div>

                        {/* Plans Grid */}
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-gray-500">Loading plans...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {plans.map((plan) => (
                                    <motion.div
                                        key={plan._id || plan.id}
                                        whileHover={{ y: -5 }}
                                        className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                                                <p className="text-2xl font-extrabold text-primary-600 mt-2">
                                                    ₹{plan.price.toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleEditPlan(plan)}
                                                disabled={loading}
                                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <FiEdit2 />
                                            </button>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            {plan.features && plan.features.slice(0, 3).map((feature, idx) => (
                                                <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <FiCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                            {plan.features && plan.features.length > 3 && (
                                                <p className="text-xs text-gray-400">+{plan.features.length - 3} more features</p>
                                            )}
                                        </div>

                                        <div className={`px-3 py-1 rounded-full text-xs font-bold text-center ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {plan.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Plan Edit Modal */}
            {showPlanForm && editingPlan && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Edit {editingPlan.name}</h2>
                            <button
                                onClick={() => {
                                    setShowPlanForm(false);
                                    setEditingPlan(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <FiX className="text-xl" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Plan Name</label>
                                <input
                                    type="text"
                                    value={editingPlan.name}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500"
                                    placeholder="e.g., 3 Months Plan"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (Months)</label>
                                <input
                                    type="number"
                                    value={editingPlan.duration}
                                    disabled
                                    className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">Duration cannot be changed</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                                <input
                                    type="number"
                                    value={editingPlan.price}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500"
                                    placeholder="9999"
                                    min="0"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-gray-700">Features</label>
                                    <button
                                        onClick={handleAddFeature}
                                        className="text-primary-600 hover:text-primary-700 text-sm font-semibold flex items-center gap-1"
                                    >
                                        <FiPlus /> Add Feature
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {editingPlan.features.map((feature, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={feature}
                                                onChange={(e) => handleFeatureChange(index, e.target.value)}
                                                className="flex-1 px-4 py-2 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500"
                                                placeholder="Feature description"
                                            />
                                            <button
                                                onClick={() => handleRemoveFeature(index)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Visibility management removed from here - now managed via Business Config */}

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={editingPlan.isActive}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                                    Plan is Active
                                </label>
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    onClick={handleSavePlan}
                                    className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FiSave /> Save Plan
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPlanForm(false);
                                        setEditingPlan(null);
                                    }}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default Subscriptions;
