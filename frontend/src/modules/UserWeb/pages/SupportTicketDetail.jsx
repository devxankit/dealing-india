import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiCheckCircle, FiClock, FiX, FiAlertCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import MobileLayout from '../../UserApp/components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';
import supportTicketService from '../../../shared/services/supportTicketService';
import { initializeSocket } from '../../../shared/utils/socket';
import toast from 'react-hot-toast';
import Badge from '../../../shared/components/Badge';

const SupportTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { responsivePadding } = useResponsiveHeaderPadding();
  const location = window.location.pathname;
  const isMobileApp = location.startsWith('/app');

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    loadTicket();
    
    // Initialize socket
    const token = localStorage.getItem('token');
    if (token) {
      socketRef.current = initializeSocket(token);
      socketRef.current.emit('join_ticket_room', { ticketId: id });
      
      socketRef.current.on('ticket_message', (message) => {
        if (message.ticketId === id) {
          setMessages((prev) => [...prev, message]);
          scrollToBottom();
        }
      });

      socketRef.current.on('ticket_updated', (data) => {
        if (data.ticketId === id) {
          loadTicket();
        }
      });

      socketRef.current.on('ticket_status_changed', (data) => {
        if (data.ticketId === id) {
          loadTicket();
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_ticket_room', { ticketId: id });
        socketRef.current.off('ticket_message');
        socketRef.current.off('ticket_updated');
        socketRef.current.off('ticket_status_changed');
      }
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await supportTicketService.getUserTicket(id);
      if (response.success) {
        setTicket(response.data);
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;

    try {
      setSending(true);
      const response = await supportTicketService.replyToTicket(id, replyText);
      if (response.success) {
        setMessages((prev) => [...prev, response.data.data]);
        setReplyText('');
        scrollToBottom();
        toast.success('Reply sent');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
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

  if (loading) {
    return (
      <ProtectedRoute>
        <PageTransition>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading ticket...</p>
            </div>
          </div>
        </PageTransition>
      </ProtectedRoute>
    );
  }

  if (!ticket) {
    return (
      <ProtectedRoute>
        <PageTransition>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Ticket not found</p>
              <button
                onClick={() => navigate('/app/support-tickets')}
                className="text-primary-600 hover:text-primary-700">
                Go back
              </button>
            </div>
          </div>
        </PageTransition>
      </ProtectedRoute>
    );
  }

  const content = (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="container mx-auto max-w-4xl">
          <button
            onClick={() => navigate('/app/support-tickets')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
            <FiArrowLeft />
            Back to Tickets
          </button>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{ticket.subject}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={getStatusColor(ticket.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(ticket.status)}
                    <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                  </div>
                </Badge>
                <span className="text-sm text-gray-500">Ticket: {ticket.ticketNumber}</span>
                <span className="text-sm text-gray-500">
                  Created: {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-4xl space-y-4">
          {/* Initial Description */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-semibold">
                  {ticket.userId?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800">You</span>
                  <span className="text-sm text-gray-500">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {messages.map((message) => {
            const isAdmin = message.senderRole === 'admin';
            return (
              <motion.div
                key={message._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-lg p-6 border border-gray-200 ${
                  isAdmin ? 'border-l-4 border-l-primary-600' : ''
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isAdmin ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    <span className={`font-semibold ${
                      isAdmin ? 'text-primary-600' : 'text-gray-600'
                    }`}>
                      {isAdmin ? 'A' : message.senderId?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">
                        {isAdmin ? 'Admin' : message.senderId?.name || 'You'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Input */}
      {ticket.status !== 'closed' && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={sending}
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end">
                <FiSend className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobileApp) {
    return (
      <ProtectedRoute>
        <PageTransition>
          <MobileLayout showBottomNav={false} showCartBar={false}>
            {content}
          </MobileLayout>
        </PageTransition>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <Navbar />
          <main style={{ paddingTop: `${responsivePadding}px` }}>
            {content}
          </main>
          <Footer />
        </div>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default SupportTicketDetail;

