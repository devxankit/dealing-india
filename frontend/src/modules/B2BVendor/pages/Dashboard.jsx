import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
    FiArrowUpRight
} from "react-icons/fi";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { useVendorSettings } from "../hooks/useVendorSettings";
import { useDashboardStore } from "../store/dashboardStore";
import { useEffect } from "react";

// ==========================================
// MOCK DATA & CONFIG (FRONTEND ONLY)
// ==========================================
const MOCK_VENDOR_DATA = {
    overview: {
        bannerClicks: 1240,
        callClicks: 450,
        whatsappClicks: 890
    },
    counts: {
        products: { total: 15, approved: 12, pending: 3 },
        lotSlot: { total: 8, approved: 8, pending: 0 },
        properties: { total: 5, approved: 4, pending: 1 }
    },
    subscriptions: [
        { type: 'product', name: 'Premium Retailer', status: 'Active', expiry: '2026-06-15', daysLeft: 125 },
        { type: 'property', name: 'Elite Agent', status: 'Active', expiry: '2026-08-20', daysLeft: 195 },
        { type: 'banner', name: 'Homepage Slider', status: 'Expiring Soon', expiry: '2026-02-15', daysLeft: 7 }
    ],
    banners: [
        { title: 'Winter Sale Boost', type: 'Leaderboard', expiry: '2026-03-01' }
    ],
    alerts: [
        { id: 1, type: 'warning', message: 'Your "Homepage Slider" banner is expiring in 7 days.' },
        { id: 2, type: 'info', message: '3 new listings are pending admin approval.' }
    ]
};

const B2BVendorDashboard = () => {
    const navigate = useNavigate();
    const { vendor } = useB2BVendorAuthStore();
    const { settings, loading: settingsLoading } = useVendorSettings();
    const { data: dashboardData, loading: dashboardLoading, fetchDashboardData } = useDashboardStore();

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const loading = settingsLoading || dashboardLoading;

    // Use fetched data or fallback to zeros if data haven't arrived yet
    const dashboard = dashboardData || {
        overview: { bannerClicks: 0, callClicks: 0, whatsappClicks: 0 },
        counts: {
            products: { total: 0, approved: 0, pending: 0 },
            lotSlot: { total: 0, approved: 0, pending: 0 },
            properties: { total: 0, approved: 0, pending: 0 }
        },
        subscriptions: [],
        banners: [],
        alerts: []
    };

    // ==========================================
    // DYNAMIC CONFIG LOGIC (FROM SETTINGS)
    // ==========================================
    const config = settings ? {
        // Feature Flags
        enableProductListing: settings.enabledModules?.includes('product'),
        enablePropertyListing: settings.enabledModules?.includes('property'),
        enableLotSlotListing: settings.enabledModules?.includes('lotslot') || false,
        enableBanner: settings.enabledModules?.includes('banner'),

        // Subscription Flags (Usually map to listing modules)
        enableProductSubscription: settings.enabledModules?.includes('product'),
        enablePropertySubscription: settings.enabledModules?.includes('property'),
        enableLotSlotSubscription: settings.enabledModules?.includes('lotslot') || false,
        enableBannerSubscription: settings.enabledModules?.includes('banner'),

        // Widgets
        widgets: settings.dashboardWidgets?.length > 0 ? settings.dashboardWidgets : ['stats', 'listings_overview', 'subscription_status', 'banner_promo', 'alerts'],

        // Features
        canAccessAnalytics: settings.features?.canAccessAnalytics ?? true,
        canReceiveLeads: settings.features?.canReceiveLeads ?? true
    } : {
        // Robust Fallback during loading or if config missing
        enableProductListing: true,
        enablePropertyListing: true,
        enableBanner: true,
        enableProductSubscription: true,
        enablePropertySubscription: true,
        enableBannerSubscription: true,
        widgets: ['stats', 'listings_overview', 'subscription_status', 'banner_promo', 'alerts', 'quick_actions']
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[1400px] mx-auto px-4 sm:px-0 space-y-8 pb-20"
        >
            {/* ------------------------------------------
                SECTION 1: HEADER (ALWAYS VISIBLE)
            ------------------------------------------ */}
            <header className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl">
                        <span className="text-white text-3xl font-black">{vendor?.name?.charAt(0)}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{vendor?.name}</h1>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                                {vendor?.businessType}
                            </span>
                        </div>
                        <p className="text-slate-400 font-medium flex items-center gap-2">
                            <FiCheckCircle className="text-emerald-500" /> Account Verified & Active
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:w-96">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Overall Status</p>
                        <p className="text-sm font-black text-slate-800">Operational</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Nearest Expiry</p>
                        <p className="text-sm font-black text-amber-700">
                            {dashboard.subscriptions.length > 0
                                ? new Date(Math.min(...dashboard.subscriptions.map(s => new Date(s.expiry)))).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                                : 'No Active Plan'}
                        </p>
                    </div>
                </div>
            </header>

            {/* ------------------------------------------
                SECTION 2: COMMON OVERVIEW CARDS (STATS)
            ------------------------------------------ */}
            {config.widgets.includes('stats') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Active Promotion Banners', value: dashboard.banners.length, icon: FiImage, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Total Call Inquiries', value: dashboard.overview.callClicks, icon: FiPhone, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Total WhatsApp Clicks', value: dashboard.overview.whatsappClicks, icon: FiMessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' }
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
                {/* LEFT COLUMN: LISTINGS & SUBSCRIPTIONS */}
                <div className="lg:col-span-8 space-y-10">

                    {/* ------------------------------------------
                        SECTION 3: CONFIG-BASED LISTING OVERVIEW
                    ------------------------------------------ */}
                    {config.widgets.includes('listings_overview') && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest ml-2">Inventory Breakdown</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {config.enableProductListing && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FiPackage size={24} /></div>
                                            <button onClick={() => navigate('/b2b-vendor/products')} className="text-slate-400 hover:text-slate-900"><FiArrowUpRight size={20} /></button>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Product Catalog</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{dashboard.counts.products.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{dashboard.counts.products.approved} Approved</p>
                                                <p className="text-[10px] font-bold text-amber-500 uppercase">{dashboard.counts.products.pending} Pending</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {config.enablePropertyListing && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><FiHome size={24} /></div>
                                            <button onClick={() => navigate('/b2b-vendor/properties')} className="text-slate-400 hover:text-slate-900"><FiArrowUpRight size={20} /></button>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Property Portfolio</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{dashboard.counts.properties.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{dashboard.counts.properties.approved} Active</p>
                                                <p className="text-[10px] font-bold text-amber-500 uppercase">{dashboard.counts.properties.pending} Review</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {config.enableLotSlotListing && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><FiHash size={24} /></div>
                                            <button className="text-slate-400 hover:text-slate-900"><FiArrowUpRight size={20} /></button>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Lots / Slots</h3>
                                        <div className="flex items-end justify-between">
                                            <p className="text-4xl font-black text-slate-900">{dashboard.counts.lotSlot.total}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">{dashboard.counts.lotSlot.approved} Active</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ------------------------------------------
                        SECTION 4: CONFIG-BASED SUBSCRIPTION OVERVIEW
                    ------------------------------------------ */}
                    {config.widgets.includes('subscription_status') && (
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 ml-2">Active Plans</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {dashboard.subscriptions
                                    .filter(sub => {
                                        if (sub.type === 'product' && !config.enableProductSubscription) return false;
                                        if (sub.type === 'property' && !config.enablePropertySubscription) return false;
                                        if (sub.type === 'lotslot' && !config.enableLotSlotSubscription) return false;
                                        if (sub.type === 'banner' && !config.enableBannerSubscription) return false;
                                        return true;
                                    })
                                    .map((sub, i) => (
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

                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="flex flex-col">
                                                    <span className="text-3xl font-black text-primary-400">{sub.daysLeft}</span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Days Remaining</span>
                                                </div>
                                                <button className="px-5 py-2.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-400 transition-colors shadow-lg">
                                                    Renew / Upgrade
                                                </button>
                                            </div>

                                            {/* Abstract glow */}
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-primary-400/5 rounded-full blur-3xl -mr-10 -mt-10" />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: BANNERS & ALERTS */}
                <div className="lg:col-span-4 space-y-10">

                    {/* ------------------------------------------
                        SECTION 6: ALERT & ACTION PANEL
                    ------------------------------------------ */}
                    {config.widgets.includes('alerts') && (
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 px-2">Action Center</h2>
                            <div className="space-y-4">
                                {dashboard.alerts.map((alert, idx) => (
                                    <div key={alert.id || idx} className={`p-5 rounded-3xl border flex gap-4 ${alert.type === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                                        <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${alert.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                            <FiAlertCircle size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 leading-relaxed">{alert.message}</p>
                                            <button className="mt-2 text-[10px] font-black text-slate-900 uppercase underline underline-offset-4 decoration-slate-300">Take Action</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ------------------------------------------
                        SECTION 7: QUICK ACTIONS
                    ------------------------------------------ */}
                    {config.widgets.includes('quick_actions') && (
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
                            <h2 className="text-xs font-black text-primary-400 uppercase tracking-widest mb-6 ml-2">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => config.enableProductListing && navigate('/b2b-vendor/products/add-product')}
                                    className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${config.enableProductListing ? 'bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700' : 'opacity-30 cursor-not-allowed bg-slate-800'}`}
                                >
                                    <FiPlus size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-tight">Add Product</span>
                                </button>
                                <button
                                    onClick={() => config.enablePropertyListing && navigate('/b2b-vendor/properties/add-property')}
                                    className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${config.enablePropertyListing ? 'bg-slate-800 hover:bg-primary-600/20 hover:text-primary-400 border border-slate-700' : 'opacity-30 cursor-not-allowed bg-slate-800'}`}
                                >
                                    <FiPlus size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-tight">Add Property</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ------------------------------------------
                        SECTION 5: BANNER & PROMOTION (CONDITIONAL)
                    ------------------------------------------ */}
                    {config.widgets.includes('banner_promo') && (
                        config.enableBanner ? (
                            <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Active Promotion</h2>
                                <div className="space-y-6">
                                    {dashboard.banners.length > 0 ? dashboard.banners.map((banner, i) => (
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
                                    <button
                                        onClick={() => navigate('/b2b-vendor/banner-booking')}
                                        className="w-full py-4 bg-white text-slate-800 rounded-2xl border-2 border-slate-200 border-dashed hover:border-slate-800 hover:text-slate-900 transition-all font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <FiPlus /> New Campaign
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 border-dashed text-center">
                                <FiImage className="text-slate-300 text-4xl mx-auto mb-4 opacity-50" />
                                <p className="text-xs font-bold text-slate-400 uppercase leading-relaxed">Banner promotions are not allowed for your business type.</p>
                            </div>
                        )
                    )}

                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorDashboard;
