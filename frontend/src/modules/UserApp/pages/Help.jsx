import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiMessageSquare, FiSend } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import MobileLayout from '../components/Layout/MobileLayout';
import {
    getUserTickets,
    createUserTicket,
    getUserTicket,
    sendUserTicketMessage
} from '../services/userSupportService';
import toast from 'react-hot-toast';

const MobileHelp = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { vendorId, vendorName } = location.state || {};

    const [view, setView] = useState('list'); // 'list', 'create', 'chat'
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);

    // Create Form State
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        type: 'General Query',
        vendorId: vendorId || null
    });

    // Auto-switch to create view if vendorId is provided
    useEffect(() => {
        if (vendorId) {
            setView('create');
            setFormData(prev => ({ ...prev, vendorId, subject: `Query regarding ${vendorName || 'store'}` }));
        }
    }, [vendorId, vendorName]);

    // Chat State
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        if (view === 'chat' && selectedTicket) {
            fetchTicketDetails(selectedTicket.id);
            // Poll for new messages every 5 seconds
            const interval = setInterval(() => {
                fetchTicketDetails(selectedTicket.id);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [view, selectedTicket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, view]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const data = await getUserTickets();
            setTickets(data.tickets || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketDetails = async (ticketId) => {
        try {
            const data = await getUserTicket(ticketId);
            setMessages(data.ticket.messages || []);
            // Update selected ticket status if changed
            if (selectedTicket && data.ticket.status !== selectedTicket.status) {
                setSelectedTicket(prev => ({ ...prev, status: data.ticket.status }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!formData.subject || !formData.description) return;

        try {
            setLoading(true);
            await createUserTicket(formData);
            toast.success('Ticket created successfully');
            setFormData({ subject: '', description: '', type: 'General Query' });
            setView('list');
            fetchTickets();
        } catch (error) {
            toast.error(typeof error === 'string' ? error : 'Failed to create ticket');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTicket) return;

        try {
            await sendUserTicketMessage(selectedTicket.id, newMessage);
            setNewMessage('');
            fetchTicketDetails(selectedTicket.id);
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-600';
            case 'in_progress': return 'bg-yellow-100 text-yellow-600';
            case 'resolved': return 'bg-green-100 text-green-600';
            case 'closed': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <MobileLayout showBottomNav={view === 'list'} showCartBar={false}>
            <div className={`bg-gray-50 ${view === 'chat' ? 'h-screen flex flex-col overflow-hidden' : 'min-h-screen pb-20'}`}>

                {/* Header */}
                <div className="bg-white sticky top-0 z-20 px-4 py-3 shadow-sm flex items-center justify-between flex-none">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (view === 'list') navigate(-1);
                                else setView('list');
                            }}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
                        >
                            <FiArrowLeft className="text-xl text-gray-700" />
                        </button>
                        <h1 className="font-bold text-lg text-gray-900">
                            {view === 'list' ? 'Help Center' : view === 'create' ? 'New Ticket' : 'Chat Support'}
                        </h1>
                    </div>
                    {view === 'list' && (
                        <button
                            onClick={() => setView('create')}
                            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md active:scale-95 transition-transform"
                        >
                            <FiPlus /> New
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className={`${view === 'chat' ? 'flex-1 overflow-hidden flex flex-col' : 'p-4'}`}>
                    <AnimatePresence mode="wait">

                        {/* List View */}
                        {view === 'list' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                {loading ? (
                                    <div className="text-center py-10 text-gray-500">Loading...</div>
                                ) : tickets.length === 0 ? (
                                    <div className="text-center py-12 flex flex-col items-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <FiMessageSquare className="text-2xl text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 mb-1">No Tickets Yet</h3>
                                        <p className="text-gray-500 text-sm mb-6">Have a question? Create a new ticket.</p>
                                        <button
                                            onClick={() => setView('create')}
                                            className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg"
                                        >
                                            Start a Conversation
                                        </button>
                                    </div>
                                ) : (
                                    tickets.map((ticket) => (
                                        <div
                                            key={ticket.id}
                                            onClick={() => {
                                                setSelectedTicket(ticket);
                                                setView('chat');
                                            }}
                                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${getStatusColor(ticket.status)}`}>
                                                    {ticket.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(ticket.lastMessageAt || ticket.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{ticket.subject}</h3>
                                            <p className="text-xs text-gray-500 mb-2">#{ticket.ticketNumber}</p>
                                            <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        )}

                        {/* Create View */}
                        {view === 'create' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="bg-white p-5 rounded-2xl shadow-sm"
                            >
                                <form onSubmit={handleCreateTicket} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            placeholder="What is this about?"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                        >
                                            <option value="General Query">General Query</option>
                                            <option value="Order Issue">Order Issue</option>
                                            <option value="Payment Issue">Payment Issue</option>
                                            <option value="Product Question">Product Question</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Describe your issue in detail..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black h-32 resize-none"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg mt-4 disabled:opacity-50"
                                    >
                                        {loading ? 'Creating...' : 'Submit Request'}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* Chat View */}
                        {view === 'chat' && selectedTicket && (
                            <motion.div
                                initial={{ opacity: 0, x: '100%' }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-0 z-[100] bg-gray-50 flex flex-col h-[100dvh]"
                            >
                                {/* Chat Header - Fixed */}
                                <div className="bg-white px-4 py-3 shadow-sm border-b border-gray-100 flex-none flex items-center gap-3 z-20">
                                    <button
                                        onClick={() => setView('list')}
                                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
                                    >
                                        <FiArrowLeft className="text-xl text-gray-700" />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate">{selectedTicket.subject}</h3>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <p className="text-xs text-gray-500">#{selectedTicket.ticketNumber}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getStatusColor(selectedTicket.status)}`}>
                                                {selectedTicket.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages - Scrollable */}
                                <div className="flex-1 overflow-y-auto space-y-4 p-4 min-h-0 bg-gray-50">
                                    {/* Original Description as first message */}
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] bg-black text-white p-3 rounded-2xl rounded-tr-none shadow-sm">
                                            <p className="text-sm">{selectedTicket.description}</p>
                                            <span className="text-[10px] opacity-70 block text-right mt-1">
                                                {new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${msg.sender === 'user'
                                                ? 'bg-black text-white rounded-tr-none'
                                                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                                }`}>
                                                {msg.sender !== 'user' && (
                                                    <p className="text-[10px] font-bold text-gray-500 mb-1">{msg.senderName}</p>
                                                )}
                                                <p className="text-sm">{msg.message}</p>
                                                <span className={`text-[10px] block text-right mt-1 ${msg.sender === 'user' ? 'opacity-70' : 'text-gray-400'}`}>
                                                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input - Fixed Bottom */}
                                <div className="bg-white p-3 border-t border-gray-200 flex-none w-full shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] pb-safe-area-bottom">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="p-3 bg-black text-white rounded-full disabled:opacity-50 flex items-center justify-center w-12 h-12 flex-none"
                                        >
                                            <FiSend className="ml-1" />
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </MobileLayout>
    );
};

export default MobileHelp;
