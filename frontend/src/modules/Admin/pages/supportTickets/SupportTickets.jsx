import React, { useState, useEffect } from 'react';
import { FiMessageSquare, FiCheckCircle, FiClock, FiXCircle, FiAlertCircle, FiChevronRight, FiSearch, FiFilter } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';
import TicketDetailModal from './TicketDetailModal';

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, in_progress, resolved, closed
  const [priorityFilter, setPriorityFilter] = useState('all'); // all, high, medium, low
  const [categoryFilter, setCategoryFilter] = useState('subscription');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [filter, priorityFilter, categoryFilter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/support-tickets', {
        params: {
          status: filter !== 'all' ? filter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          category: categoryFilter,
        },
      });

      if (response.success) {
        let filteredTickets = response.data || [];

        // Apply search filter
        if (searchQuery.trim()) {
          filteredTickets = filteredTickets.filter(
            (ticket) =>
              ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              ticket.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (ticket.vendorId && typeof ticket.vendorId === 'object' && (
                ticket.vendorId.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ticket.vendorId.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ticket.vendorId.email?.toLowerCase().includes(searchQuery.toLowerCase())
              ))
          );
        }

        setTickets(filteredTickets);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load support tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketUpdate = () => {
    loadTickets();
    setShowDetailModal(false);
    setSelectedTicket(null);
  };

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
      month: 'short',
      day: 'numeric',
    });
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Support Tickets (Subscriptions)</h3>
          <p className="text-sm text-gray-500">Manage and respond to vendor subscription support tickets</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <FiClock className="text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Open</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{openCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <FiAlertCircle className="text-blue-600" />
            <span className="text-sm font-medium text-blue-800">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{inProgressCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <FiCheckCircle className="text-green-600" />
            <span className="text-sm font-medium text-green-800">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{resolvedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                loadTickets();
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <FiMessageSquare className="text-gray-300 text-5xl mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tickets Found</h3>
          <p className="text-sm text-gray-500">No support tickets match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <motion.div
              key={ticket._id || ticket.id}
              whileHover={{ scale: 1.01 }}
              onClick={async () => {
                try {
                  const response = await api.get(`/admin/support-tickets/${ticket._id || ticket.id}`);
                  if (response.success) {
                    setSelectedTicket(response.data);
                    setShowDetailModal(true);
                  } else {
                    setSelectedTicket(ticket);
                    setShowDetailModal(true);
                  }
                } catch (error) {
                  console.error('Error loading ticket details:', error);
                  setSelectedTicket(ticket);
                  setShowDetailModal(true);
                }
              }}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-gray-800 text-sm">
                      {ticket.vendorId && typeof ticket.vendorId === 'object'
                        ? (ticket.vendorId.businessName || ticket.vendorId.storeName || 'Unknown Vendor')
                        : 'Unknown Vendor'}
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-800 mb-1">{ticket.subject}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>#{ticket.ticketNumber}</span>
                    <span>•</span>
                    <span>{formatDate(ticket.createdAt || ticket.created_at)}</span>
                    {ticket.adminResponse && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 font-medium">Responded</span>
                      </>
                    )}
                  </div>
                </div>
                <FiChevronRight className="text-gray-400 ml-2 flex-shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
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

