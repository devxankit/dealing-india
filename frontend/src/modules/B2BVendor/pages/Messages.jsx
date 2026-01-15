import { useState, useEffect, useRef } from 'react';
import { FiArrowLeft, FiSend, FiMessageSquare, FiUser, FiSearch, FiBox } from 'react-icons/fi';
import { motion } from 'framer-motion';
import chatService from '../../../shared/services/chatService';
import { initializeSocket } from '../../../shared/utils/socket';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { getImageUrl } from '../../../shared/utils/helpers';

const B2BVendorMessages = () => {
    const { vendor } = useB2BVendorAuthStore();

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    const loadConversations = async () => {
        try {
            const response = await chatService.getVendorConversations();
            if (response.success) {
                setConversations(response.data || []);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            // toast.error('Failed to load conversations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initChat = async () => {
            try {
                setLoading(true);
                // Initialize socket
                const token = localStorage.getItem('b2b-vendor-token');
                if (token) {
                    socketRef.current = initializeSocket(token);
                    socketRef.current.on('receive_message', (message) => {
                        handleIncomingMessage(message);
                    });
                }
                await loadConversations();
            } catch (error) {
                console.error('Error initializing chat:', error);
            } finally {
                setLoading(false);
            }
        };

        if (vendor) {
            initChat();
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [vendor]);

    const handleIncomingMessage = (message) => {
        setConversations(prev => {
            const updated = prev.map(conv => {
                if (conv._id === message.conversationId) {
                    return {
                        ...conv,
                        lastMessage: message,
                        unreadCount: (conv.unreadCount || 0) + 1
                    };
                }
                return conv;
            });
            // If conversation not in list, reload
            if (!updated.find(c => c._id === message.conversationId)) {
                loadConversations();
            }
            return updated;
        });

        if (selectedConversation?._id === message.conversationId) {
            setMessages(prev => [...prev, message]);
            scrollToBottom();
            chatService.markVendorAllAsRead(message.conversationId).catch(console.error);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const selectConversation = async (conv) => {
        setSelectedConversation(conv);
        setLoading(true);
        try {
            const response = await chatService.getVendorMessages(conv._id);
            if (response.success) {
                setMessages(response.data?.messages || []);
                scrollToBottom();
                if (conv.unreadCount > 0) {
                    await chatService.markVendorAllAsRead(conv._id);
                    loadConversations();
                }
            }
        } catch (error) {
            toast.error('Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!messageText.trim() || !selectedConversation) return;

        const otherParticipant = selectedConversation.otherParticipant?.userId;
        const receiverId = otherParticipant._id || otherParticipant;

        setSending(true);
        try {
            const response = await chatService.sendVendorMessage(
                selectedConversation._id,
                receiverId,
                messageText
            );

            if (response.success) {
                const newMessage = response.data;
                setMessages(prev => [...prev, newMessage]);
                setMessageText('');
                scrollToBottom();
                loadConversations();
            }
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const filteredConversations = conversations.filter(conv => {
        const otherName = conv.otherParticipant?.userId?.name || conv.otherParticipant?.userId?.storeName || 'User';
        return otherName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-100 flex-col bg-slate-50/50`}>
                    <div className="p-4 border-b border-gray-100 bg-white">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Messages</h2>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary-500"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading && conversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Loading...</div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <FiMessageSquare className="text-4xl mx-auto mb-2 opacity-20" />
                                <p>No conversations found</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const other = conv.otherParticipant?.userId;
                                const otherName = other?.name || other?.storeName || 'User';
                                const unread = conv.unreadCount || 0;
                                const isSelected = selectedConversation?._id === conv._id;

                                return (
                                    <div
                                        key={conv._id}
                                        onClick={() => selectConversation(conv)}
                                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-white transition-colors ${isSelected ? 'bg-white border-l-4 border-l-primary-600' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center relative overflow-hidden shrink-0">
                                                {other?.avatar || other?.storeLogo ? (
                                                    <img src={getImageUrl(other.avatar || other.storeLogo)} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FiUser className="text-primary-600 text-xl" />
                                                )}
                                                {unread > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between mb-1">
                                                    <h4 className="font-bold text-gray-800 truncate text-sm">{otherName}</h4>
                                                    <span className="text-[10px] text-gray-400">
                                                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {conv.lastMessage?.messageType === 'inquiry' ? '📦 Premium Inquiry' : conv.lastMessage?.message || 'No messages yet'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-slate-50`}>
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-3 shadow-sm z-10">
                                <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                                    <FiArrowLeft className="text-xl" />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shrink-0">
                                    {selectedConversation.otherParticipant?.userId?.avatar || selectedConversation.otherParticipant?.userId?.storeLogo ? (
                                        <img src={getImageUrl(selectedConversation.otherParticipant.userId.avatar || selectedConversation.otherParticipant.userId.storeLogo)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <FiUser className="text-primary-600" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{selectedConversation.otherParticipant?.userId?.name || selectedConversation.otherParticipant?.userId?.storeName || 'User'}</h3>
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Active Conversation</p>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map(msg => {
                                    const senderId = typeof msg.senderId === 'object' ? (msg.senderId._id || msg.senderId.id) : msg.senderId;
                                    const currentVendorId = vendor?._id || vendor?.id;
                                    const isMe = senderId === currentVendorId;
                                    const isInquiry = msg.messageType === 'inquiry' || (msg.message && msg.message.trim().startsWith('📦 *INQUIRY FOR:'));

                                    return (
                                        <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] sm:max-w-[70%] ${isInquiry ? 'w-full max-w-md' : ''}`}>
                                                {isInquiry ? (
                                                    <div className={`rounded-2xl px-4 py-3 shadow-sm bg-gradient-to-br from-primary-600 to-primary-700 text-white ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                                                        <div className="flex flex-col gap-3 min-w-[260px]">
                                                            {/* Premium Header */}
                                                            <div className="flex items-center justify-between pb-2 border-b border-white/20">
                                                                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-extrabold text-primary-100">
                                                                    <FiBox className="text-xs" />
                                                                    Wholesale Inquiry
                                                                </div>
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white">
                                                                    #{msg._id.slice(-4).toUpperCase()}
                                                                </span>
                                                            </div>

                                                            {/* Product Card */}
                                                            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/10 shadow-inner">
                                                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-sm border border-gray-200">
                                                                    {msg.metadata?.productImage ? (
                                                                        <img
                                                                            src={getImageUrl(msg.metadata.productImage)}
                                                                            alt={msg.metadata.productName}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                                                            <FiBox className="text-gray-300 text-xl" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-black text-[14px] leading-tight truncate-2-lines text-white">
                                                                        {msg.metadata?.productName || (msg.message.match(/\*INQUIRY FOR: (.*?)\*/)?.[1]) || 'Product Inquiry'}
                                                                    </p>
                                                                    <p className="text-[11px] mt-1 font-bold text-primary-100">
                                                                        Rate: ₹{msg.metadata?.productPrice || 'N/A'}/unit
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Order Analytics */}
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <div className="p-3 rounded-2xl bg-white/10">
                                                                    <p className="text-[9px] uppercase font-bold opacity-60 text-white">Quantity</p>
                                                                    <p className="text-md font-black mt-0.5 text-white">
                                                                        {msg.metadata?.quantity || (msg.message.match(/\*Quantity:\* (.*?) units/)?.[1]) || '---'}
                                                                        <span className="text-[10px] font-normal ml-1">Units</span>
                                                                    </p>
                                                                </div>
                                                                <div className="p-3 rounded-2xl bg-white/10">
                                                                    <p className="text-[9px] uppercase font-bold opacity-60 text-white">Order Status</p>
                                                                    <p className="text-xs font-bold mt-1.5 text-white">Open for Quote</p>
                                                                </div>
                                                            </div>

                                                            {/* Quote Message */}
                                                            {(msg.metadata?.clientMessage || msg.message.includes('💬 *Message:*')) && (
                                                                <div className="relative px-4 py-3 rounded-2xl text-[13px] leading-relaxed italic bg-black/15 text-primary-50 shadow-inner">
                                                                    <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl bg-primary-300"></div>
                                                                    "{msg.metadata?.clientMessage || (msg.message.match(/💬 \*Message:\*\n(.*?)$/s)?.[1]) || 'Interested in this product.'}"
                                                                </div>
                                                            )}

                                                            <div className="text-[10px] text-center italic mt-1 opacity-50 text-white">
                                                                B2B Marketplace Verified Order Path
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`p-3 rounded-2xl shadow-sm ${isMe ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                                                        <p className="text-sm leading-relaxed">{msg.message}</p>
                                                        <span className={`text-[9px] block text-right mt-1 opacity-60 uppercase font-bold`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-4 bg-white border-t border-gray-100 shadow-lg">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Write your response..."
                                        disabled={sending}
                                        className="flex-1 px-5 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm focus:border-primary-500 focus:bg-white transition-all outline-none"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={sending || !messageText.trim()}
                                        className="px-6 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all flex items-center justify-center disabled:opacity-50"
                                    >
                                        <FiSend className="text-lg" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform">
                                <FiMessageSquare className="text-5xl text-gray-200" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">Select a Conversation</h3>
                            <p className="max-w-xs text-sm">Pick a buyer inquiry from the list on the left to start responding to bulk requests.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default B2BVendorMessages;
