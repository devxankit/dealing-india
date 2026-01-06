import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiCheckCircle, FiClock, FiXCircle, FiAlertCircle, FiCalendar, FiUser, FiMessageSquare, FiRefreshCw, FiSend } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { initializeSocket, getSocket } from '../../../shared/utils/socket';

const TicketDetailModal = ({ isOpen, onClose, ticket, onUpdate }) => {
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setMessages(ticket.messages || []);
      
      // Initialize socket and join ticket room
      const token = localStorage.getItem('token');
      if (token) {
        const socket = initializeSocket(token);
        socketRef.current = socket;

        if (socket) {
          socket.emit('join_ticket_room', { ticketId: ticket._id });

          socket.on('ticket_message', (newMessage) => {
            console.log('Received new ticket message:', newMessage);
            setMessages((prev) => {
              const exists = prev.find(m => m._id === newMessage._id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
            setTimeout(scrollToBottom, 100);
          });

          socket.on('ticket_updated', (updatedData) => {
            if (onUpdate) onUpdate();
          });
        }
      }
      
      setTimeout(scrollToBottom, 300);
    }

    return () => {
      if (socketRef.current && ticket) {
        socketRef.current.emit('leave_ticket_room', { ticketId: ticket._id });
        socketRef.current.off('ticket_message');
        socketRef.current.off('ticket_updated');
      }
    };
  }, [isOpen, ticket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen || !ticket) return null;

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    try {
      setLoading(true);
      const response = await api.post(`/user/support-tickets/${ticket._id}/reply`, {
        message: reply.trim()
      });

      if (response.success) {
        toast.success('Reply sent successfully');
        setReply('');
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <FiClock className="text-yellow-500" />;
      case 'in_progress':
        return <FiClock className="text-blue-500" />;
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
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-800">{ticket.subject}</h2>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                  {getStatusIcon(ticket.status)}
                  {ticket.status ? ticket.status.replace('_', ' ') : 'open'}
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
            {/* Ticket Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <FiCalendar className="text-gray-400" />
                  <span>Created</span>
                </div>
                <p className="font-medium text-gray-800">{formatDate(ticket.createdAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <FiCalendar className="text-gray-400" />
                  <span>Last Updated</span>
                </div>
                <p className="font-medium text-gray-800">{formatDate(ticket.updatedAt)}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>

            {/* Admin Response */}
            {ticket.adminResponse && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FiUser className="text-gray-400" />
                  Admin Response
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.adminResponse}</p>
                  {ticket.respondedBy && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs text-gray-600">
                        Responded by: {ticket.respondedBy?.name || ticket.respondedBy?.email || 'Admin'}
                        {ticket.respondedAt && (
                          <span className="ml-2">
                            on {formatDate(ticket.respondedAt)}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages/Conversation History */}
            {messages && messages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FiMessageSquare className="text-gray-400" />
                  Conversation History
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {messages.map((message, index) => (
                    <div
                      key={message._id || index}
                      className={`p-4 rounded-lg ${
                        message.senderRole === 'admin'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${
                            message.senderRole === 'admin' ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            {message.senderRole === 'admin' ? 'Admin' : 'You'}
                          </span>
                          {message.senderId?.name && (
                            <span className="text-xs text-gray-500">
                              ({message.senderId.name})
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.message}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Status History */}
            {ticket.statusHistory && ticket.statusHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FiRefreshCw className="text-gray-400" />
                  Status History
                </h3>
                <div className="space-y-2">
                  {ticket.statusHistory.map((history, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        history.status === 'open' ? 'bg-yellow-500' :
                        history.status === 'in_progress' ? 'bg-blue-500' :
                        history.status === 'resolved' ? 'bg-green-500' :
                        'bg-gray-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800 capitalize">
                            {history.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(history.timestamp || history.createdAt)}
                          </span>
                        </div>
                        {history.note && (
                          <p className="text-xs text-gray-600 mt-1">{history.note}</p>
                        )}
                        {history.changedBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            Changed by: {history.changedBy?.name || history.changedBy?.email || history.changedByRole || 'System'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Form */}
            {ticket.status !== 'closed' && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <FiSend className="text-gray-400" />
                  Send a Reply
                </h3>
                <form onSubmit={handleReply} className="space-y-4">
                  <div>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your message here..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !reply.trim()}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiSend className="text-sm" />
                      )}
                      {loading ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
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

export default TicketDetailModal;
