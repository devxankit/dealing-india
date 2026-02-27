import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    FiPackage,
    FiTrendingUp,
    FiArrowRight,
    FiPlus,
    FiCreditCard,
    FiImage,
    FiCheckCircle,
    FiAlertCircle,
    FiPhone,
    FiMessageSquare,
    FiHash,
    FiHome,
    FiCalendar,
    FiArrowUpRight,
    FiArrowLeft
} from "react-icons/fi";
import api from "../../../../shared/utils/api";
import { getBusinessTypes } from "../../../../shared/utils/businessTypeCache";
import toast from "react-hot-toast";

const AdminVendorDashboardView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                // 1. Fetch Dashboard Data
                const dashboardRes = await api.get(`/admin/b2b-vendors/${id}/dashboard`);
                if (!dashboardRes.success) throw new Error(dashboardRes.message);

                const dashboardData = dashboardRes.data;
                setData(dashboardData);

                // 2. Fetch Business Types to get slug
                const businessTypes = await getBusinessTypes();
                const vendorType = businessTypes.find(t =>
                    t.name === dashboardData.vendor.businessType ||
                    t.slug === dashboardData.vendor.businessType ||
                    t._id === dashboardData.vendor.businessTypeRef
                );

                if (vendorType) {
                    // 3. Fetch Settings for that slug
                    const settingsRes = await api.get(`/admin/business-settings/${vendorType.slug}`);
                    if (settingsRes.success) {
                        setSettings(settingsRes.data);
                    }
                }
            } catch (error) {
                console.error("Error fetching vendor dashboard:", error);
                toast.error("Failed to load vendor dashboard details");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchAll();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading vendor overview...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <FiAlertCircle className="mx-auto text-4xl text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-800">Vendor Not Found</h2>
                <p className="text-gray-500 mb-6">We couldn't retrieve the details for this vendor.</p>
                <button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold">
                    Go Back
                </button>
            </div>
        );
    }

    const { vendor, overview, counts, subscriptions, banners, alerts, shopUnit } = data;

    // Use fetched settings or fallback to defaults
    const config = settings ? {
        enableProductListing: settings.enabledModules?.includes('product'),
        enablePropertyListing: settings.enabledModules?.includes('property'),
        enableLotSlotListing: settings.enabledModules?.includes('lotslot') || false,
        enableBanner: settings.enabledModules?.includes('banner'),
        widgets: settings.dashboardWidgets?.length > 0 ? settings.dashboardWidgets : ['stats', 'listings_overview', 'subscription_status', 'banner_promo', 'alerts'],
    } : {
        enableProductListing: true,
        enablePropertyListing: true,
        enableLotSlotListing: true,
        enableBanner: true,
        widgets: ['stats', 'listings_overview', 'subscription_status', 'banner_promo', 'alerts']
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-bold group"
                >
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:bg-primary-50 group-hover:border-primary-200">
                        <FiArrowLeft />
                    </div>
                    Back to Vendors
                </button>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                        Admin View
                    </span>
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                        Live Data
                    </span>
                </div>
            </div>

            {/* Vendor Identity Header */}
            <header className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl">
                        <span className="text-white text-3xl font-black">{vendor?.name?.charAt(0)}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-baseline gap-3">
                                {vendor?.name}
                                {vendor?.storeName && (
                                    <span className="text-primary-600 font-extrabold text-xl px-3 py-1 bg-primary-50 rounded-xl border border-primary-100 shadow-sm">
                                        {vendor.storeName}
                                    </span>
                                )}
                            </h1>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                                {vendor?.businessType}
                            </span>
                        </div>
                        <p className="text-slate-400 font-medium flex items-center gap-2">
                            <FiCheckCircle className="text-emerald-500" /> Account Dashboard Overview
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:w-96">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                        <p className="text-sm font-black text-slate-800 truncate">{vendor?.email}</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Nearest Expiry</p>
                        <p className="text-sm font-black text-amber-700">
                            {subscriptions.length > 0
                                ? new Date(Math.min(...subscriptions.map(s => new Date(s.expiry)))).toLocaleDateString('en-GB')
                                : 'No Active Plan'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            {config.widgets.includes('stats') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Active Promotion Banners', value: banners.length, icon: FiImage, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Total Call Inquiries', value: overview.callClicks, icon: FiPhone, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Total WhatsApp Clicks', value: overview.whatsappClicks, icon: FiMessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Total Map Opens', value: overview.mapClicks, icon: FiMapPin, color: 'text-orange-600', bg: 'bg-orange-50' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-lg transition-all">
                            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>
                                <stat.icon />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</h3>
                                <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-10">

                    {/* Inventory */}
                    {config.widgets.includes('listings_overview') && (
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 ml-2">Vendor Inventory</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {config.enableProductListing && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FiPackage size={24} /></div>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Product Catalog</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{counts.products.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{counts.products.approved} Approved</p>
                                                <p className="text-[10px] font-bold text-amber-500 uppercase">{counts.products.pending} Pending</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {config.enablePropertyListing && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><FiHome size={24} /></div>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Property Portfolio</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{counts.properties.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{counts.properties.approved} Active</p>
                                                <p className="text-[10px] font-bold text-amber-500 uppercase">{counts.properties.pending} Review</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {config.enableLotSlotListing && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><FiHash size={24} /></div>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Lots / Slots</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{counts.lotSlot.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{counts.lotSlot.approved} Active</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Subscriptions */}
                    {config.widgets.includes('subscription_status') && (
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 ml-2">Subscription History</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {subscriptions.map((sub, i) => (
                                    <div key={i} className="bg-slate-900 rounded-[2rem] p-8 text-white group overflow-hidden relative">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-primary-400">
                                                <FiCreditCard size={20} />
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${sub.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                {sub.status}
                                            </span>
                                        </div>
                                        <h4 className="text-xl font-black mb-1">{sub.name}</h4>
                                        <p className="text-xs text-slate-400 mb-6 font-medium">Expires {new Date(sub.expiry).toLocaleDateString('en-GB')}</p>
                                        <div className="flex flex-col">
                                            <span className="text-3xl font-black text-primary-400">{sub.daysLeft}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Days Remaining</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shop Details & Staff */}
                    {shopUnit && (
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 ml-2 text-left">Shop & Team Details</h2>
                            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left">Shop Description</h3>
                                    <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left">
                                        {shopUnit.description || "No description provided."}
                                    </p>
                                </div>

                                {shopUnit.details?.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-left">Key Contacts / Staff</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {shopUnit.details.map((contact, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 font-black text-sm shadow-sm">
                                                        {contact.name?.charAt(0) || 'C'}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <h4 className="text-xs font-black text-slate-800 uppercase truncate">{contact.name || 'N/A'}</h4>
                                                        <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest opacity-70 mb-1">{contact.post || 'Staff'}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 whitespace-nowrap">+91 {contact.mobile || '---'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Alerts */}
                    {config.widgets.includes('alerts') && (
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 px-2">Action Items</h2>
                            <div className="space-y-4">
                                {alerts.length > 0 ? alerts.map((alert, idx) => (
                                    <div key={alert.id || idx} className={`p-5 rounded-3xl border flex gap-4 ${alert.type === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                                        <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${alert.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                            <FiAlertCircle size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 leading-relaxed">{alert.message}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-6">
                                        <p className="text-xs font-medium text-slate-400">No active alerts for this vendor</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Banners */}
                    {config.widgets.includes('banner_promo') && config.enableBanner && (
                        <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Active Banners</h2>
                            <div className="space-y-6">
                                {banners.length > 0 ? banners.map((banner, i) => (
                                    <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-primary-400 flex-shrink-0">
                                            <FiImage size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800">{banner.title}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-2">{banner.type} • Ads</p>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                                                <FiCalendar size={12} /> {new Date(banner.expiry).toLocaleDateString('en-GB')}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">No Active Banners</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default AdminVendorDashboardView;
