import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiInfo, FiCreditCard, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { initializeRazorpayCheckout, handlePaymentSuccess } from '../../../shared/services/paymentService';
import ManageRenewal from './subscription/ManageRenewal';
import BillingHistory from './subscription/BillingHistory';
import SupportTickets from './subscription/SupportTickets';

const VendorSubscription = () => {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null); // Track which tier is being processed
  const [showManageRenewal, setShowManageRenewal] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);

  useEffect(() => {
    loadData();
    
    // Refresh subscription data when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    
    // Refresh on window focus (user switches back to browser)
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
      // Add cache-busting timestamp to ensure fresh data
      const timestamp = new Date().getTime();
      const [tiersResponse, subscriptionResponse] = await Promise.all([
        api.get('/vendor/subscriptions/tiers'),
        api.get(`/vendor/subscriptions/current?t=${timestamp}`)
      ]);

      if (tiersResponse.success) {
        setTiers(tiersResponse.data || []);
      }

      if (subscriptionResponse.success) {
        const sub = subscriptionResponse.data;
        // Handle null subscription (vendor hasn't subscribed yet)
        if (sub) {
          // Parse endDate properly
          const endDateValue = sub.endDate ? new Date(sub.endDate) : null;
          
          setCurrentSubscription({
            tierName: sub.tierId?.name || 'Free',
            status: sub.status || 'pending',
            billingCycle: sub.billingCycle,
            endDate: endDateValue ? endDateValue.toLocaleDateString() : null,
            endDateRaw: endDateValue, // Store raw date for comparison
            autoRenew: sub.autoRenew,
            usage: {
              reelsUploaded: sub.usage?.reelsUploaded || 0,
              extraReelsCharged: sub.usage?.extraReelsCharged || 0,
              limit: sub.tierId?.reelLimit === -1 ? -1 : (sub.tierId?.reelLimit || 0)
            },
            updatedAt: sub.updatedAt || sub.createdAt, // Track when subscription was last updated
            subscriptionId: sub._id || sub.id
          });
        } else {
          // No subscription found - this is normal for new vendors
          setCurrentSubscription(null);
        }
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tierId) => {
    if (processingPayment) return; // Prevent multiple clicks

    try {
      setProcessingPayment(tierId); // Set the specific tier ID being processed
      
      // Initialize subscription and get Razorpay order
      const response = await api.post('/vendor/subscriptions/initialize', { tierId });

      if (!response.success) {
        throw new Error(response.message || 'Failed to initialize subscription');
      }

      const { subscription, razorpay, vendorId, tierId: responseTierId } = response.data;

      // If free tier, subscription is already activated
      if (!razorpay) {
        toast.success('Free subscription activated successfully!');
        await loadData(); // Reload data
        setProcessingPayment(null);
        return;
      }

      // For paid tiers, open Razorpay payment
      if (!razorpay.orderId || !razorpay.keyId) {
        throw new Error('Payment gateway not configured properly');
      }

      // Get vendor info for prefill
      const vendorInfo = JSON.parse(localStorage.getItem('vendor') || '{}');
      
      // Get tier name from tiers list for description
      const selectedTier = tiers.find(t => (t._id || t.id) === tierId);
      const tierName = selectedTier?.name || 'Plan';

      await initializeRazorpayCheckout({
        key: razorpay.keyId,
        amount: razorpay.amount / 100, // Convert from paise to rupees
        currency: razorpay.currency || 'INR',
        name: 'Appzeto',
        description: `Subscription Payment - ${tierName}`,
        orderId: razorpay.orderId,
        prefill: {
          name: vendorInfo.businessName || vendorInfo.storeName || '',
          email: vendorInfo.email || '',
          contact: vendorInfo.phone || '',
        },
        handler: async (paymentResponse) => {
          try {
            // Verify payment
            const paymentData = handlePaymentSuccess(paymentResponse);
            
            // Pass vendorId and tierId instead of subscriptionId (subscription doesn't exist yet)
            const verifyResponse = await api.post('/vendor/subscriptions/verify-payment', {
              vendorId: vendorId || vendorInfo._id || vendorInfo.id,
              tierId: responseTierId || tierId,
              razorpayOrderId: paymentData.razorpayOrderId,
              razorpayPaymentId: paymentData.razorpayPaymentId,
              razorpaySignature: paymentData.razorpaySignature,
            });

            if (verifyResponse.success) {
              toast.success('Payment successful! Subscription activated.');
              await loadData(); // Reload data
            } else {
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Payment verification failed';
            toast.error(errorMessage);
            
            // If payment failed but amount was deducted, show option to raise ticket
            if (errorMessage.includes('failed') || errorMessage.includes('deducted')) {
              setTimeout(() => {
                if (window.confirm('Payment failed but amount deducted? Raise a support ticket for quick resolution.')) {
                  // This will be handled by SupportTickets component
                  // You can trigger it programmatically if needed
                }
              }, 2000);
            }
          } finally {
            setProcessingPayment(null);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(null);
            // Don't show error toast for user cancellation - it's expected behavior
            // Subscription won't be created, which is correct
          },
        },
      });
    } catch (error) {
      console.error('Subscription error:', error);
      setProcessingPayment(null);
      toast.error(error.response?.data?.message || error.message || 'Failed to process subscription. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading subscription data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg font-semibold text-gray-800">Current Plan:</span>
              {currentSubscription ? (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                  {currentSubscription.tierName}
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-bold">
                  No Active Plan
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mb-4">
              {currentSubscription ? (
                <>
                  Your subscription is <span className="font-semibold capitalize">{currentSubscription.status}</span>
                  {currentSubscription.endDate && (
                    <span>
                      {' '}and {currentSubscription.status === 'active' ? 'will renew' : 'expires'} on{' '}
                      <span className="font-semibold">{currentSubscription.endDate}</span>
                    </span>
                  )}
                  {currentSubscription.updatedAt && (
                    <span className="block text-xs text-gray-400 mt-1">
                      Last updated: {new Date(currentSubscription.updatedAt).toLocaleString()}
                    </span>
                  )}
                </>
              ) : (
                'You don\'t have an active subscription. Please select a plan below to get started.'
              )}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowManageRenewal(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <FiRefreshCw /> Manage Renewal
              </button>
              <button 
                onClick={() => setShowBillingHistory(true)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
              >
                <FiCreditCard /> Billing History
              </button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-blue-900">Usage Tracking</h4>
              <span className="text-xs text-blue-700 font-medium">Monthly Limit</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-800">Reel Uploads</span>
                  <span className="font-bold text-blue-900">
                    {currentSubscription ? (
                      <>
                        {currentSubscription.usage.reelsUploaded} / {currentSubscription.usage.limit === -1 ? '∞' : currentSubscription.usage.limit}
                      </>
                    ) : (
                      '0 / 0'
                    )}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      currentSubscription && currentSubscription.usage.limit !== -1 && 
                      (currentSubscription.usage.reelsUploaded / currentSubscription.usage.limit) > 0.9 
                        ? 'bg-red-500' 
                        : 'bg-blue-600'
                    }`}
                    style={{ 
                      width: `${currentSubscription 
                        ? (currentSubscription.usage.limit === -1 ? 100 : Math.min((currentSubscription.usage.reelsUploaded / currentSubscription.usage.limit) * 100, 100))
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              {currentSubscription && currentSubscription.usage.extraReelsCharged > 0 && (
                <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-xs text-gray-600">Extra Reels Charges</span>
                  <span className="font-bold text-gray-900">₹{currentSubscription.usage.extraReelsCharged}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Choose the Right Plan for Your Business</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Scale your content with our flexible monthly plans. All plans include automated renewal and detailed usage tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {tiers.map((tier) => {
          const isCurrentPlan = currentSubscription?.tierName === tier.name;
          const isFree = tier.priceMonthly === 0;
          const tierId = tier._id || tier.id;
          const isProcessing = processingPayment === tierId;
          
          return (
            <motion.div 
              key={tierId}
              whileHover={{ y: -5 }}
              className={`relative bg-white rounded-3xl p-8 shadow-sm border flex flex-col ${
                isCurrentPlan ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-100'
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                  Current Plan
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    ₹{tier.priceMonthly}
                  </span>
                  <span className="text-gray-500">
                    /mo
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {tier.reelLimit === -1 ? 'Unlimited reels' : `${tier.reelLimit} reels included`}
                </p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {tier.features && tier.features.length > 0 ? (
                  tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-600 text-sm">
                      <FiCheck className="text-green-500 mt-1 flex-shrink-0" />
                      {typeof feature === 'string' ? feature : feature.name || feature}
                    </li>
                  ))
                ) : (
                  // Fallback features based on tier
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
                        <FiCheck className="text-green-500 mt-1 flex-shrink-0" />
                        {feature}
                      </li>
                    ));
                  })()
                )}
              </ul>

              <button 
                onClick={() => handleSubscribe(tierId)}
                disabled={isCurrentPlan || isProcessing}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  isCurrentPlan
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isProcessing
                  ? 'bg-blue-400 text-white cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'
                }`}
              >
                {isProcessing ? 'Processing...' : isCurrentPlan ? 'Current Plan' : 'Select Plan'}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Support Tickets Section - Only Subscription Related */}
      <div className="mt-10">
        <SupportTickets subscriptionOnly={true} />
      </div>

      <div className="mt-16 bg-blue-50 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl flex-shrink-0">
          <FiInfo />
        </div>
        <div>
          <h4 className="text-xl font-bold text-blue-900 mb-2">Need a custom plan?</h4>
          <p className="text-blue-800">For enterprises with high volume requirements, we offer custom tailored solutions. Contact our sales team for a consultation.</p>
        </div>
        <button className="px-8 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap">
          Contact Sales
        </button>
      </div>

      {/* Modals */}
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
