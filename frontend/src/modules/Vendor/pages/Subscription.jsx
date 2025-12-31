import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiInfo, FiCreditCard, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const VendorSubscription = () => {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for development
    const mockTiers = [
      {
        id: '1',
        name: 'Free',
        priceMonthly: 0,
        reelLimit: 0,
        extraReelPrice: 10,
        features: [
          'Cost per reel upload: ₹10',
          'Basic features included',
          'Automatic activation'
        ]
      },
      {
        id: '2',
        name: 'Starter',
        priceMonthly: 99,
        reelLimit: 30,
        extraReelPrice: 10,
        features: [
          '30 reels per month included',
          'Additional reels at ₹10 each',
          'Standard features included',
          'Basic analytics'
        ]
      },
      {
        id: '3',
        name: 'Professional',
        priceMonthly: 299,
        reelLimit: 100,
        extraReelPrice: 10,
        features: [
          '100 reels per month included',
          'Additional reels at ₹10 each',
          'Enhanced features included',
          'Advanced analytics',
          'Priority support'
        ]
      },
      {
        id: '4',
        name: 'Premium',
        priceMonthly: 499,
        reelLimit: -1,
        extraReelPrice: 0,
        features: [
          'Unlimited reel uploads',
          'Premium features included',
          'No extra charges',
          'Dedicated support',
          'API Access'
        ]
      }
    ];

    const mockCurrentSub = {
      tierName: 'Starter',
      status: 'active',
      billingCycle: 'monthly',
      endDate: '2024-01-15',
      autoRenew: true,
      usage: {
        reelsUploaded: 12,
        extraReelsCharged: 0,
        limit: 30
      }
    };

    setTiers(mockTiers);
    setCurrentSubscription(mockCurrentSub);
    setLoading(false);
  }, []);

  const handleSubscribe = (tierId) => {
    toast.success('Subscription process initiated!');
    // Implement API call here
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">My Subscription</h1>
        <p className="text-gray-600">Manage your vendor account subscription and billing.</p>
      </div>

      {currentSubscription && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg font-semibold text-gray-800">Current Plan:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                  {currentSubscription.tierName}
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                Your subscription is {currentSubscription.status} and will renew on {currentSubscription.endDate}.
              </p>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <FiRefreshCw /> Manage Renewal
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm">
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
                      {currentSubscription.usage.reelsUploaded} / {currentSubscription.usage.limit === -1 ? '∞' : currentSubscription.usage.limit}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        (currentSubscription.usage.reelsUploaded / currentSubscription.usage.limit) > 0.9 ? 'bg-red-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${currentSubscription.usage.limit === -1 ? 100 : Math.min((currentSubscription.usage.reelsUploaded / currentSubscription.usage.limit) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                {currentSubscription.usage.extraReelsCharged > 0 && (
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-blue-100">
                    <span className="text-xs text-gray-600">Extra Reels Charges</span>
                    <span className="font-bold text-gray-900">₹{currentSubscription.usage.extraReelsCharged}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Choose the Right Plan for Your Business</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Scale your content with our flexible monthly plans. All plans include automated renewal and detailed usage tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {tiers.map((tier) => (
          <motion.div 
            key={tier.id}
            whileHover={{ y: -5 }}
            className={`relative bg-white rounded-3xl p-8 shadow-sm border flex flex-col ${
              currentSubscription?.tierName === tier.name ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-100'
            }`}
          >
            {currentSubscription?.tierName === tier.name && (
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
              {tier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-600 text-sm">
                  <FiCheck className="text-green-500 mt-1 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSubscribe(tier.id)}
              disabled={currentSubscription?.tierName === tier.name}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                currentSubscription?.tierName === tier.name
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'
              }`}
            >
              {currentSubscription?.tierName === tier.name ? 'Current Plan' : 'Select Plan'}
            </button>
          </motion.div>
        ))}
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
    </div>
  );
};

export default VendorSubscription;
