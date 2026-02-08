import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiAlertCircle, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../store/subscriptionStore';

/**
 * SubscriptionGate Component
 * Wraps listing action buttons and shows appropriate state based on subscription
 * 
 * Props:
 * - action: 'product' | 'lotslot' | 'property'
 * - children: The button/content to show when allowed
 * - showLimitInfo: Whether to show current usage/limits
 */
const SubscriptionGate = ({ action, children, showLimitInfo = true }) => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);

    const {
        status,
        loading,
        fetchStatus,
        canCreateProduct,
        canCreateLotSlot,
        canCreateProperty,
        hasActiveSubscription
    } = useSubscriptionStore();

    // Fetch subscription status on mount if not already loaded
    useEffect(() => {
        if (!status && !loading) {
            fetchStatus();
        }
    }, [status, loading, fetchStatus]);

    // Determine permission based on action type
    const getPermission = () => {
        switch (action) {
            case 'product':
                return canCreateProduct();
            case 'lotslot':
                return canCreateLotSlot();
            case 'property':
                return canCreateProperty();
            default:
                return { allowed: false, message: 'Unknown action' };
        }
    };

    const permission = getPermission();
    const hasSubscription = hasActiveSubscription();

    // If still loading, show skeleton
    if (loading && !status) {
        return (
            <div className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded-xl w-40"></div>
            </div>
        );
    }

    // If no subscription, show subscribe prompt
    if (!hasSubscription) {
        return (
            <>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl font-bold cursor-not-allowed opacity-80 hover:opacity-100 transition-all"
                >
                    <FiLock className="text-lg" />
                    Subscribe to Add
                </button>

                {/* Subscription Required Modal */}
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FiAlertCircle className="text-3xl text-amber-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Subscription Required
                                    </h3>
                                    <p className="text-gray-500 mb-6">
                                        {permission.message || 'Please purchase a subscription plan to start listing your products.'}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => navigate('/b2b-vendor/subscription')}
                                            className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            View Plans <FiArrowRight />
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

    // If action not allowed (limit reached or feature not in plan)
    if (!permission.allowed) {
        return (
            <>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-bold hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg"
                >
                    <FiLock className="text-lg" />
                    Upgrade Required
                </button>

                {/* Upgrade Required Modal */}
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FiAlertCircle className="text-3xl text-orange-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Plan Upgrade Required
                                    </h3>
                                    <p className="text-gray-500 mb-6">
                                        {permission.message}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => navigate('/b2b-vendor/subscription')}
                                            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2"
                                        >
                                            Upgrade Plan <FiArrowRight />
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

    // Permission granted - render children with optional limit info
    return (
        <div className="flex items-center gap-4">
            {children}

            {/* Show limit info for products */}
            {showLimitInfo && action === 'product' && permission.limit !== -1 && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span className="font-medium">
                        {permission.current}/{permission.limit === -1 ? '∞' : permission.limit}
                    </span>
                    <span>listings used</span>
                </div>
            )}

            {/* Show max images for property */}
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
 * Small badge to show subscription status in headers/navbars
 */
export const SubscriptionStatusBadge = () => {
    const { status, loading, fetchStatus, refreshStatus } = useSubscriptionStore();

    useEffect(() => {
        if (!status && !loading) {
            fetchStatus();
        }
    }, []);

    if (loading && !status) {
        return (
            <div className="animate-pulse h-6 w-20 bg-gray-200 rounded-lg"></div>
        );
    }

    if (!status?.hasSubscription) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg">
                <FiAlertCircle size={12} />
                No Plan
            </span>
        );
    }

    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-green-200 transition-colors"
            onClick={() => refreshStatus()}
            title="Click to refresh"
        >
            <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {status.plan?.name || 'Active'}
        </span>
    );
};

export default SubscriptionGate;
