import React, { useState } from 'react';
import { FiX, FiCheckCircle, FiClock, FiXCircle, FiAlertCircle, FiCalendar, FiUser, FiSend } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const TicketDetailModal = ({ isOpen, onClose, ticket, onUpdate }) => {
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  React.useEffect(() => {
    if (ticket) {
      setStatus(ticket.status || 'in_progress');
      setResponse('');
      // Load messages if ticket has messages array
      if (ticket.messages && Array.isArray(ticket.messages)) {
        setMessages(ticket.messages);
      } else {
        loadMessages();
      }
    }
  }, [ticket]);

  const loadMessages = async () => {
    if (!ticket?._id && !ticket?.id) return;
    try {
      setLoadingMessages(true);
      const response = await api.get(`/admin/support-tickets/${ticket._id || ticket.id}`);
      if (response.success && response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleRespond = async (e) => {
    e.preventDefault();
    
    if (!response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    try {
      setLoading(true);
      const responseData = await api.post(`/admin/support-tickets/${ticket._id || ticket.id}/respond`, {
        response: response.trim(),
        status: status,
      });

      if (responseData.success) {
        toast.success('Response sent successfully');
        setResponse('');
        // Reload messages
        await loadMessages();
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error(responseData.message || 'Failed to send response');
      }
    } catch (error) {
      console.error('Error responding to ticket:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to send response');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true);
      const response = await api.patch(`/admin/support-tickets/${ticket._id || ticket.id}/status`, {
        status: newStatus,
        note: `Status changed to ${newStatus}`,
      });

      if (response.success) {
        toast.success('Status updated successfully');
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !ticket) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <FiClock className="text-yellow-500" />;
      case 'in_progress':
        return <FiAlertCircle className="text-blue-500" />;
      case 'resolved':
        return <FiCheckCircle className="text-green-500" />;
      case 'closed':
        return <FiXCircle className="text-gray-500" />;
      default:
        return <FiAlertCircle className="text-blue-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-orange-100 text-orange-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-800">{ticket.subject}</h2>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                  {getStatusIcon(ticket.status)}
                  {ticket.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">Ticket #{ticket.ticketNumber}</p>
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
            {/* User/Vendor Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiUser className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {ticket.createdByRole === 'user' ? 'User' : 'Vendor'}
                </span>
                {ticket.createdByRole && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    ticket.createdByRole === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {ticket.createdByRole === 'user' ? 'User' : 'Vendor'}
                  </span>
                )}
              </div>
              {ticket.createdByRole === 'user' ? (
                <>
                  <p className="text-sm font-semibold text-gray-800">
                    {ticket.userId && typeof ticket.userId === 'object'
                      ? (ticket.userId.name || ticket.userId.email || 'Unknown User')
                      : 'Unknown User'}
                  </p>
                  {ticket.userId && typeof ticket.userId === 'object' && ticket.userId.email && (
                    <p className="text-xs text-gray-500">{ticket.userId.email}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-800">
                    {ticket.vendorId && typeof ticket.vendorId === 'object'
                      ? (ticket.vendorId.businessName || ticket.vendorId.storeName || 'Unknown Vendor')
                      : 'Unknown Vendor'}
                  </p>
                  {ticket.vendorId && typeof ticket.vendorId === 'object' && ticket.vendorId.email && (
                    <p className="text-xs text-gray-500">{ticket.vendorId.email}</p>
                  )}
                </>
              )}
            </div>

            {/* Ticket Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <FiCalendar className="text-gray-400" />
                  <span>Created</span>
                </div>
                <p className="font-medium text-gray-800">{formatDate(ticket.createdAt || ticket.created_at)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <FiCalendar className="text-gray-400" />
                  <span>Last Updated</span>
                </div>
                <p className="font-medium text-gray-800">{formatDate(ticket.updatedAt || ticket.updated_at)}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>

            {/* Additional Details */}
            {(ticket.transactionId || ticket.subscriptionId || ticket.amount) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Details</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  {ticket.transactionId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="font-medium text-gray-800">{ticket.transactionId}</span>
                    </div>
                  )}
                  {ticket.subscriptionId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subscription ID:</span>
                      <span className="font-medium text-gray-800">
                        {typeof ticket.subscriptionId === 'object' 
                          ? ticket.subscriptionId._id || ticket.subscriptionId.id
                          : ticket.subscriptionId}
                      </span>
                    </div>
                  )}
                  {ticket.amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-gray-800">₹{ticket.amount}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages Thread */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Conversation</h3>
              
              {loadingMessages ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-4 mb-4">
                  {messages.map((message) => {
                    const isAdmin = message.senderRole === 'admin';
                    return (
                      <div
                        key={message._id}
                        className={`rounded-lg p-4 ${
                          isAdmin
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAdmin ? 'bg-blue-100' : 'bg-gray-200'
                          }`}>
                            <span className={`text-xs font-semibold ${
                              isAdmin ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                              {isAdmin ? 'A' : message.senderId?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-800">
                                {isAdmin ? 'Admin' : (message.senderId?.name || 'User')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(message.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : ticket.adminResponse ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2 mb-2">
                    <FiCheckCircle className="text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-green-800 mb-1">
                        Responded on {formatDate(ticket.respondedAt || ticket.responded_at)}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.adminResponse}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle className="text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">No Response Yet</p>
                      <p className="text-xs text-yellow-700 mt-1">Please respond to this ticket below.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Response Form */}
              <form onSubmit={handleRespond} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder={`Enter your response to the ${ticket.createdByRole === 'user' ? 'user' : 'vendor'}...`}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Update Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FiSend className="text-sm" />
                    {loading ? 'Sending...' : 'Send Response'}
                  </button>
                </div>
              </form>

              {/* Quick Status Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Quick Actions:</p>
                <div className="flex gap-2">
                  {ticket.status !== 'resolved' && (
                    <button
                      onClick={() => handleStatusUpdate('resolved')}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium disabled:opacity-50"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {ticket.status !== 'closed' && (
                    <button
                      onClick={() => handleStatusUpdate('closed')}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TicketDetailModal;

