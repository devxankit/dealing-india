import React, { useState, useEffect } from 'react';
import { FiX, FiRefreshCw, FiCalendar, FiCreditCard, FiAlertCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const ManageRenewal = ({ isOpen, onClose, subscription, onUpdate }) => {
  const [autoRenew, setAutoRenew] = useState(subscription?.autoRenew ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subscription) {
      setAutoRenew(subscription.autoRenew ?? true);
    }
  }, [subscription]);

  const handleToggleAutoRenew = async () => {
    try {
      setLoading(true);
      const response = await api.put('/vendor/subscriptions/renewal', { autoRenew: !autoRenew });
      
      if (response.success) {
        setAutoRenew(!autoRenew);
        toast.success(response.message || `Auto-renewal ${!autoRenew ? 'enabled' : 'disabled'} successfully`);
        
        if (onUpdate) {
          onUpdate({ ...subscription, autoRenew: !autoRenew });
        }
      } else {
        throw new Error(response.message || 'Failed to update auto-renewal setting');
      }
    } catch (error) {
      console.error('Error updating auto-renewal:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update auto-renewal setting';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    // TODO: Implement cancel subscription flow
    toast.error('Cancel subscription feature coming soon');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiRefreshCw className="text-blue-600 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Manage Renewal</h2>
                <p className="text-sm text-gray-500">Control your subscription renewal settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiX className="text-gray-500 text-xl" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Current Plan Info */}
            {subscription ? (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Plan</p>
                    <h3 className="text-lg font-bold text-gray-800">{subscription.tierName}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subscription.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {subscription.status}
                  </span>
                </div>
                {subscription.endDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiCalendar className="text-gray-400" />
                    <span>Renews on: <strong>{subscription.endDate}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 flex items-start gap-3">
                <FiAlertCircle className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">No Active Subscription</p>
                  <p className="text-xs text-yellow-700 mt-1">Please subscribe to a plan to manage renewal settings.</p>
                </div>
              </div>
            )}

            {/* Auto-Renewal Toggle */}
            {subscription && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">Auto-Renewal</h3>
                    <p className="text-sm text-gray-500">
                      Automatically renew your subscription when it expires
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRenew}
                      onChange={handleToggleAutoRenew}
                      disabled={loading}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {autoRenew ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>Auto-renewal is ON.</strong> Your subscription will automatically renew on {subscription.endDate || 'the expiry date'}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Auto-renewal is OFF.</strong> Your subscription will expire on {subscription.endDate || 'the expiry date'} and you'll need to manually renew.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Billing Information */}
            {subscription && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Billing Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Billing Cycle</span>
                    <span className="text-sm font-medium text-gray-800 capitalize">
                      {subscription.billingCycle || 'Monthly'}
                    </span>
                  </div>
                  {subscription.endDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Next Billing Date</span>
                      <span className="text-sm font-medium text-gray-800">
                        {subscription.endDate}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payment Method</span>
                    <div className="flex items-center gap-2">
                      <FiCreditCard className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-800">
                        {subscription.paymentMethod || 'Razorpay'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cancel Subscription */}
            {subscription && subscription.status === 'active' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Cancel Subscription</h3>
                <p className="text-sm text-red-700 mb-4">
                  Canceling your subscription will stop auto-renewal. You'll continue to have access until {subscription.endDate || 'the end of your billing period'}.
                </p>
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ManageRenewal;

