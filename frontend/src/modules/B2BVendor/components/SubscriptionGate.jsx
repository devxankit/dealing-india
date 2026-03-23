import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiAlertCircle, FiArrowRight, FiRefreshCw, FiPlus, FiCheckCircle, FiPackage, FiCreditCard, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useVendorSettings } from '../hooks/useVendorSettings';
import { useSubscriptionStore } from '../store/subscriptionStore';
import subscriptionService from '../services/subscriptionService';
import { initializeRazorpayCheckout, handlePaymentSuccess } from '../../../shared/services/paymentService';
import toast from 'react-hot-toast';

/**
 * SubscriptionGate Component
 * Wraps listing action buttons and shows appropriate state based on subscription status/addons
 */
const SubscriptionGate = ({ action, children, showLimitInfo = true, fullPage = false }) => {
    const navigate = useNavigate();
    const { settings, loading: settingsLoading } = useVendorSettings();

    const {
        status,
        loading: subscriptionLoading,
        fetchStatus,
        canCreateProduct,
        canCreateLotSlot,
        canCreateProperty,
        canUploadReel,
        hasShop
    } = useSubscriptionStore();

    const [showShopModal, setShowShopModal] = useState(false);
    const [showAddonModal, setShowAddonModal] = useState(false);
    const [addonPlans, setAddonPlans] = useState([]);
    const [loadingAddons, setLoadingAddons] = useState(false);
    const [processingAddonId, setProcessingAddonId] = useState(null);

    const loading = settingsLoading || subscriptionLoading;

    useEffect(() => {
        if (!status && !subscriptionLoading) {
            fetchStatus();
        }
    }, [status, subscriptionLoading, fetchStatus]);

    const isModuleEnabled = () => {
        if (!settings || !settings.enabledModules) return true;
        switch (action) {
            case 'product': return settings.enabledModules.includes('product');
            case 'property': return settings.enabledModules.includes('property');
            case 'lotslot': return settings.enabledModules.includes('lotslot');
            case 'reels': return true; // Reels are usually enabled if B2B is enabled
            default: return true;
        }
    };

    const getPermission = () => {
        switch (action) {
            case 'product': return canCreateProduct();
            case 'lotslot': return canCreateLotSlot();
            case 'property': return canCreateProperty();
            case 'reels': return canUploadReel();
            default: return { allowed: true };
        }
    };

    const handleFetchAddons = async (silent = false) => {
        try {
            if (!silent) setLoadingAddons(true);
            const plans = await subscriptionService.getAddonPlans();
            const featureTypeMap = {
                product: 'products',
                lotslot: 'lot_slot',
                reels: 'reels'
            };
            const filtered = plans.filter(p => p.featureType === featureTypeMap[action]);
            setAddonPlans(filtered);
            if (!silent) setShowAddonModal(true);
            return filtered;
        } catch (err) {
            if (!silent) toast.error('Failed to load addon plans');
        } finally {
            if (!silent) setLoadingAddons(false);
        }
    };

    const handleBuyAddon = async (planId) => {
        if (processingAddonId) return;

        try {
            setProcessingAddonId(planId);
            const response = await subscriptionService.initializeAddonPurchase(planId);
            const { order, key } = response;

            if (order && key) {
                const paymentResponse = await initializeRazorpayCheckout({
                    key: key,
                    amount: order.amount / 100,
                    orderId: order.id,
                    name: 'Dealing India Add-on',
                    description: `Purchase Extra Feature Units`,
                });

                toast.loading('Verifying purchase...', { id: 'verify-addon-gate' });

                const verifyData = {
                    planId: planId,
                    ...handlePaymentSuccess(paymentResponse)
                };

                await subscriptionService.verifyAddonPayment(verifyData);
                toast.success('Add-on purchased successfully!', { id: 'verify-addon-gate' });
                setShowAddonModal(false);
                fetchStatus(true); // Refresh store
            }
        } catch (error) {
            toast.error(error.message || 'Failed to purchase add-on');
        } finally {
            setProcessingAddonId(null);
        }
    };

    const permission = getPermission();

    // Auto-fetch addons in fullPage mode if limit reached
    useEffect(() => {
        if (fullPage && !permission.allowed && permission.requiresAddon && addonPlans.length === 0 && !loadingAddons) {
            handleFetchAddons(true);
        }
    }, [fullPage, permission, addonPlans.length, loadingAddons]);

    if (!isModuleEnabled()) return null;

    if (loading && !status) {
        return (
            <div className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded-xl w-40"></div>
            </div>
        );
    }

    if (!hasShop()) {
        const title = "Shop Listing Required";
        const message = `Please complete your shop listing first to unlock ${action} listings.`;

        if (fullPage) {
            return (
                <div className="bg-white border-2 border-dashed border-indigo-100 rounded-[2.5rem] p-12 text-center max-w-2xl mx-auto shadow-sm">
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-6">
                        <FiLock className="text-4xl" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight tracking-tight">{title}</h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">{message}</p>
                    <button 
                        onClick={() => navigate('/b2b-vendor/shop-listing')} 
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 mx-auto"
                    >
                        Go to Shop Listing <FiArrowRight />
                    </button>
                </div>
            );
        }

        return (
            <div className="relative group">
                <button
                    onClick={() => setShowShopModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-400 rounded-xl font-bold cursor-not-allowed border border-gray-200"
                >
                    <FiLock className="text-lg" />
                    Complete Shop Listing
                </button>
                <AnimatePresence>
                    {showShopModal && (
                        <Modal onClose={() => setShowShopModal(false)}>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiPlus className="text-3xl text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                                <p className="text-gray-500 mb-6 font-medium">{message}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowShopModal(false)} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50">Later</button>
                                    <button onClick={() => { setShowShopModal(false); navigate('/b2b-vendor/shop-listing'); }} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center justify-center gap-2">Go to Shop Listing <FiArrowRight /></button>
                                </div>
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    if (!permission.allowed) {
        if (fullPage) {
            return (
                <div className="bg-white border-2 border-dashed border-amber-100 rounded-[2.5rem] p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-600 mx-auto mb-6">
                        <FiAlertCircle className="text-4xl" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Requirement Unmet</h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">{permission.message}</p>
                    
                    {permission.requiresAddon ? (
                        <div className="space-y-6">
                            <div className="h-px bg-gray-100 w-full mb-6"></div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Available Add-on Packs</h3>
                            
                            <div className="grid grid-cols-1 gap-3">
                                {addonPlans.map(plan => (
                                    <button
                                        key={plan._id}
                                        onClick={() => handleBuyAddon(plan._id)}
                                        disabled={!!processingAddonId}
                                        className="flex items-center justify-between p-5 border-2 border-gray-100 rounded-[2rem] hover:border-primary-500 hover:bg-primary-50 transition-all group/item bg-gray-50/50"
                                    >
                                        <div className="text-left">
                                            <p className="font-black text-gray-900 uppercase text-xs tracking-tight">{plan.name}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{plan.quantity} Extra Units</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-black text-lg text-primary-600">₹{plan.price}</span>
                                            <div className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center group-hover/item:bg-primary-600 group-hover/item:text-white group-hover/item:border-primary-600 transition-all shadow-sm">
                                                {processingAddonId === plan._id ? <FiRefreshCw className="animate-spin" size={18} /> : <FiPlus size={18} />}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {loadingAddons && <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>}
                                {addonPlans.length === 0 && !loadingAddons && (
                                    <p className="text-gray-400 text-xs italic">No add-ons available. Please upgrade your main plan.</p>
                                )}
                            </div>

                            <button 
                                onClick={() => navigate('/b2b-vendor/subscription')} 
                                className="mt-8 text-xs font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                            >
                                <FiCreditCard /> View Full Subscription Plans
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => navigate('/b2b-vendor/subscription')} 
                            className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 shadow-xl shadow-primary-100 flex items-center justify-center gap-2 mx-auto"
                        >
                            Upgrade Subscription <FiArrowRight />
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div className="relative group">
                <button
                    onClick={permission.requiresAddon ? handleFetchAddons : () => navigate('/b2b-vendor/subscription')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-600 rounded-xl font-bold border border-amber-200 hover:bg-amber-100 transition-all"
                >
                    <FiAlertCircle className="text-lg" />
                    {permission.requiresAddon ? 'Buy Extra Units' : 'Upgrade Plan'}
                </button>
                
                <AnimatePresence>
                    {showAddonModal && (
                        <Modal onClose={() => setShowAddonModal(false)}>
                            <div className="text-center">
                                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4">
                                    <FiPackage className="text-2xl" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">Limit Reached</h3>
                                <p className="text-gray-500 mb-6 font-medium text-sm">{permission.message}</p>
                                
                                <div className="grid grid-cols-1 gap-3 mb-6">
                                    {addonPlans.map(plan => (
                                        <button
                                            key={plan._id}
                                            onClick={() => handleBuyAddon(plan._id)}
                                            disabled={!!processingAddonId}
                                            className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all group/item"
                                        >
                                            <div className="text-left">
                                                <p className="font-bold text-gray-800">{plan.name}</p>
                                                <p className="text-xs text-gray-500">{plan.quantity} Units</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-primary-600">₹{plan.price}</span>
                                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center group-hover/item:bg-primary-600 group-hover/item:text-white transition-colors">
                                                    {processingAddonId === plan._id ? <FiRefreshCw className="animate-spin" /> : <FiPlus />}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {addonPlans.length === 0 && !loadingAddons && (
                                        <p className="text-gray-400 text-sm italic">No add-on packs available.</p>
                                    )}
                                    {loadingAddons && <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>}
                                </div>

                                <button onClick={() => navigate('/b2b-vendor/subscription')} className="text-sm font-bold text-indigo-600 hover:underline">Or upgrade your full subscription plan</button>
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className={fullPage ? "w-full" : "flex items-center gap-4"}>
            {children}
            {showLimitInfo && permission.limit !== undefined && permission.limit !== -1 && !fullPage && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <span className={`font-bold ${permission.isAddon ? 'text-primary-600' : ''}`}>
                        {permission.current}/{permission.limit}
                    </span>
                    <span>{permission.isAddon ? 'addons used' : 'used'}</span>
                </div>
            )}
        </div>
    );
};

const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            onClick={e => e.stopPropagation()}
        >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"><FiX /></button>
            {children}
        </motion.div>
    </div>
);

export const SubscriptionStatusBadge = () => {
    const { status, loading, fetchStatus, refreshStatus } = useSubscriptionStore();
    useEffect(() => {
        if (!status && !loading) fetchStatus();
    }, [status, loading, fetchStatus]);

    if (loading && !status) return <div className="animate-pulse h-6 w-20 bg-gray-200 rounded-lg"></div>;

    if (!status?.hasSubscription) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => refreshStatus()}>
                <FiCheckCircle size={12} className="text-emerald-500" />
                Verified Account
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => refreshStatus()} title="Click to refresh">
            <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {status.plan?.name || 'Active'}
        </span>
    );
};

export default SubscriptionGate;
