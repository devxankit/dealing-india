import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiMessageSquare, FiClock, FiCheckCircle, FiX, FiAlertCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MobileLayout from '../../../modules/UserApp/components/Layout/MobileLayout';
import PageTransition from '../PageTransition';
import ProtectedRoute from '../Auth/ProtectedRoute';
import supportTicketService from '../../services/supportTicketService';
import toast from 'react-hot-toast';
import Badge from '../Badge';
import TicketDetailModal from './TicketDetailModal';
import api from '../../utils/api';

const SupportTickets = () => {
    const navigate = useNavigate();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        loadTickets();
    }, [filter]);

    const loadTickets = async () => {
        try {
            setLoading(true);
            const response = await supportTicketService.getUserTickets({
                status: filter !== 'all' ? filter : undefined,
            });
            console.log('Tickets API Response:', response);
            if (response.success) {
                const ticketsData = response.data || [];
                console.log('Tickets data:', ticketsData);
                setTickets(Array.isArray(ticketsData) ? ticketsData : []);
            } else {
                console.error('API returned success: false', response);
                setTickets([]);
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            console.error('Error details:', error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to load support tickets');
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    const handleTicketUpdate = async () => {
        if (selectedTicket) {
            try {
                const response = await api.get(`/user/support-tickets/${selectedTicket._id || selectedTicket.id}`);
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
                return <FiAlertCircle className="text-blue-600" />;
            case 'in_progress':
                return <FiClock className="text-yellow-600" />;
            case 'resolved':
                return <FiCheckCircle className="text-green-600" />;
            case 'closed':
                return <FiX className="text-gray-600" />;
            default:
                return <FiMessageSquare className="text-gray-600" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open':
                return 'bg-blue-100 text-blue-800';
            case 'in_progress':
                return 'bg-yellow-100 text-yellow-800';
            case 'resolved':
                return 'bg-green-100 text-green-800';
            case 'closed':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const content = (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Support Tickets</h1>
                        <p className="text-gray-600 mt-1">Get help with your orders and account</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm">
                        <FiPlus className="text-sm" />
                        Create Ticket
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg transition-colors ${filter === status
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* Tickets List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading tickets...</p>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg">
                        <FiMessageSquare className="text-6xl text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">No tickets found</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            Create Your First Ticket
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tickets.map((ticket) => (
                            <motion.div
                                key={ticket._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={async () => {
                                    try {
                                        const response = await api.get(`/user/support-tickets/${ticket._id}`);
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
                                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-800">{ticket.subject}</h3>
                                            <Badge className={getStatusColor(ticket.status)}>
                                                <div className="flex items-center gap-1">
                                                    {getStatusIcon(ticket.status)}
                                                    <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                                                </div>
                                            </Badge>
                                        </div>
                                        <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>Ticket: {ticket.ticketNumber}</span>
                                            <span>•</span>
                                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                            {ticket.priority && (
                                                <>
                                                    <span>•</span>
                                                    <span className="capitalize">Priority: {ticket.priority}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <CreateTicketModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadTickets();
                    }}
                />
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

    return (
        <ProtectedRoute>
            <PageTransition>
                <MobileLayout showBottomNav={false} showCartBar={false}>
                    {content}
                </MobileLayout>
            </PageTransition>
        </ProtectedRoute>
    );
};

const CreateTicketModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        category: 'other',
        priority: 'medium',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.subject || !formData.description) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            const response = await supportTicketService.createTicket(formData);
            if (response.success) {
                toast.success('Ticket created successfully');
                onSuccess();
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            toast.error(error.message || 'Failed to create ticket');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Create Support Ticket</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700">
                        <FiX className="text-xl" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject *
                        </label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Brief description of your issue"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Please provide detailed information about your issue..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="other">Other</option>
                                <option value="technical">Technical</option>
                                <option value="payment">Payment</option>
                                <option value="billing">Billing</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Priority
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                            {submitting ? 'Creating...' : 'Create Ticket'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default SupportTickets;
