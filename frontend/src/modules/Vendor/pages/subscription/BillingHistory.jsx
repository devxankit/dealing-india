import React, { useState, useEffect } from 'react';
import { FiX, FiCreditCard, FiDownload, FiCalendar, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const BillingHistory = ({ isOpen, onClose }) => {
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, failed, pending

  useEffect(() => {
    if (isOpen) {
      loadBillingHistory();
    }
  }, [isOpen, filter]);

  const loadBillingHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vendor/subscriptions/billing-history', { 
        params: { filter } 
      });
      
      if (response.data && response.data.success) {
        // Transform the data to ensure date is a Date object
        const data = response.data.data || [];
        const transformedData = data.map(item => ({
          ...item,
          date: item.date ? new Date(item.date) : new Date()
        }));
        setBillingHistory(transformedData);
      } else {
        // If no data or empty response, set empty array
        setBillingHistory([]);
      }
    } catch (error) {
      console.error('Error loading billing history:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load billing history';
      
      // Only show error toast if it's not a network error or 404
      if (error.response?.status !== 404) {
        toast.error(errorMessage);
      }
      
      // Set empty array on error so UI shows "No Billing History" message
      setBillingHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="text-green-500" />;
      case 'failed':
        return <FiXCircle className="text-red-500" />;
      case 'pending':
        return <FiClock className="text-yellow-500" />;
      default:
        return <FiClock className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiCreditCard className="text-blue-600 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Billing History</h2>
                <p className="text-sm text-gray-500">View all your subscription transactions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiX className="text-gray-500 text-xl" />
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 pt-4 pb-2 border-b border-gray-200">
            <div className="flex gap-2">
              {['all', 'completed', 'pending', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : billingHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FiCreditCard className="text-gray-300 text-6xl mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Billing History</h3>
                <p className="text-sm text-gray-500">You don't have any transactions yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {billingHistory.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                          <FiCreditCard className="text-blue-600 text-xl" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-800">
                              {transaction.type === 'subscription_payment' 
                                ? `Subscription Payment - ${transaction.tierName || 'Plan'}`
                                : 'Extra Reel Charge'}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(transaction.status)}`}>
                              {getStatusIcon(transaction.status)}
                              {transaction.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">Transaction: {transaction.transactionCode}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <FiCalendar className="text-gray-400" />
                              <span>{formatDate(transaction.date)} at {formatTime(transaction.date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="capitalize">{transaction.method}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">₹{transaction.amount}</p>
                        {transaction.invoiceUrl && (
                          <button className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                            <FiDownload className="text-sm" />
                            Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing <strong>{billingHistory.length}</strong> transaction{billingHistory.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BillingHistory;

