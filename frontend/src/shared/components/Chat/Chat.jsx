import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiMessageSquare, FiBox, FiPaperclip, FiFile } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MobileLayout from '../../../modules/UserApp/components/Layout/MobileLayout';
import PageTransition from '../PageTransition';
import ProtectedRoute from '../Auth/ProtectedRoute';
import chatService from '../../services/chatService';
import { initializeSocket, getSocket } from '../../utils/socket';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/helpers';

const Chat = ({ vendorId: propVendorId, embedded = false, onClose, initialProduct = null }) => {
    const { vendorId: paramVendorId } = useParams();
    const vendorId = propVendorId || paramVendorId;
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [vendor, setVendor] = useState(null);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const fileInputRef = useRef(null);
    const [uploadingFile, setUploadingFile] = useState(false);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size too large. Max 10MB.');
            return;
        }

        // Check if conversation exists
        if (!conversation) {
            toast.error('Please wait for conversation to load');
            return;
        }

        try {
            setUploadingFile(true);

            // Choose service based on role
            const uploadResponse = user.role === 'vendor'
                ? await chatService.uploadVendorAttachment(file)
                : await chatService.uploadAttachment(file);

            if (uploadResponse.success) {
                const fileData = uploadResponse.data;
                const messageType = fileData.resourceType === 'image' ? 'image' : 'file';

                // Identify receiver
                if (!conversation.participants || conversation.participants.length === 0) {
                    toast.error('Conversation participants not found');
                    return;
                }

                const otherParticipant = conversation.participants.find(p => {
                    const pId = p.userId?._id || p.userId?.id || (typeof p.userId === 'string' ? p.userId : null);
                    const currentUserId = user?._id || user?.id;
                    return pId !== currentUserId;
                });

                if (!otherParticipant) {
                    toast.error('Could not find receiver in conversation');
                    return;
                }

                const receiverId = otherParticipant.userId?._id || otherParticipant.userId;

                const sendResponse = user.role === 'vendor'
                    ? await chatService.sendVendorMessage(conversation._id, receiverId, '', messageType, {
                        fileUrl: fileData.url,
                        fileName: fileData.originalName,
                        fileFormat: fileData.format,
                        resourceType: fileData.resourceType
                    })
                    : await chatService.sendMessage(conversation._id, receiverId, '', messageType, {
                        fileUrl: fileData.url,
                        fileName: fileData.originalName,
                        fileFormat: fileData.format,
                        resourceType: fileData.resourceType
                    });

                if (sendResponse.success) {
                    const newMessage = sendResponse.data?.data || sendResponse.data || sendResponse;
                    setMessages((prev) => {
                        const exists = prev.find(m => m._id === newMessage._id);
                        if (exists) return prev;
                        return [...prev, newMessage];
                    });
                    scrollToBottom();
                }
            } else {
                toast.error('Upload failed');
            }
        } catch (error) {
            console.error('File upload error:', error);
            toast.error('Failed to upload file');
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        const initChat = async () => {
            try {
                setLoading(true);

                // Initialize socket
                const token = localStorage.getItem('token');
                if (token) {
                    socketRef.current = initializeSocket(token);
                }

                if (vendorId) {
                    // Create or get conversation
                    const convResponse = await chatService.createOrGetConversation(vendorId);
                    console.log('Conversation response:', convResponse);
                    if (convResponse && convResponse.success !== false) {
                        const conv = convResponse.data || convResponse;
                        setConversation(conv);

                        // Get vendor info from participants
                        const vendorParticipant = conv.participants?.find(p => p.role === 'vendor') ||
                            conv.participants?.find(p => p.userId?.role === 'vendor');
                        if (vendorParticipant?.userId) {
                            setVendor(vendorParticipant.userId);
                        } else if (conv.vendorId) {
                            setVendor(conv.vendorId);
                        }

                        // Load messages
                        if (conv._id) {
                            const messagesResponse = await chatService.getMessages(conv._id);
                            if (messagesResponse && messagesResponse.success !== false) {
                                setMessages(messagesResponse.data?.messages || messagesResponse.messages || []);
                            }
                        }
                    } else {
                        console.error('Failed to create/get conversation:', convResponse);
                        toast.error(convResponse?.message || 'Failed to load conversation');
                    }
                } else {
                    // If embedded, don't try to find or redirect to other conversations
                    if (embedded) {
                        setLoading(false);
                        return;
                    }

                    // Get all conversations
                    const convsResponse = await chatService.getUserConversations();
                    if (convsResponse.success && convsResponse.data && convsResponse.data.length > 0) {
                        const firstConv = convsResponse.data[0];
                        setConversation(firstConv);
                        const vendorIdFromConv = firstConv.otherParticipant?.userId?._id || firstConv.otherParticipant?.userId || firstConv.participants?.find(p => p.role === 'vendor')?.userId?._id || firstConv.participants?.find(p => p.role === 'vendor')?.userId;
                        if (vendorIdFromConv && !embedded) {
                            navigate(`/app/chat/${vendorIdFromConv}`, { replace: true });
                        } else if (vendorIdFromConv) {
                            // In embedded mode, just set the conversation
                            setConversation(firstConv);
                        }
                    } else {
                        // No conversations found - show empty state
                        setConversation(null);
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error('Error initializing chat:', error);
                toast.error('Failed to load chat');
            } finally {
                setLoading(false);
            }
        };

        initChat();

        return () => {
            if (socketRef.current) {
                socketRef.current.off('receive_message');
                socketRef.current.off('new_chat_message');
            }
        };
    }, [vendorId]);

    // Handle socket listeners separately when conversation changes
    useEffect(() => {
        if (socketRef.current && conversation?._id) {
            console.log('Joining chat room:', conversation._id);
            socketRef.current.emit('join_chat_room', { conversationId: conversation._id });

            const handleNewMessage = (message) => {
                console.log('Received message via socket:', message);
                if (message.conversationId === conversation._id) {
                    setMessages((prev) => {
                        const exists = prev.find(m => m._id === message._id);
                        if (exists) return prev;
                        return [...prev, message];
                    });
                    setTimeout(scrollToBottom, 100);
                }
            };

            socketRef.current.on('receive_message', handleNewMessage);

            return () => {
                if (conversation?._id) {
                    socketRef.current.emit('leave_chat_room', { conversationId: conversation._id });
                }
                socketRef.current.off('receive_message', handleNewMessage);
            };
        }
    }, [conversation?._id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || !conversation) return;

        try {
            setSending(true);

            // Identify receiver
            const otherParticipant = conversation.participants.find(p => {
                const pId = p.userId?._id || p.userId?.id || (typeof p.userId === 'string' ? p.userId : null);
                const currentUserId = user?._id || user?.id;
                return pId !== currentUserId;
            });

            if (!otherParticipant) {
                toast.error('Receiver not found');
                return;
            }

            const receiverId = otherParticipant.userId?._id || otherParticipant.userId;

            const response = user.role === 'vendor'
                ? await chatService.sendVendorMessage(conversation._id, receiverId, messageText)
                : await chatService.sendMessage(conversation._id, receiverId, messageText);

            if (response && response.success !== false) {
                const newMessage = response.data?.data || response.data || response;
                setMessages((prev) => {
                    const exists = prev.find(m => m._id === newMessage._id);
                    if (exists) return prev;
                    return [...prev, newMessage];
                });
                setMessageText('');
                scrollToBottom();
            } else {
                toast.error(response?.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <PageTransition className="h-full">
                    {embedded ? (
                        <div className="h-full flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading chat...</p>
                            </div>
                        </div>
                    ) : (
                        <MobileLayout showBottomNav={false} showCartBar={false} fullScreen={true}>
                            <div className="h-full flex items-center justify-center bg-gray-50">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Loading chat...</p>
                                </div>
                            </div>
                        </MobileLayout>
                    )}
                </PageTransition>
            </ProtectedRoute>
        );
    }

    if (!conversation && !loading) {
        return (
            <ProtectedRoute>
                <PageTransition className="h-full">
                    {embedded ? (
                        <div className="h-full bg-gray-50 flex items-center justify-center p-4">
                            <div className="text-center">
                                <FiMessageSquare className="text-6xl text-gray-400 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-gray-800 mb-2">No Conversations Yet</h2>
                                <p className="text-gray-600 mb-6">
                                    {vendorId
                                        ? 'Start chatting with this vendor by sending a message'
                                        : 'Visit a vendor store and click "Chat" to start a conversation'}
                                </p>
                                {vendorId ? (
                                    <button
                                        onClick={async () => {
                                            try {
                                                setLoading(true);
                                                const convResponse = await chatService.createOrGetConversation(vendorId);
                                                if (convResponse.success) {
                                                    window.location.reload();
                                                }
                                            } catch (error) {
                                                console.error('Error creating conversation:', error);
                                                toast.error('Failed to start conversation');
                                                setLoading(false);
                                            }
                                        }}
                                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                        Start Conversation
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/app')}
                                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                        Browse Vendors
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <MobileLayout showBottomNav={false} showCartBar={false} fullScreen={true}>
                            <div className="h-full bg-gray-50 flex items-center justify-center p-4">
                                <div className="text-center">
                                    <FiMessageSquare className="text-6xl text-gray-400 mx-auto mb-4" />
                                    <h2 className="text-xl font-semibold text-gray-800 mb-2">No Conversations Yet</h2>
                                    <p className="text-gray-600 mb-6">
                                        {vendorId
                                            ? 'Start chatting with this vendor by sending a message'
                                            : 'Visit a vendor store and click "Chat" to start a conversation'}
                                    </p>
                                    {vendorId ? (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setLoading(true);
                                                    const convResponse = await chatService.createOrGetConversation(vendorId);
                                                    if (convResponse.success) {
                                                        window.location.reload();
                                                    }
                                                } catch (error) {
                                                    console.error('Error creating conversation:', error);
                                                    toast.error('Failed to start conversation');
                                                    setLoading(false);
                                                }
                                            }}
                                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                            Start Conversation
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => navigate('/app')}
                                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                            Browse Vendors
                                        </button>
                                    )}
                                </div>
                            </div>
                        </MobileLayout>
                    )}
                </PageTransition>
            </ProtectedRoute>
        );
    }

    const vendorInfo = conversation.otherParticipant?.userId || vendor;
    const vendorName = vendorInfo?.storeName || vendorInfo?.name || 'Vendor';

    return (
        <ProtectedRoute>
            <PageTransition className="h-full">
                {embedded ? (
                    <div className="h-full bg-gray-50 flex flex-col overflow-hidden min-h-0">
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                            <button
                                onClick={() => onClose ? onClose() : navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg">
                                <FiArrowLeft className="text-xl" />
                            </button>
                            <div className="flex-1">
                                <h1 className="font-semibold text-gray-800">{vendorName}</h1>
                                {vendorInfo?.isVerified && (
                                    <p className="text-xs text-gray-500">Verified Vendor</p>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isSender = message.senderRole === 'user';
                                    const isInquiry = message.messageType === 'inquiry' || (message.message && message.message.includes('📦 *INQUIRY FOR:'));
                                    const metadata = message.metadata || {};

                                    return (
                                        <motion.div
                                            key={message._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isSender
                                                    ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-tr-none'
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                    }`}>

                                                {isInquiry ? (
                                                    <div className="flex flex-col gap-3 min-w-[260px]">
                                                        {/* Premium Header */}
                                                        <div className={`flex items-center justify-between pb-2 border-b ${isSender ? 'border-white/20' : 'border-gray-100'}`}>
                                                            <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-extrabold ${isSender ? 'text-primary-100' : 'text-primary-700'}`}>
                                                                <FiBox className="text-xs" />
                                                                Wholesale Inquiry
                                                            </div>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSender ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                                #{message._id.slice(-4).toUpperCase()}
                                                            </span>
                                                        </div>

                                                        {/* Product Card */}
                                                        <div className={`flex items-center gap-3 p-2.5 rounded-2xl ${isSender ? 'bg-white/10 shadow-inner' : 'bg-gray-50 border border-gray-100'}`}>
                                                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-sm border border-gray-200">
                                                                {metadata.productImage ? (
                                                                    <img
                                                                        src={getImageUrl(metadata.productImage)}
                                                                        alt={metadata.productName}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                                                        <FiBox className="text-gray-300 text-xl" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-black text-[14px] leading-tight truncate-2-lines ${isSender ? 'text-white' : 'text-gray-900'}`}>
                                                                    {metadata.productName || (message.message.match(/\*INQUIRY FOR: (.*?)\*/)?.[1]) || 'Product Inquiry'}
                                                                </p>
                                                                <p className={`text-[11px] mt-1 font-bold ${isSender ? 'text-primary-100' : 'text-primary-600'}`}>
                                                                    Rate: ₹{metadata?.productPrice ? (typeof metadata.productPrice === 'number' ? metadata.productPrice.toLocaleString('en-IN') : metadata.productPrice) : 'N/A'}/unit
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Order Analytics */}
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            <div className={`p-3 rounded-2xl ${isSender ? 'bg-white/10' : 'bg-primary-50'}`}>
                                                                <p className={`text-[9px] uppercase font-bold opacity-60 ${isSender ? 'text-white' : 'text-primary-700'}`}>Quantity</p>
                                                                <p className={`text-md font-black mt-0.5 ${isSender ? 'text-white' : 'text-primary-900'}`}>
                                                                    {metadata.quantity || (message.message.match(/\*Quantity:\* (.*?) units/)?.[1]) || '---'}
                                                                    <span className="text-[10px] font-normal ml-1">Units</span>
                                                                </p>
                                                            </div>
                                                            <div className={`p-3 rounded-2xl ${isSender ? 'bg-white/10' : 'bg-green-50'}`}>
                                                                <p className={`text-[9px] uppercase font-bold opacity-60 ${isSender ? 'text-white' : 'text-green-700'}`}>Order Status</p>
                                                                <p className={`text-xs font-bold mt-1.5 ${isSender ? 'text-white' : 'text-green-900'}`}>Open for Quote</p>
                                                            </div>
                                                        </div>

                                                        {/* Quote Message */}
                                                        {(() => {
                                                            const clientMsg = metadata?.clientMessage;
                                                            const parsedMsg = message.message?.match(/💬 \*Message:\*\n(.*?)$/s)?.[1]?.trim();
                                                            const finalMessage = clientMsg || parsedMsg;
                                                            return finalMessage ? (
                                                                <div className={`relative px-4 py-3 rounded-2xl text-[13px] leading-relaxed italic ${isSender ? 'bg-black/15 text-primary-50 shadow-inner' : 'bg-gray-100 text-gray-700'}`}>
                                                                    <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${isSender ? 'bg-primary-300' : 'bg-primary-500'}`}></div>
                                                                    "{finalMessage}"
                                                                </div>
                                                            ) : null;
                                                        })()}

                                                        <div className={`text-[10px] text-center italic mt-1 opacity-50 ${isSender ? 'text-white' : 'text-gray-400'}`}>
                                                            B2B Marketplace Verified Order Path
                                                        </div>
                                                    </div>
                                                ) : message.messageType === 'image' ? (
                                                    <div className="space-y-2">
                                                        <img
                                                            src={getImageUrl(message.metadata?.fileUrl)}
                                                            alt={message.metadata?.fileName}
                                                            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-all shadow-sm"
                                                            onClick={() => window.open(getImageUrl(message.metadata?.fileUrl), '_blank')}
                                                        />
                                                        {message.message && <p className="text-[15px]">{message.message}</p>}
                                                    </div>
                                                ) : message.messageType === 'file' ? (
                                                    <div className="space-y-2">
                                                        <a
                                                            href={getImageUrl(message.metadata?.fileUrl)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSender ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSender ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-600'}`}>
                                                                <FiFile className="text-xl" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-bold truncate ${isSender ? 'text-white' : 'text-gray-800'}`}>{message.metadata?.fileName}</p>
                                                                <p className={`text-[10px] uppercase font-bold tracking-tighter ${isSender ? 'text-primary-100' : 'text-gray-400'}`}>{message.metadata?.fileFormat || 'FILE'} • Click to view</p>
                                                            </div>
                                                        </a>
                                                        {message.message && <p className="text-[15px]">{message.message}</p>}
                                                    </div>
                                                ) : (
                                                    <p className="text-[15px] leading-relaxed">{message.message}</p>
                                                )}

                                                <div className={`flex items-center justify-end gap-1.5 mt-2 ${isSender ? 'text-primary-100' : 'text-gray-400'}`}>
                                                    <span className="text-[10px]">
                                                        {new Date(message.createdAt).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                    {isSender && (
                                                        <span className="text-[10px] opacity-80 decoration-0">
                                                            {message.readStatus ? 'Read' : 'Sent'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                            <div className="flex gap-2 items-center">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingFile || sending}
                                    className={`p-2 rounded-lg transition-colors ${uploadingFile ? 'bg-gray-100 text-gray-400' : 'text-gray-500 hover:bg-gray-100'}`}
                                    title="Attach file"
                                >
                                    <FiPaperclip className={`text-xl ${uploadingFile ? 'animate-pulse' : ''}`} />
                                </button>
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={uploadingFile ? "Uploading file..." : "Type a message..."}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={sending || uploadingFile}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={(!messageText.trim() && !uploadingFile) || sending || uploadingFile}
                                    className="w-12 h-12 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center flex-shrink-0">
                                    {sending ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <FiSend className="text-lg" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <MobileLayout showBottomNav={false} showCartBar={false} fullScreen={true}>
                        <div className="h-full bg-gray-50 flex flex-col overflow-hidden min-h-0">
                            {/* Header */}
                            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                                <button
                                    onClick={() => onClose ? onClose() : navigate(-1)}
                                    className="p-2 hover:bg-gray-100 rounded-lg">
                                    <FiArrowLeft className="text-xl" />
                                </button>
                                <div className="flex-1">
                                    <h1 className="font-semibold text-gray-800">{vendorName}</h1>
                                    {vendorInfo?.isVerified && (
                                        <p className="text-xs text-gray-500">Verified Vendor</p>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        <p>No messages yet. Start the conversation!</p>
                                    </div>
                                ) : (
                                    messages.map((message) => {
                                        const isSender = (message.senderId?._id || message.senderId) === (user?._id || user?.id);
                                        const isInquiry = message.messageType === 'inquiry' || (message.message && message.message.includes('📦 *INQUIRY FOR:'));
                                        const metadata = message.metadata || {};

                                        return (
                                            <motion.div
                                                key={message._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isSender
                                                        ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-tr-none'
                                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                        }`}>

                                                    {isInquiry ? (
                                                        <div className="flex flex-col gap-3 min-w-[260px]">
                                                            {/* Premium Header */}
                                                            <div className={`flex items-center justify-between pb-2 border-b ${isSender ? 'border-white/20' : 'border-gray-100'}`}>
                                                                <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-extrabold ${isSender ? 'text-primary-100' : 'text-primary-700'}`}>
                                                                    <FiBox className="text-xs" />
                                                                    Wholesale Inquiry
                                                                </div>
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSender ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                                    #{message._id.slice(-4).toUpperCase()}
                                                                </span>
                                                            </div>

                                                            {/* Product Card */}
                                                            <div className={`flex items-center gap-3 p-2.5 rounded-2xl ${isSender ? 'bg-white/10 shadow-inner' : 'bg-gray-50 border border-gray-100'}`}>
                                                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-sm border border-gray-200">
                                                                    {metadata.productImage ? (
                                                                        <img
                                                                            src={getImageUrl(metadata.productImage)}
                                                                            alt={metadata.productName}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                                                            <FiBox className="text-gray-300 text-xl" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`font-black text-[14px] leading-tight truncate-2-lines ${isSender ? 'text-white' : 'text-gray-900'}`}>
                                                                        {metadata.productName || (message.message.match(/\*INQUIRY FOR: (.*?)\*/)?.[1]) || 'Product Inquiry'}
                                                                    </p>
                                                                    <p className={`text-[11px] mt-1 font-bold ${isSender ? 'text-primary-100' : 'text-primary-600'}`}>
                                                                        Rate: ₹{metadata?.productPrice ? (typeof metadata.productPrice === 'number' ? metadata.productPrice.toLocaleString('en-IN') : metadata.productPrice) : 'N/A'}/unit
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Order Analytics */}
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <div className={`p-3 rounded-2xl ${isSender ? 'bg-white/10' : 'bg-primary-50'}`}>
                                                                    <p className={`text-[9px] uppercase font-bold opacity-60 ${isSender ? 'text-white' : 'text-primary-700'}`}>Quantity</p>
                                                                    <p className={`text-md font-black mt-0.5 ${isSender ? 'text-white' : 'text-primary-900'}`}>
                                                                        {metadata.quantity || (message.message.match(/\*Quantity:\* (.*?) units/)?.[1]) || '---'}
                                                                        <span className="text-[10px] font-normal ml-1">Units</span>
                                                                    </p>
                                                                </div>
                                                                <div className={`p-3 rounded-2xl ${isSender ? 'bg-white/10' : 'bg-green-50'}`}>
                                                                    <p className={`text-[9px] uppercase font-bold opacity-60 ${isSender ? 'text-white' : 'text-green-700'}`}>Order Status</p>
                                                                    <p className={`text-xs font-bold mt-1.5 ${isSender ? 'text-white' : 'text-green-900'}`}>Open for Quote</p>
                                                                </div>
                                                            </div>

                                                            {/* Quote Message */}
                                                            {(() => {
                                                                const clientMsg = metadata?.clientMessage;
                                                                const parsedMsg = message.message?.match(/💬 \*Message:\*\n(.*?)$/s)?.[1]?.trim();
                                                                const finalMessage = clientMsg || parsedMsg;
                                                                return finalMessage ? (
                                                                    <div className={`relative px-4 py-3 rounded-2xl text-[13px] leading-relaxed italic ${isSender ? 'bg-black/15 text-primary-50 shadow-inner' : 'bg-gray-100 text-gray-700'}`}>
                                                                        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${isSender ? 'bg-primary-300' : 'bg-primary-500'}`}></div>
                                                                        "{finalMessage}"
                                                                    </div>
                                                                ) : null;
                                                            })()}

                                                            {/* Attachment inside Inquiry */}
                                                            {metadata.attachment && (
                                                                <div className="space-y-2">
                                                                    <p className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${isSender ? 'text-white' : 'text-gray-500'}`}>Attached Document</p>
                                                                    <a
                                                                        href={getImageUrl(metadata.attachment.fileUrl)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSender ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                                                                    >
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSender ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-600'}`}>
                                                                            <FiFile className="text-lg" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className={`text-xs font-bold truncate ${isSender ? 'text-white' : 'text-gray-800'}`}>{metadata.attachment.fileName}</p>
                                                                            <p className={`text-[9px] uppercase font-bold tracking-tighter ${isSender ? 'text-primary-100' : 'text-gray-400'}`}>{metadata.attachment.fileFormat || 'FILE'} • Click to view</p>
                                                                        </div>
                                                                    </a>
                                                                </div>
                                                            )}

                                                            <div className={`text-[10px] text-center italic mt-1 opacity-50 ${isSender ? 'text-white' : 'text-gray-400'}`}>
                                                                B2B Marketplace Verified Order Path
                                                            </div>
                                                        </div>
                                                    ) : message.messageType === 'image' ? (
                                                        <div className="space-y-2">
                                                            <img
                                                                src={getImageUrl(message.metadata?.fileUrl)}
                                                                alt={message.metadata?.fileName}
                                                                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-all shadow-sm"
                                                                onClick={() => window.open(getImageUrl(message.metadata?.fileUrl), '_blank')}
                                                            />
                                                            {message.message && <p className="text-[15px]">{message.message}</p>}
                                                        </div>
                                                    ) : message.messageType === 'file' ? (
                                                        <div className="space-y-2">
                                                            <a
                                                                href={getImageUrl(message.metadata?.fileUrl)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSender ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                                                            >
                                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSender ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-600'}`}>
                                                                    <FiFile className="text-xl" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-sm font-bold truncate ${isSender ? 'text-white' : 'text-gray-800'}`}>{message.metadata?.fileName}</p>
                                                                    <p className={`text-[10px] uppercase font-bold tracking-tighter ${isSender ? 'text-primary-100' : 'text-gray-400'}`}>{message.metadata?.fileFormat || 'FILE'} • Click to view</p>
                                                                </div>
                                                            </a>
                                                            {message.message && <p className="text-[15px]">{message.message}</p>}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[15px] leading-relaxed">{message.message}</p>
                                                    )}

                                                    <div className={`flex items-center justify-end gap-1.5 mt-2 ${isSender ? 'text-primary-100' : 'text-gray-400'}`}>
                                                        <span className="text-[10px]">
                                                            {new Date(message.createdAt).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </span>
                                                        {isSender && (
                                                            <span className="text-[10px] opacity-80 decoration-0">
                                                                {message.readStatus ? 'Read' : 'Sent'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingFile || sending}
                                        className={`p-2 rounded-lg transition-colors ${uploadingFile ? 'bg-gray-100 text-gray-400' : 'text-gray-500 hover:bg-gray-100'}`}
                                        title="Attach file"
                                    >
                                        <FiPaperclip className={`text-xl ${uploadingFile ? 'animate-pulse' : ''}`} />
                                    </button>
                                    <input
                                        type="text"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder={uploadingFile ? "Uploading file..." : "Type a message..."}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        disabled={sending || uploadingFile}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={(!messageText.trim() && !uploadingFile) || sending || uploadingFile}
                                        className="w-12 h-12 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center flex-shrink-0">
                                        {sending ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <FiSend className="text-lg" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </MobileLayout>
                )}
            </PageTransition>
        </ProtectedRoute>
    );
};

export default Chat;
