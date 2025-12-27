import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiMessageSquare,
  FiSearch,
  FiPlus,
  FiEye,
  FiArrowLeft,
  FiCalendar,
  FiTag,
  FiSend,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import Badge from "../../../shared/components/Badge";
import AnimatedSelect from "../../Admin/components/AnimatedSelect";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import {
  getVendorTickets,
  getVendorTicket,
  createVendorTicket,
  sendTicketMessage,
} from "../services/supportTicketService";
import { initializeSocket, getSocket, disconnectSocket } from "../../../shared/utils/socket";
import toast from "react-hot-toast";

const SupportTickets = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { vendor, token } = useVendorAuthStore();
  const [tickets, setTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const vendorId = vendor?.id;

  // Load ticket detail if ID is present
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadTicketDetail = useCallback(async (ticketId) => {
    setLoadingDetail(true);
    try {
      const response = await getVendorTicket(ticketId);
      if (response.success && response.data?.ticket) {
        const ticket = response.data.ticket;
        setSelectedTicket(ticket);
        setTicketMessages(ticket.messages || []);

        // Join socket room for this ticket
        const socket = getSocket();
        if (socket) {
          socket.emit("join_ticket_room", { ticketId });
        }
      }
    } catch (error) {
      console.error("Error loading ticket:", error);
      toast.error("Failed to load ticket");
      navigate("/vendor/support-tickets");
    } finally {
      setLoadingDetail(false);
    }
  }, [navigate]);

  // Load tickets from API
  useEffect(() => {
    if (!vendorId) return;

    const loadTickets = async () => {
      setLoading(true);
      try {
        const response = await getVendorTickets({
          status: statusFilter,
          search: searchQuery,
          page: 1,
          limit: 100, // Load all tickets for now
        });

        if (response.success && response.data?.tickets) {
          setTickets(response.data.tickets);
        }
      } catch (error) {
        console.error("Error loading tickets:", error);
        toast.error("Failed to load tickets");
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [vendorId, statusFilter]);

  const refreshTickets = useCallback(async () => {
    try {
      const response = await getVendorTickets({
        status: statusFilter,
        search: searchQuery,
        page: 1,
        limit: 100,
      });

      if (response.success && response.data?.tickets) {
        setTickets(response.data.tickets);
      }
    } catch (error) {
      console.error("Error refreshing tickets:", error);
    }
  }, [statusFilter, searchQuery]);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!token || !vendorId) return;

    const socket = initializeSocket(token);

    // Listen for new messages
    socket.on("message_received", (data) => {
      if (data.ticketId && id === data.ticketId) {
        // Refresh ticket if viewing detail
        if (id) {
          loadTicketDetail(id);
        }
        // Refresh ticket list
        refreshTickets();
      }
    });

    // Listen for ticket updates
    socket.on("ticket_updated", (data) => {
      if (data.ticketId) {
        refreshTickets();
        if (id === data.ticketId) {
          loadTicketDetail(id);
        }
      }
    });

    return () => {
      socket.off("message_received");
      socket.off("ticket_updated");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, vendorId, id]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      !searchQuery ||
      ticket.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSave = async (ticketData) => {
    try {
      setLoading(true);
      const response = await createVendorTicket(ticketData);

      if (response.success && response.data?.ticket) {
        toast.success("Ticket created successfully");
        setShowForm(false);
        refreshTickets();
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    const statusMap = {
      open: "error",
      in_progress: "warning",
      resolved: "success",
      closed: "default",
    };
    return statusMap[status] || "default";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const columns = [
    {
      key: "ticketNumber",
      label: "Ticket ID",
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-gray-800">{value}</span>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      sortable: true,
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (value) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
            value
          )}`}>
          {value}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={getStatusVariant(value)}>{value}</Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button
          onClick={() => navigate(`/vendor/support-tickets/${row.id}`)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <FiEye />
        </button>
      ),
    },
  ];

  useEffect(() => {
    if (id) {
      loadTicketDetail(id);
    } else {
      setSelectedTicket(null);
      setTicketMessages([]);
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;

    const socket = getSocket();
    if (socket && socket.connected) {
      // Send via Socket.io
      socket.emit("send_message", {
        ticketId: id,
        message: newMessage.trim(),
      });
    } else {
      // Fallback to REST API
      try {
        await sendTicketMessage(id, newMessage.trim());
      } catch (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        return;
      }
    }

    setNewMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view tickets</p>
      </div>
    );
  }

  // Render detail view if ID is present
  if (id && selectedTicket) {
    return (
      <TicketDetail
        ticket={selectedTicket}
        messages={ticketMessages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
        messagesEndRef={messagesEndRef}
        navigate={navigate}
        getStatusVariant={getStatusVariant}
        getPriorityColor={getPriorityColor}
        loading={loadingDetail}
      />
    );
  }

  // Render list view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FiMessageSquare className="text-primary-600" />
            Support Tickets
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Create and manage support tickets
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          <FiPlus />
          <span>Create Ticket</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>

          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Status" },
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In Progress" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />
        </div>
      </div>

      {/* Tickets Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">Loading tickets...</p>
        </div>
      ) : filteredTickets.length > 0 ? (
        <DataTable
          data={filteredTickets}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No tickets found</p>
        </div>
      )}

      {showForm && (
        <TicketForm
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          loading={loading}
        />
      )}
    </motion.div>
  );
};

const TicketDetail = ({
  ticket,
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  onKeyPress,
  messagesEndRef,
  navigate,
  getStatusVariant,
  getPriorityColor,
  loading,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/vendor/support-tickets")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <FiArrowLeft className="text-xl" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Ticket Details
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            View and manage ticket information
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Information */}
        <div className="lg:col-span-1 bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-800">
                  {ticket.subject}
                </h2>
                <Badge variant={getStatusVariant(ticket.status)}>
                  {ticket.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <FiTag />
                  Ticket ID:{" "}
                  <span className="font-semibold text-gray-800">
                    {ticket.ticketNumber}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <FiCalendar />
                  Created: {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">
                Type
              </label>
              <p className="text-gray-800">{ticket.type}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">
                Priority
              </label>
              <span
                className={`inline-block px-3 py-1 rounded text-sm font-medium ${getPriorityColor(
                  ticket.priority
                )}`}>
                {ticket.priority}
              </span>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">
                Status
              </label>
              <Badge variant={getStatusVariant(ticket.status)}>
                {ticket.status}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">
                Created Date
              </label>
              <p className="text-gray-800">
                {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">
              Description
            </label>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-primary-50">
            <h3 className="font-semibold text-gray-800">Conversation</h3>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px]">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading messages...</p>
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "vendor" ? "justify-end" : "justify-start"
                  }`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.sender === "vendor"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === "vendor"
                          ? "text-primary-100"
                          : "text-gray-500"
                      }`}>
                      {new Date(msg.time).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No messages yet</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={onKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={onSendMessage}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                <FiSend />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TicketForm = ({ onSave, onClose, loading }) => {
  const [formData, setFormData] = useState({
    subject: "",
    type: "Technical Support",
    priority: "medium",
    description: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Create Support Ticket</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                <option>Technical Support</option>
                <option>Billing Inquiry</option>
                <option>Product Inquiry</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              rows="6"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportTickets;
