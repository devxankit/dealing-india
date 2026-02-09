import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCheck, FiStar, FiInfo, FiCreditCard, FiCheckCircle,
    FiRefreshCw, FiX, FiCalendar, FiAlertTriangle, FiClock,
    FiDollarSign, FiPackage, FiShield, FiExternalLink
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getActiveB2BPlans, getB2BPlanByIdSync } from '../../../shared/utils/b2bPlanManager';
import api from '../../../shared/utils/api';
import subscriptionService from '../services/subscriptionService';
import { useRef } from 'react';
import { initializeRazorpayCheckout, handlePaymentSuccess } from '../../../shared/services/paymentService'; // Added import
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import { getBusinessTypes } from '../../../shared/utils/businessTypeCache';

const B2BVendorSubscription = () => {
    const { vendor } = useB2BVendorAuthStore();
    const [availablePlans, setAvailablePlans] = useState([]);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [subscriptionHistory, setSubscriptionHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingPlanId, setProcessingPlanId] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellingSubscription, setCancellingSubscription] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        loadSubscriptionData();

        // Refresh on visibility change
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                loadSubscriptionData();
            }
        };

        // document.addEventListener('visibilitychange', handleVisibilityChange);
        // return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);


    const isFetchingRef = useRef(false);

    const loadSubscriptionData = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        console.log("loadSubscriptionData");
        try {
            setLoading(true);

            // Parallelize all initial data fetching
            const [businessTypes, subscriptions] = await Promise.all([
                getBusinessTypes(),
                subscriptionService.getAllSubscriptions()
            ]);

            // Find vendor's business type slug
            const vendorBusinessType = businessTypes.find(t =>
                t.name === vendor?.businessType ||
                t.slug === vendor?.businessType ||
                t._id === vendor?.businessTypeRef
            );

            // Now fetch the plans for this business type
            const plans = await getActiveB2BPlans({ businessType: vendorBusinessType?.slug });
            console.log("subscriptionssubscriptions", subscriptions);
            const filteredPlans = plans
                .filter(p => [3, 6, 12].includes(p.duration))
                .sort((a, b) => a.duration - b.duration);

            setAvailablePlans(filteredPlans);
            console.log("subscriptions", subscriptions);
            const activeSub = subscriptions.find(s => s.status === 'active') ||
                subscriptions.find(s => s.status === 'cancelled');
            if (activeSub) {
                const planDetails =
                    getB2BPlanByIdSync(activeSub.planId) ||
                    plans.find(p => p._id === activeSub.planId);

                setCurrentSubscription({ ...activeSub, planDetails });
            } else {
                setCurrentSubscription(null);
            }

            setSubscriptionHistory(subscriptions);

        } catch (err) {
            console.error(err);
            toast.error('Failed to load subscription data');
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };
    const handleSubscribe = async (planId) => {
        if (processingPlanId) return;

        try {
            setProcessingPlanId(planId);

            // Create subscription initialization
            const response = await subscriptionService.createSubscription(planId);
            const { subscription, razorpay, razorpayKeyId } = response;

            // Handle Razorpay Modal if provided (standard flow now)
            if (razorpay && razorpayKeyId) {
                try {
                    const paymentResponse = await initializeRazorpayCheckout({
                        key: razorpayKeyId,
                        amount: razorpay.amount / 100, // API returns paise, service expects rupees
                        orderId: razorpay.id || razorpay.orderId,
                        name: 'Dealing India B2B',
                        description: `Subscription: ${planId}`,
                        prefill: {
                            // You could add vendor details here if available
                        }
                    });

                    // After successful payment modal
                    toast.loading('Verifying payment...', { id: 'verify-payment' });

                    const verifyData = {
                        tierId: planId, // Using tierId key for backward compatibility in backend service
                        ...handlePaymentSuccess(paymentResponse)
                    };

                    await subscriptionService.verifyPayment(verifyData);

                    toast.success('Subscription activated successfully!', { id: 'verify-payment' });
                    loadSubscriptionData();
                } catch (err) {
                    console.error('Payment Modal Error:', err);
                    toast.error(err.message || 'Payment cancelled or failed');
                }
                return;
            }

            // Legacy URL redirection (if still used)
            if (subscription?.razorpaySubscriptionUrl) {
                toast.success('Redirecting to payment page...');
                window.open(subscription.razorpaySubscriptionUrl, '_blank');
                setTimeout(() => loadSubscriptionData(), 2000);
            } else if (subscription?.status === 'active') {
                // Free plan activated
                toast.success('Subscription activated successfully!');
                loadSubscriptionData();
            } else {
                toast.info('Subscription recorded. Please complete payment.');
                loadSubscriptionData();
            }

        } catch (error) {
            console.error('Subscription error:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to create subscription');
        } finally {
            setProcessingPlanId(null);
        }
    };

    const handleCancelSubscription = async () => {
        if (!currentSubscription || cancellingSubscription) return;

        try {
            setCancellingSubscription(true);

            await subscriptionService.cancelSubscription(currentSubscription._id);

            toast.success('Subscription cancelled successfully');
            setShowCancelModal(false);
            loadSubscriptionData();

        } catch (error) {
            console.error('Cancel error:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to cancel subscription');
        } finally {
            setCancellingSubscription(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'bg-green-100 text-green-700',
            pending: 'bg-yellow-100 text-yellow-700',
            cancelled: 'bg-red-100 text-red-700',
            expired: 'bg-gray-100 text-gray-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const getPlanIcon = (duration) => {
        if (duration === 12) return <FiStar className="text-2xl" />;
        if (duration === 6) return <FiPackage className="text-2xl" />;
        return <FiShield className="text-2xl" />;
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading subscription data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">B2B Subscription</h1>
                    <p className="text-gray-600">Manage your subscription to access the B2B marketplace.</p>
                </div>
                <button
                    onClick={loadSubscriptionData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Current Subscription Card */}
            {currentSubscription && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 rounded-3xl p-8 mb-10 text-white shadow-2xl relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

                    <div className="relative z-10">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                        <FiCheckCircle className="text-2xl" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Current Subscription</h2>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${currentSubscription.status === 'active'
                                            ? 'bg-green-400/30 text-green-100'
                                            : 'bg-yellow-400/30 text-yellow-100'
                                            }`}>
                                            {currentSubscription.status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-primary-100 text-sm mb-1">
                                            <FiPackage className="text-sm" />
                                            Plan
                                        </div>
                                        <p className="text-xl font-bold">
                                            {currentSubscription.planDetails?.name || `${currentSubscription.planDetails?.duration || 'N/A'} Months`}
                                        </p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-primary-100 text-sm mb-1">
                                            <FiDollarSign className="text-sm" />
                                            Amount Paid
                                        </div>
                                        <p className="text-xl font-bold">
                                            ₹{(currentSubscription.finalPayableAmount || currentSubscription.planDetails?.price || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-primary-100 text-sm mb-1">
                                            <FiCalendar className="text-sm" />
                                            Started On
                                        </div>
                                        <p className="text-xl font-bold">
                                            {formatDate(currentSubscription.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setShowDetailsModal(true)}
                                    className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors flex items-center gap-2"
                                >
                                    <FiInfo />
                                    View Details
                                </button>

                                {currentSubscription.status === 'active' && (
                                    <button
                                        onClick={() => setShowCancelModal(true)}
                                        className="px-6 py-3 bg-white/10 backdrop-blur text-white font-semibold rounded-xl hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20"
                                    >
                                        <FiX />
                                        Cancel Subscription
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Pending Payment Notice */}
            {subscriptionHistory.some(sub => sub.status === 'pending') && !currentSubscription && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8 flex items-start gap-4"
                >
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FiClock className="text-yellow-600 text-xl" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-yellow-800 mb-1">Pending Payment</h3>
                        <p className="text-yellow-700">
                            You have a pending subscription. Please complete the payment to activate your subscription.
                        </p>
                        {subscriptionHistory.find(sub => sub.status === 'pending')?.razorpaySubscriptionUrl && (
                            <a
                                href={subscriptionHistory.find(sub => sub.status === 'pending').razorpaySubscriptionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                            >
                                Complete Payment
                                <FiExternalLink />
                            </a>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Available Plans Section */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {currentSubscription ? 'Available Plans' : 'Choose a Subscription Plan'}
                </h2>
                <p className="text-gray-500">
                    {currentSubscription
                        ? 'Explore other plans for when your current subscription expires.'
                        : 'Select a plan to access the B2B marketplace and start selling.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                {availablePlans.map((plan, index) => {
                    const planId = plan._id || plan.id;
                    const isCurrentPlan = currentSubscription?.planId === planId;
                    const hasActiveSubscription = !!currentSubscription;
                    const isProcessing = processingPlanId === planId;
                    const isRecommended = plan.duration === 6;

                    return (
                        <motion.div
                            key={planId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={!hasActiveSubscription || isCurrentPlan ? { y: -8, scale: 1.02 } : {}}
                            className={`relative bg-white rounded-3xl p-8 shadow-lg border-2 flex flex-col transition-all ${isCurrentPlan
                                ? 'border-green-500 ring-4 ring-green-50'
                                : isRecommended
                                    ? 'border-primary-500 ring-4 ring-primary-50'
                                    : 'border-gray-100 hover:border-gray-200'
                                } ${hasActiveSubscription && !isCurrentPlan ? 'opacity-60' : ''}`}
                        >
                            {/* Badges */}
                            {isCurrentPlan && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                    CURRENT PLAN
                                </div>
                            )}
                            {isRecommended && !isCurrentPlan && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                    RECOMMENDED
                                </div>
                            )}

                            {/* Plan Header */}
                            <div className="mb-8">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${isCurrentPlan
                                    ? 'bg-green-100 text-green-600'
                                    : isRecommended
                                        ? 'bg-primary-100 text-primary-600 shadow-lg shadow-primary-100'
                                        : 'bg-slate-100 text-gray-500'
                                    }`}>
                                    {getPlanIcon(plan.duration)}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold text-gray-900">
                                        ₹{plan.price?.toLocaleString('en-IN') || '0'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    {plan.duration} Months Duration
                                </p>
                            </div>

                            {/* Features */}
                            <ul className="space-y-4 mb-8 flex-grow">
                                {plan.features?.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-gray-600">
                                        <div className={`mt-1 p-1 rounded-full ${isCurrentPlan || isRecommended
                                            ? 'bg-primary-100 text-primary-600'
                                            : 'bg-gray-100 text-gray-400'
                                            }`}>
                                            <FiCheck className="text-xs" />
                                        </div>
                                        <span className="text-sm font-medium">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Action Button */}
                            {isCurrentPlan ? (
                                <button
                                    disabled
                                    className="w-full py-4 rounded-2xl font-bold bg-green-600 text-white cursor-not-allowed"
                                >
                                    Current Plan
                                </button>
                            ) : hasActiveSubscription ? (
                                <div className="space-y-2">
                                    <button
                                        disabled
                                        className="w-full py-4 rounded-2xl font-bold bg-gray-200 text-gray-400 cursor-not-allowed"
                                    >
                                        Not Available
                                    </button>
                                    <p className="text-xs text-center text-gray-500">
                                        Available after current plan expires
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleSubscribe(planId)}
                                    disabled={isProcessing}
                                    className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${isProcessing
                                        ? 'bg-gray-400 text-white cursor-wait'
                                        : isRecommended
                                            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-xl shadow-primary-200'
                                            : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                                        }`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FiCreditCard />
                                            Subscribe Now
                                        </>
                                    )}
                                </button>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl flex-shrink-0 shadow-lg shadow-blue-200">
                    <FiInfo />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h4 className="text-xl font-bold text-blue-900 mb-2">Important Notice for B2B Vendors</h4>
                    <p className="text-blue-800 leading-relaxed">
                        B2B subscriptions are required for listing products in the bulk marketplace.
                        Your store profile will be visible to retailers once your subscription is active
                        and documents are verified by our team.
                    </p>
                </div>
            </div>

            {/* Cancel Subscription Modal */}
            <AnimatePresence>
                {showCancelModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiAlertTriangle className="text-red-600 text-3xl" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Cancel Subscription?</h3>
                                <p className="text-gray-600">
                                    Are you sure you want to cancel your subscription? You will lose access to B2B marketplace features.
                                </p>
                            </div>

                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                                <ul className="text-sm text-red-800 space-y-2">
                                    <li>• Your products will be hidden from buyers</li>
                                    <li>• You won't receive new inquiries</li>
                                    <li>• No refund for remaining period</li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Keep Subscription
                                </button>
                                <button
                                    onClick={handleCancelSubscription}
                                    disabled={cancellingSubscription}
                                    className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {cancellingSubscription ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Cancelling...
                                        </>
                                    ) : (
                                        'Yes, Cancel'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Subscription Details Modal */}
            <AnimatePresence>
                {showDetailsModal && currentSubscription && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl z-10">
                                <h2 className="text-2xl font-bold text-gray-800">Subscription Details</h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <FiX className="text-xl text-gray-600" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Status */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <span className="text-gray-600 font-medium">Status</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(currentSubscription.status)}`}>
                                        {currentSubscription.status?.toUpperCase()}
                                    </span>
                                </div>

                                {/* Plan Details */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Plan Name</p>
                                        <p className="font-bold text-gray-800">
                                            {currentSubscription.planDetails?.name || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Duration</p>
                                        <p className="font-bold text-gray-800">
                                            {currentSubscription.planDetails?.duration || 'N/A'} Months
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Amount Paid</p>
                                        <p className="font-bold text-gray-800">
                                            ₹{(currentSubscription.finalPayableAmount || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Subscription Date</p>
                                        <p className="font-bold text-gray-800">
                                            {formatDate(currentSubscription.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                {/* Razorpay Details */}
                                {currentSubscription.razorpaySubscriptionId && (
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                        <p className="text-sm text-blue-600 font-medium mb-2">Payment Details</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Subscription ID</span>
                                                <span className="font-mono text-sm text-gray-800">
                                                    {currentSubscription.razorpaySubscriptionId}
                                                </span>
                                            </div>
                                            {currentSubscription.subscriptionDetails?.current_start && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Billing Start</span>
                                                    <span className="font-medium text-gray-800">
                                                        {formatDate(new Date(currentSubscription.subscriptionDetails.current_start * 1000))}
                                                    </span>
                                                </div>
                                            )}
                                            {currentSubscription.subscriptionDetails?.current_end && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Billing End</span>
                                                    <span className="font-medium text-gray-800">
                                                        {formatDate(new Date(currentSubscription.subscriptionDetails.current_end * 1000))}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Features */}
                                {currentSubscription.planDetails?.features && (
                                    <div>
                                        <p className="text-sm text-gray-500 mb-3 font-medium">Included Features</p>
                                        <ul className="space-y-2">
                                            {currentSubscription.planDetails.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-3 text-gray-700">
                                                    <FiCheck className="text-green-500" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default B2BVendorSubscription;
