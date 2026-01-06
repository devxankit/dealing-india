import React, { useState } from 'react';
import { FiX, FiAlertCircle, FiCreditCard, FiMessageSquare } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const CreateTicketModal = ({ isOpen, onClose, onSubmit, subscriptionOnly = false }) => {
  // Set default category based on subscriptionOnly prop
  const defaultCategory = subscriptionOnly ? 'subscription' : 'other';
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: defaultCategory,
    priority: 'medium',
    issueType: 'other', // payment_failed, refund_request, order_issue, product_issue, billing_issue, other
    transactionId: '',
    amount: ''
  });
  const [loading, setLoading] = useState(false);

  const issueTypes = [
    { value: 'payment_failed', label: 'Payment Failed but Amount Deducted', icon: FiCreditCard },
    { value: 'refund_request', label: 'Refund Request', icon: FiAlertCircle },
    { value: 'order_issue', label: 'Order Related Issue', icon: FiMessageSquare },
    { value: 'product_issue', label: 'Product Related Issue', icon: FiMessageSquare },
    { value: 'billing_issue', label: 'Billing Issue', icon: FiCreditCard },
    { value: 'other', label: 'Other Issue', icon: FiMessageSquare }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      // Reset form
      setFormData({
        subject: '',
        description: '',
        category: subscriptionOnly ? 'subscription' : 'other',
        priority: 'medium',
        issueType: 'other',
        transactionId: '',
        amount: ''
      });
    } catch (error) {
      console.error('Error submitting ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueTypeChange = (issueType) => {
    // Auto-set category based on issue type when subscriptionOnly
    let category = formData.category;
    if (subscriptionOnly) {
      // Map issue types to subscription-related categories
      const categoryMap = {
        payment_failed: 'payment',
        refund_request: 'billing',
        billing_issue: 'billing',
        order_issue: subscriptionOnly ? 'subscription' : 'other',
        product_issue: subscriptionOnly ? 'subscription' : 'other',
        other: 'subscription'
      };
      category = categoryMap[issueType] || 'subscription';
    } else {
      // For general support, use technical or other
      category = ['order_issue', 'product_issue'].includes(issueType) ? 'technical' : 'other';
    }
    
    // Auto-fill subject based on issue type
    const issueTypeLabels = {
      payment_failed: 'Payment Failed but Amount Deducted',
      refund_request: 'Refund Request',
      order_issue: 'Order Related Issue',
      product_issue: 'Product Related Issue',
      billing_issue: 'Billing Issue',
      other: subscriptionOnly ? 'Subscription Issue' : 'General Issue'
    };
    
    if (!formData.subject || formData.subject === issueTypeLabels[formData.issueType]) {
      setFormData({ ...formData, issueType, category, subject: issueTypeLabels[issueType] });
    } else {
      setFormData({ ...formData, issueType, category });
    }
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
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiMessageSquare className="text-blue-600 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Raise Support Ticket</h2>
                <p className="text-sm text-gray-500">Get help with your account and orders</p>
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
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Issue Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What issue are you facing?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {issueTypes.map((issue) => {
                  const Icon = issue.icon;
                  return (
                    <button
                      key={issue.value}
                      type="button"
                      onClick={() => handleIssueTypeChange(issue.value)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formData.issueType === issue.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`text-lg ${
                          formData.issueType === issue.value ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          formData.issueType === issue.value ? 'text-blue-600' : 'text-gray-700'
                        }`}>
                          {issue.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief description of your issue"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please provide detailed information about your issue..."
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                required
              />
            </div>

            {/* Additional Details for Payment Failed */}
            {formData.issueType === 'payment_failed' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="text-yellow-600 text-lg mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      Payment Failed - Additional Information Required
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Transaction ID / Order ID
                        </label>
                        <input
                          type="text"
                          value={formData.transactionId}
                          onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                          placeholder="e.g., order_1234567890"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Amount Deducted (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="e.g., 99"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateTicketModal;

