import React, { useState, useEffect } from 'react';
import { FiMessageSquare, FiPlus, FiAlertCircle, FiCheckCircle, FiClock, FiXCircle, FiChevronRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';
import CreateTicketModal from './CreateTicketModal';
import TicketDetailModal from './TicketDetailModal';

const SupportTickets = ({ subscriptionOnly = false }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, resolved, closed
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [filter, subscriptionOnly]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = { 
        status: filter !== 'all' ? filter : undefined
      };
      
      // Don't pass category filter - we'll filter client-side
      // Backend doesn't support multiple categories in single query
      
      const response = await api.get('/vendor/support-tickets', { params });
      
      console.log('Tickets API Response:', response);
      
      // API interceptor returns response.data directly, so response is already the backend response
      if (response && response.success !== false) {
        let ticketsData = response.data || [];
        
        if (Array.isArray(ticketsData)) {
          // Filter tickets based on subscriptionOnly prop
          if (subscriptionOnly) {
            // Only show subscription, billing, or payment related tickets
            ticketsData = ticketsData.filter(ticket => 
              ticket.category && ['subscription', 'billing', 'payment'].includes(ticket.category)
            );
          } else {
            // Show only general tickets (technical, other)
            ticketsData = ticketsData.filter(ticket => 
              ticket.category && ['technical', 'other'].includes(ticket.category)
            );
          }
          
          setTickets(ticketsData);
        } else {
          console.error('API returned invalid data format:', response);
          setTickets([]);
        }
      } else {
        console.error('API returned success: false', response);
        setTickets([]);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Don't show error toast, just use empty array
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (ticketData) => {
    try {
      // Ensure category is set correctly based on subscriptionOnly
      let category = ticketData.category || 'other';
      if (subscriptionOnly) {
        // Force subscription-related categories
        if (!['subscription', 'billing', 'payment'].includes(category)) {
          category = 'subscription';
        }
      } else {
        // Force general categories
        if (!['technical', 'other'].includes(category)) {
          category = 'other';
        }
      }
      
      const response = await api.post('/vendor/support-tickets', {
        subject: ticketData.subject,
        description: ticketData.description,
        category: category,
        issueType: ticketData.issueType,
        priority: ticketData.priority,
        transactionId: ticketData.transactionId || null,
        amount: ticketData.amount ? parseFloat(ticketData.amount) : null,
      });

      if (response.success) {
        setShowCreateModal(false);
        toast.success('Support ticket created successfully');
        await loadTickets(); // Reload tickets
      } else {
        throw new Error(response.message || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create support ticket');
    }
  };

  const handleTicketUpdate = async () => {
    if (selectedTicket) {
      try {
        const response = await api.get(`/vendor/support-tickets/${selectedTicket._id || selectedTicket.id}`);
        if (response.success) {
          setSelectedTicket(response.data);
        }
      } catch (error) {
        console.error('Error refreshing ticket details:', error);
      }
    }
    await loadTickets();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <FiClock className="text-yellow-500" />;
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
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Support Tickets</h3>
          <p className="text-sm text-gray-500">
            {subscriptionOnly 
              ? 'Get help with your subscription, billing, and payment issues' 
              : 'Get help with your account and orders'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <FiPlus className="text-sm" />
          Raise Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['all', 'open', 'resolved', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-8">
          <FiMessageSquare className="text-gray-300 text-4xl mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.slice(0, 5).map((ticket) => (
            <motion.div
              key={ticket._id || ticket.id}
              whileHover={{ scale: 1.01 }}
              onClick={async () => {
                try {
                  // Fetch full ticket details
                  const response = await api.get(`/vendor/support-tickets/${ticket._id || ticket.id}`);
                  if (response.success) {
                    setSelectedTicket(response.data);
                    setShowDetailModal(true);
                  } else {
                    // Fallback to ticket from list
                    setSelectedTicket(ticket);
                    setShowDetailModal(true);
                  }
                } catch (error) {
                  console.error('Error loading ticket details:', error);
                  // Fallback to ticket from list
                  setSelectedTicket(ticket);
                  setShowDetailModal(true);
                }
              }}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-800 text-sm">{ticket.subject}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{ticket.description}</p>
                  {ticket.adminResponse && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                      <div className="flex items-start gap-2">
                        <FiCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-green-800 mb-0.5">Admin Response:</p>
                          <p className="text-green-700 line-clamp-1">{ticket.adminResponse}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>#{ticket.ticketNumber}</span>
                    <span>•</span>
                    <span>{formatDate(ticket.createdAt || ticket.created_at)}</span>
                  </div>
                </div>
                <FiChevronRight className="text-gray-400 ml-2 flex-shrink-0" />
              </div>
            </motion.div>
          ))}
          
          {tickets.length > 5 && (
            <button
              onClick={() => {
                // TODO: Navigate to full tickets page
                toast.info('View all tickets feature coming soon');
              }}
              className="w-full py-2 text-blue-600 font-semibold text-sm hover:underline"
            >
              View All Tickets ({tickets.length})
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTicket}
        subscriptionOnly={subscriptionOnly}
      />

      <TicketDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        onUpdate={handleTicketUpdate}
      />
    </div>
  );
};

export default SupportTickets;

