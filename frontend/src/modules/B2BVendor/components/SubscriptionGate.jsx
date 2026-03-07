import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiAlertCircle, FiArrowRight, FiRefreshCw, FiPlus, FiCheckCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useVendorSettings } from '../hooks/useVendorSettings';
import { useSubscriptionStore } from '../store/subscriptionStore';

/**
 * SubscriptionGate Component
 * Wraps listing action buttons and shows appropriate state based on shop setup
 * 
 * Props:
 * - action: 'product' | 'lotslot' | 'property'
 * - children: The button/content to show when allowed
 * - showLimitInfo: Whether to show current usage/limits
 */
const SubscriptionGate = ({ action, children, showLimitInfo = true }) => {
    const navigate = useNavigate();
    const { settings, loading: settingsLoading } = useVendorSettings();

    const {
        status,
        loading: subscriptionLoading,
        fetchStatus,
        canCreateProduct,
        canCreateLotSlot,
        canCreateProperty,
        hasShop
    } = useSubscriptionStore();

    const [showShopModal, setShowShopModal] = useState(false);

    const loading = settingsLoading || subscriptionLoading;

    // Fetch subscription status on mount if not already loaded
    useEffect(() => {
        if (!status && !subscriptionLoading) {
            fetchStatus();
        }
    }, [status, subscriptionLoading, fetchStatus]);

    // Check if module is enabled for this business type
    const isModuleEnabled = () => {
        if (!settings || !settings.enabledModules) return true;

        switch (action) {
            case 'product': return settings.enabledModules.includes('product');
            case 'property': return settings.enabledModules.includes('property');
            case 'lotslot': return settings.enabledModules.includes('lotslot');
            default: return true;
        }
    };

    if (!isModuleEnabled()) {
        return null;
    }

    // Determine permission based on action type
    const getPermission = () => {
        switch (action) {
            case 'product': return canCreateProduct();
            case 'lotslot': return canCreateLotSlot();
            case 'property': return canCreateProperty();
            default: return { allowed: true };
        }
    };

    // If still loading, show skeleton
    if (loading && !status) {
        return (
            <div className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded-xl w-40"></div>
            </div>
        );
    }

    const permission = getPermission();

    // 1. Check if Shop Listing is completed (Mandatory first step)
    if (!hasShop()) {
        return (
            <>
                <button
                    onClick={() => setShowShopModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                    <FiLock className="text-lg" />
                    Complete Shop Listing
                </button>

                <AnimatePresence>
                    {showShopModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowShopModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FiPlus className="text-3xl text-indigo-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Shop Listing Required
                                    </h3>
                                    <p className="text-gray-500 mb-6 font-medium">
                                        Abhi aapne apni shop list nahi ki hai. Pehle Shop Listing poori karein, uske baad hi aap {action === 'product' ? 'products' : action === 'property' ? 'properties' : 'lot/slots'} add kar payenge.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowShopModal(false)}
                                            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                        >
                                            Abhi Nahi
                                        </button>
                                        <button
                                            onClick={() => { setShowShopModal(false); navigate('/b2b-vendor/shop-listing'); }}
                                            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
                                        >
                                            Go to Shop Listing <FiArrowRight />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        );
    }

    // 2. TEMPORARY: Subscription and Limit checks disabled
    return (
        <div className="flex items-center gap-4">
            {children}

            {showLimitInfo && action === 'product' && permission.limit !== -1 && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span className="font-medium">
                        {permission.current}/{permission.limit === -1 ? '∞' : permission.limit}
                    </span>
                    <span>listings used</span>
                </div>
            )}

            {showLimitInfo && action === 'property' && permission.maxImages && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span className="font-medium">Max {permission.maxImages}</span>
                    <span>images/property</span>
                </div>
            )}
        </div>
    );
};

/**
 * SubscriptionStatusBadge Component
 */
export const SubscriptionStatusBadge = () => {
    const { status, loading, fetchStatus, refreshStatus } = useSubscriptionStore();

    useEffect(() => {
        if (!status && !loading) {
            fetchStatus();
        }
    }, [status, loading, fetchStatus]);

    if (loading && !status) {
        return (
            <div className="animate-pulse h-6 w-20 bg-gray-200 rounded-lg"></div>
        );
    }

    if (!status?.hasSubscription) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => refreshStatus()}>
                <FiCheckCircle size={12} className="text-emerald-500" />
                Verified Account
            </span>
        );
    }

    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
            onClick={() => refreshStatus()}
            title="Click to refresh"
        >
            <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {status.plan?.name || 'Active'}
        </span>
    );
};

export default SubscriptionGate;
