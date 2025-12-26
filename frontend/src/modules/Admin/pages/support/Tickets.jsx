import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FiSearch, FiEye, FiMessageSquare, FiSend } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '../../components/DataTable';
import Badge from '../../../../shared/components/Badge';
import AnimatedSelect from '../../components/AnimatedSelect';
import api from '../../../../shared/utils/api';
import { API_BASE_URL } from '../../../../shared/utils/constants';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const Tickets = () => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (!token) return;

    const socket = io(API_BASE_URL.replace('/api', ''), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('message_received', (data) => {
      const currentTicketId = selectedTicket?._id || selectedTicket?.id;
      if (selectedTicket && data.ticketId === currentTicketId) {
        setMessages((prev) => [...prev, data.message]);
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      // Refresh tickets list
      fetchTickets();
    });

    socket.on('ticket_updated', (data) => {
      const currentTicketId = selectedTicket?._id || selectedTicket?.id;
      if (selectedTicket && data.ticketId === currentTicketId) {
        setTicketDetail((prev) => ({ ...prev, ...data.ticket }));
        setSelectedTicket((prev) => ({ ...prev, ...data.ticket }));
      }
      // Refresh tickets list
      fetchTickets();
    });

    socket.on('error', (error) => {
      toast.error(error.message || 'Socket error');
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedTicket]);

  // Fetch tickets
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTickets();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await api.get(`/admin/support/tickets?${params.toString()}`);
      if (response.success && response.data?.tickets) {
        const transformed = response.data.tickets.map((ticket) => ({
          ...ticket,
          id: ticket.ticketNumber || ticket._id,
        }));
        setTickets(transformed);
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticket) => {
    try {
      setLoadingDetail(true);
      setSelectedTicket(ticket);
      const ticketId = ticket._id || ticket.id;
      const response = await api.get(`/admin/support/tickets/${ticketId}`);
      if (response.success && response.data?.ticket) {
        const ticketData = response.data.ticket;
        setTicketDetail(ticketData);
        setMessages(ticketData.messages || []);

        // Join ticket room via Socket.io
        if (socketRef.current) {
          socketRef.current.emit('join_ticket_room', { ticketId: ticketData._id || ticketId });
        }

        // Scroll to bottom after messages load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      const ticketId = selectedTicket._id || selectedTicket.id;
      // Send via Socket.io if connected, otherwise fallback to REST
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_message', {
          ticketId: ticketId,
          message: newMessage.trim(),
        });
      } else {
        // REST fallback
        const response = await api.post(`/admin/support/tickets/${ticketId}/messages`, {
          message: newMessage.trim(),
        });
        if (response.success) {
          setMessages((prev) => [...prev, response.data.message]);
        }
      }
      setNewMessage('');
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      // Error toast is handled by api interceptor
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;

    try {
      const ticketId = selectedTicket._id || selectedTicket.id;
      // Send via Socket.io if connected, otherwise fallback to REST
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('update_ticket_status', {
          ticketId: ticketId,
          status: newStatus,
        });
      } else {
        // REST fallback
        await api.put(`/admin/support/tickets/${ticketId}/status`, {
          status: newStatus,
        });
        await fetchTickets();
        const response = await api.get(`/admin/support/tickets/${ticketId}`);
        if (response.success && response.data?.ticket) {
          setTicketDetail(response.data.ticket);
          setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
        }
      }
      toast.success('Ticket status updated');
    } catch (error) {
      // Error toast is handled by api interceptor
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'error',
      in_progress: 'warning',
      resolved: 'success',
      closed: 'default',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      key: 'id',
      label: 'Ticket ID',
      sortable: true,
      render: (value) => <span className="font-semibold text-gray-800">{value}</span>,
    },
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
    },
    {
      key: 'subject',
      label: 'Subject',
      sortable: false,
      render: (value) => <p className="text-sm text-gray-800 max-w-xs truncate">{value}</p>,
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => <Badge variant={getStatusColor(value)}>{value.replace('_', ' ')}</Badge>,
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => handleViewTicket(row)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <FiEye />
        </button>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Support Tickets</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage customer support tickets</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
            className="min-w-[140px]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading tickets...</div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">No tickets found</div>
          </div>
        ) : (
          <DataTable
            data={tickets}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        )}
      </div>

      <AnimatePresence>
        {selectedTicket && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedTicket(null)}
              className="fixed inset-0 bg-black/50 z-[10000]"
            />

            {/* Modal Content - Mobile: Slide up from bottom, Desktop: Center with scale */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-[10000] flex ${isAppRoute ? 'items-start pt-[10px]' : 'items-end'} sm:items-center justify-center p-4 pointer-events-none`}
            >
              <motion.div
                variants={{
                  hidden: {
                    y: isAppRoute ? '-100%' : '100%',
                    scale: 0.95,
                    opacity: 0
                  },
                  visible: {
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    transition: {
                      type: 'spring',
                      damping: 22,
                      stiffness: 350,
                      mass: 0.7
                    }
                  },
                  exit: {
                    y: isAppRoute ? '-100%' : '100%',
                    scale: 0.95,
                    opacity: 0,
                    transition: {
                      type: 'spring',
                      damping: 30,
                      stiffness: 400
                    }
                  }
                }}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
                className={`bg-white ${isAppRoute ? 'rounded-b-3xl' : 'rounded-t-3xl'} sm:rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto`}
                style={{ willChange: 'transform' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Ticket Details</h3>
                  <button
                    onClick={() => {
                      const ticketId = selectedTicket?._id || selectedTicket?.id;
                      setSelectedTicket(null);
                      setTicketDetail(null);
                      setMessages([]);
                      if (socketRef.current && ticketId) {
                        socketRef.current.emit('leave_ticket_room', { ticketId });
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading ticket details...</div>
                  </div>
                ) : ticketDetail ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b">
                      <div>
                        <p className="text-sm text-gray-600">Ticket ID</p>
                        <p className="font-semibold text-gray-800">{ticketDetail.ticketNumber || ticketDetail.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Customer</p>
                        <p className="font-semibold text-gray-800">{ticketDetail.customerName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Subject</p>
                        <p className="font-semibold text-gray-800">{ticketDetail.subject}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-semibold text-gray-800">{ticketDetail.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Priority</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPriorityColor(ticketDetail.priority)}`}>
                          {ticketDetail.priority}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <AnimatedSelect
                          value={ticketDetail.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          options={[
                            { value: 'open', label: 'Open' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'resolved', label: 'Resolved' },
                            { value: 'closed', label: 'Closed' },
                          ]}
                          className="min-w-[140px]"
                        />
                      </div>
                    </div>

                    {/* Messages/Conversation */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-800 mb-4">Conversation</h4>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4">
                        {messages.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">No messages yet</div>
                        ) : (
                          messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  msg.sender === 'admin'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                <p className="text-sm">{msg.message}</p>
                                <p
                                  className={`text-xs mt-1 ${
                                    msg.sender === 'admin' ? 'text-primary-100' : 'text-gray-500'
                                  }`}
                                >
                                  {new Date(msg.time).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Input */}
                      <div className="flex items-center gap-2 border-t pt-4">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          onClick={handleSendMessage}
                          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <FiSend />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">Loading...</div>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Tickets;

