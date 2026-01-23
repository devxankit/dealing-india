import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheck, FiInfo, FiCreditCard, FiRefreshCw, FiX,
  FiAlertTriangle, FiCalendar, FiDollarSign, FiPackage,
  FiCheckCircle, FiClock, FiExternalLink, FiStar, FiTrendingUp
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import ManageRenewal from './subscription/ManageRenewal';
import BillingHistory from './subscription/BillingHistory';
import SupportTickets from './subscription/SupportTickets';
import subscriptionService from '../services/subscriptionService';

const VendorSubscription = () => {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [showManageRenewal, setShowManageRenewal] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadData();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    const handleFocus = () => {
      loadData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();

      // Fetch tiers and subscriptions
      const [tiersResponse, subscriptionsResponse] = await Promise.all([
        api.get('/vendor/subscriptions/tiers'),
        subscriptionService.getAllSubscriptions()
      ]);

      if (tiersResponse.success) {
        setTiers(tiersResponse.data || []);
      }

      // Find active or cancelled subscription
      const activeSub = subscriptionsResponse.find(sub => sub.status === 'active') ||
        subscriptionsResponse.find(sub => sub.status === 'cancelled');
      if (activeSub) {
        // Get tier details
        const tierInfo = tiersResponse.data?.find(t => t._id === activeSub.planId);
        setCurrentSubscription({
          ...activeSub,
          tierName: tierInfo?.name || 'Unknown Plan',
          tierDetails: tierInfo,
          usage: {
            reelsUploaded: activeSub.usage?.reelsUploaded || 0,
            extraReelsCharged: activeSub.usage?.extraReelsCharged || 0,
            limit: tierInfo?.reelLimit === -1 ? -1 : (tierInfo?.reelLimit || 0)
          }
        });
      } else {
        setCurrentSubscription(null);
      }

      setSubscriptionHistory(subscriptionsResponse);

    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tierId) => {
    if (processingPayment) return;

    try {
      setProcessingPayment(tierId);

      // Create subscription using Razorpay subscription
      const subscription = await subscriptionService.createSubscription(tierId);

      // If subscription has razorpay URL, redirect to payment
      if (subscription.razorpaySubscriptionUrl) {
        toast.success('Redirecting to payment page...');
        window.open(subscription.razorpaySubscriptionUrl, '_blank');

        setTimeout(() => {
          loadData();
        }, 2000);
      } else if (subscription.status === 'active') {
        toast.success('Free subscription activated successfully!');
        loadData();
      } else {
        toast.info('Subscription created. Please complete payment.');
      }

    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to process subscription');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription || cancellingSubscription) return;

    try {
      setCancellingSubscription(true);

      await subscriptionService.cancelSubscription(currentSubscription._id);

      toast.success('Subscription cancelled successfully');
      setShowCancelModal(false);
      loadData();

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

  const getTierIcon = (tierName) => {
    const icons = {
      'Free': <FiPackage />,
      'Starter': <FiTrendingUp />,
      'Professional': <FiStar />,
      'Premium': <FiCheckCircle />
    };
    return icons[tierName] || <FiPackage />;
  };

  if (loading) {
    return (
      <div className="p-6 text-center min-h-[400px] flex items-center justify-center">
        <div>
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">My Subscription</h1>
          <p className="text-gray-600">Manage your vendor account subscription and billing.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh subscription data"
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
          className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 mb-10 text-white shadow-2xl relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Section */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl">
                    {getTierIcon(currentSubscription.tierName)}
                  </div>
                  <div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                      {currentSubscription.tierName}
                    </span>
                    <p className="text-blue-100 text-sm mt-1">
                      Status: <span className="font-semibold capitalize">{currentSubscription.status}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
                      <FiDollarSign />
                      Amount Paid
                    </div>
                    <p className="text-xl font-bold">
                      ₹{(currentSubscription.finalPayableAmount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
                      <FiCalendar />
                      Subscribed On
                    </div>
                    <p className="text-xl font-bold">
                      {formatDate(currentSubscription.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowDetailsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-semibold"
                  >
                    <FiInfo /> View Details
                  </button>
                
                  {currentSubscription.status === 'active' && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-100 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-semibold border border-red-300/30"
                    >
                      <FiX /> Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Right Section - Usage */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-lg">Usage Tracking</h4>
                  <span className="text-xs text-blue-100 font-medium">Monthly Limit</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-blue-100">Reel Uploads</span>
                      <span className="font-bold">
                        {currentSubscription.usage.reelsUploaded} / {currentSubscription.usage.limit === -1 ? '∞' : currentSubscription.usage.limit}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${currentSubscription.usage.limit !== -1 &&
                          (currentSubscription.usage.reelsUploaded / currentSubscription.usage.limit) > 0.9
                          ? 'bg-red-400'
                          : 'bg-white'
                          }`}
                        style={{
                          width: `${currentSubscription.usage.limit === -1
                            ? 100
                            : Math.min((currentSubscription.usage.reelsUploaded / currentSubscription.usage.limit) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  {currentSubscription.usage.extraReelsCharged > 0 && (
                    <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl">
                      <span className="text-sm text-blue-100">Extra Reels Charges</span>
                      <span className="font-bold">₹{currentSubscription.usage.extraReelsCharged}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* No Active Subscription */}
      {!currentSubscription && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-6 mb-10 flex items-start gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FiInfo className="text-yellow-600 text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-yellow-800 mb-1">No Active Subscription</h3>
            <p className="text-yellow-700">
              You don't have an active subscription. Please select a plan below to get started.
            </p>
          </div>
        </div>
      )}

      {/* Pending Payment Notice */}
      {subscriptionHistory.some(sub => sub.status === 'pending') && !currentSubscription && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-8 flex items-start gap-4"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FiClock className="text-orange-600 text-xl" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-orange-800 mb-1">Pending Payment</h3>
            <p className="text-orange-700">
              You have a pending subscription. Please complete the payment to activate your subscription.
            </p>
            {subscriptionHistory.find(sub => sub.status === 'pending')?.razorpaySubscriptionUrl && (
              <a
                href={subscriptionHistory.find(sub => sub.status === 'pending').razorpaySubscriptionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Complete Payment
                <FiExternalLink />
              </a>
            )}
          </div>
        </motion.div>
      )}

      {/* Plans Section */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Choose the Right Plan for Your Business</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Scale your content with our flexible monthly plans. All plans include automated renewal and detailed usage tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {tiers.map((tier, index) => {
          const isCurrentPlan = currentSubscription?.tierName === tier.name;
          const isFree = tier.priceMonthly === 0;
          const tierId = tier._id || tier.id;
          const isProcessing = processingPayment === tierId;
          const isPremium = tier.name === 'Premium';
          const hasActiveSubscription = !!currentSubscription;

          return (
            <motion.div
              key={tierId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={!hasActiveSubscription || isCurrentPlan ? { y: -5 } : {}}
              className={`relative bg-white rounded-3xl p-8 shadow-lg border-2 flex flex-col ${isCurrentPlan
                ? 'border-blue-500 ring-4 ring-blue-50'
                : isPremium
                  ? 'border-purple-500 ring-4 ring-purple-50'
                  : 'border-gray-100'
                } ${hasActiveSubscription && !isCurrentPlan ? 'opacity-60' : ''}`}
            >
              {isCurrentPlan && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                  Current Plan
                </div>
              )}
              {isPremium && !isCurrentPlan && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                  Best Value
                </div>
              )}

              <div className="mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-2xl ${isCurrentPlan
                  ? 'bg-blue-100 text-blue-600'
                  : isPremium
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-500'
                  }`}>
                  {getTierIcon(tier.name)}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    ₹{tier.priceMonthly}
                  </span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {tier.reelLimit === -1 ? 'Unlimited reels' : `${tier.reelLimit} reels included`}
                </p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {tier.features && tier.features.length > 0 ? (
                  tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-600 text-sm">
                      <FiCheck className={`mt-1 flex-shrink-0 ${isCurrentPlan ? 'text-blue-500' : isPremium ? 'text-purple-500' : 'text-green-500'
                        }`} />
                      {typeof feature === 'string' ? feature : feature.name || feature}
                    </li>
                  ))
                ) : (
                  (() => {
                    const defaultFeatures = {
                      Free: [
                        'Cost per reel upload: ₹10',
                        'Basic features included',
                        'Automatic activation'
                      ],
                      Starter: [
                        '30 reels per month included',
                        'Additional reels at ₹10 each',
                        'Standard features included',
                        'Basic analytics'
                      ],
                      Professional: [
                        '100 reels per month included',
                        'Additional reels at ₹10 each',
                        'Enhanced features included',
                        'Advanced analytics',
                        'Priority support'
                      ],
                      Premium: [
                        'Unlimited reel uploads',
                        'Premium features included',
                        'No extra charges',
                        'Dedicated support',
                        'API Access'
                      ]
                    };
                    return (defaultFeatures[tier.name] || []).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-600 text-sm">
                        <FiCheck className={`mt-1 flex-shrink-0 ${isCurrentPlan ? 'text-blue-500' : isPremium ? 'text-purple-500' : 'text-green-500'
                          }`} />
                        {feature}
                      </li>
                    ));
                  })()
                )}
              </ul>

              {isCurrentPlan ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl font-bold bg-blue-100 text-blue-400 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : hasActiveSubscription ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full py-3 rounded-xl font-bold bg-gray-100 text-gray-400 cursor-not-allowed"
                  >
                    Not Available
                  </button>
                  <p className="text-xs text-center text-gray-500">
                    Available after current plan expires
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(tierId)}
                  disabled={isProcessing}
                  className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isProcessing
                    ? 'bg-gray-400 text-white cursor-wait'
                    : isPremium
                      ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'
                    }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    'Select Plan'
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Support Tickets Section */}
      <div className="mt-10">
        <SupportTickets subscriptionOnly={true} />
      </div>

      {/* Custom Plan CTA */}
      <div className="mt-16 bg-blue-50 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl flex-shrink-0">
          <FiInfo />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-xl font-bold text-blue-900 mb-2">Need a custom plan?</h4>
          <p className="text-blue-800">For enterprises with high volume requirements, we offer custom tailored solutions. Contact our sales team for a consultation.</p>
        </div>
        <button className="px-8 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap">
          Contact Sales
        </button>
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
                  Are you sure you want to cancel your <strong>{currentSubscription?.tierName}</strong> subscription?
                </p>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                <ul className="text-sm text-red-800 space-y-2">
                  <li>• Reel upload limits will apply</li>
                  <li>• Premium features will be disabled</li>
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
                    <p className="font-bold text-gray-800">{currentSubscription.tierName}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-1">Billing Cycle</p>
                    <p className="font-bold text-gray-800">Monthly</p>
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

                {/* Usage Stats */}
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm text-blue-600 font-medium mb-3">Usage Statistics</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Reels Uploaded</p>
                      <p className="font-bold text-xl text-gray-800">
                        {currentSubscription.usage.reelsUploaded}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Reel Limit</p>
                      <p className="font-bold text-xl text-gray-800">
                        {currentSubscription.usage.limit === -1 ? 'Unlimited' : currentSubscription.usage.limit}
                      </p>
                    </div>
                    {currentSubscription.usage.extraReelsCharged > 0 && (
                      <div className="col-span-2">
                        <p className="text-gray-600 text-sm">Extra Reel Charges</p>
                        <p className="font-bold text-xl text-gray-800">
                          ₹{currentSubscription.usage.extraReelsCharged}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Razorpay Details */}
                {currentSubscription.razorpaySubscriptionId && (
                  <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                    <p className="text-sm text-green-600 font-medium mb-2">Payment Details</p>
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Existing Modals */}
      <ManageRenewal
        isOpen={showManageRenewal}
        onClose={() => setShowManageRenewal(false)}
        subscription={currentSubscription}
        onUpdate={(updated) => {
          setCurrentSubscription(updated);
          setShowManageRenewal(false);
        }}
      />

      <BillingHistory
        isOpen={showBillingHistory}
        onClose={() => setShowBillingHistory(false)}
      />
    </div>
  );
};

export default VendorSubscription;
