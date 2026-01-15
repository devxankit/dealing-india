import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiMessageSquare, FiUser, FiSearch } from 'react-icons/fi';
import { motion } from 'framer-motion';
import PageTransition from '../../../shared/components/PageTransition';
import chatService from '../../../shared/services/chatService';
import { initializeSocket } from '../../../shared/utils/socket';
import { useVendorAuthStore } from '../store/vendorAuthStore';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { getImageUrl } from '../../../shared/utils/helpers';

const VendorChat = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();

  const [allVendors, setAllVendors] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Load all verified vendors
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const response = await api.get('/vendors', {
          params: {
            isVerified: true,
            limit: 1000
          }
        });

        if (response.success) {
          const vendors = response.data.vendors || [];
          // Filter out current vendor
          const otherVendors = vendors.filter(v =>
            (v._id || v.id) !== (vendor?._id || vendor?.id)
          );
          setAllVendors(otherVendors);
          console.log('Loaded vendors:', otherVendors.length);
        }
      } catch (error) {
        console.error('Error loading vendors:', error);
      }
    };

    if (vendor) {
      loadVendors();
    }
  }, [vendor]);

  useEffect(() => {
    const initChat = async () => {
      try {
        setLoading(true);
        const currentVendorId = vendor?._id || vendor?.id;
        console.log('Initializing vendor chat for vendor:', currentVendorId);

        // Initialize socket
        const token = localStorage.getItem('vendor-token');
        if (token) {
          socketRef.current = initializeSocket(token);

          socketRef.current.on('new_chat_message', (message) => {
            console.log('Vendor received global new message:', message);
            loadConversations();
          });
        }

        const response = await chatService.getVendorConversations();
        let loadedConvs = [];
        if (response.success) {
          loadedConvs = response.data || [];
          setConversations(loadedConvs);
          console.log('Loaded conversations:', loadedConvs.length);
        }

        // Handle direct chat from URL if vendorId is present
        if (vendorId) {
          // Check if conversation exists
          const existingConv = loadedConvs.find(c => {
            const other = c.otherParticipant?.userId;
            const otherId = other?._id || other;
            return otherId === (vendorId?._id || vendorId);
          });

          if (existingConv) {
            selectConversation(existingConv);
          } else {
            // Find vendor and create conversation
            const targetVendor = allVendors.find(v => (v._id || v.id) === vendorId);
            if (targetVendor) {
              await startNewConversation(targetVendor);
            }
          }
        }
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
        socketRef.current.off('receive_message');
        socketRef.current.off('new_chat_message');
      }
    };
  }, [vendorId, vendor?._id, allVendors]);

  // Handle socket listeners when selectedConversation changes
  useEffect(() => {
    if (socketRef.current && selectedConversation?._id) {
      console.log('Vendor joining chat room:', selectedConversation._id);
      socketRef.current.emit('join_chat_room', { conversationId: selectedConversation._id });

      const handleNewMessage = (message) => {
        console.log('Vendor received message:', message);

        if (selectedConversation && message.conversationId === selectedConversation._id) {
          setMessages((prev) => {
            const exists = prev.find(m => m._id === message._id);
            if (exists) return prev;
            return [...prev, message];
          });
          scrollToBottom();
          chatService.markVendorAllAsRead(selectedConversation._id).catch(console.error);
        }

        loadConversations();
      };

      socketRef.current.on('receive_message', handleNewMessage);

      return () => {
        if (selectedConversation?._id) {
          socketRef.current.emit('leave_chat_room', { conversationId: selectedConversation._id });
        }
        socketRef.current.off('receive_message', handleNewMessage);
      };
    }
  }, [selectedConversation?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await chatService.getVendorConversations();
      if (response.success) {
        setConversations(response.data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const startNewConversation = async (targetVendor) => {
    try {
      setLoading(true);
      const targetVendorId = targetVendor._id || targetVendor.id;

      // Create or get conversation
      const response = await chatService.createVendorConversation(targetVendorId);

      if (response.success) {
        const conversation = response.data;
        setSelectedConversation(conversation);
        setSelectedVendor(targetVendor);

        // Load messages
        const messagesResponse = await chatService.getVendorMessages(conversation._id);
        if (messagesResponse.success) {
          setMessages(messagesResponse.data.messages || []);
        }

        // Reload conversations list
        await loadConversations();
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation) => {
    try {
      setSelectedConversation(conversation);
      setSelectedVendor(conversation.otherParticipant?.userId);

      // Leave previous room
      if (selectedConversation?._id && socketRef.current) {
        socketRef.current.emit('leave_chat_room', { conversationId: selectedConversation._id });
      }

      // Join new room
      if (socketRef.current) {
        socketRef.current.emit('join_chat_room', { conversationId: conversation._id });
      }

      // Load messages
      const messagesResponse = await chatService.getVendorMessages(conversation._id);
      if (messagesResponse.success) {
        setMessages(messagesResponse.data.messages || []);
      }

      // Mark as read
      await chatService.markVendorAllAsRead(conversation._id);
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const otherParticipant = selectedConversation.otherParticipant?.userId;
      if (!otherParticipant) {
        toast.error('Recipient not found');
        return;
      }

      const receiverId = otherParticipant._id || otherParticipant;
      const receiverRole = selectedConversation.otherParticipant?.role || 'user';

      const response = await chatService.sendVendorMessage(
        selectedConversation._id,
        receiverId,
        messageText,
        'text',
        null
      );

      if (response.success) {
        const newMessage = response.data?.data || response.data || response;
        setMessages((prev) => {
          const exists = prev.find(m => m._id === newMessage._id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        setMessageText('');
        scrollToBottom();
        loadConversations();
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

  // Filter vendors based on search
  const filteredVendors = allVendors.filter(v =>
    v.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combine conversations and vendors for display
  const displayList = [...conversations];

  // Add vendors that don't have conversations yet
  filteredVendors.forEach(vendor => {
    const hasConversation = conversations.some(conv => {
      const otherId = conv.otherParticipant?.vendorId?._id || conv.otherParticipant?.vendorId;
      return otherId === (vendor._id || vendor.id);
    });

    if (!hasConversation) {
      displayList.push({
        _id: `vendor_${vendor._id || vendor.id}`,
        isNewVendor: true,
        vendorData: vendor,
        unreadCount: 0
      });
    }
  });

  if (loading) {
    return (
      <PageTransition>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chat...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const currentOtherInfo = selectedVendor || selectedConversation?.otherParticipant?.userId;
  const displayName = currentOtherInfo?.name || currentOtherInfo?.storeName || 'Chat';
  const displayRole = selectedConversation?.otherParticipant?.role === 'user' ? 'Buyer' : 'Vendor';

  return (
    <PageTransition className="h-full">
      <div className="h-full flex bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        {/* Vendors/Conversations List */}
        <div className={`${selectedConversation ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 border-r border-gray-200 bg-white flex-col h-full relative`}>
          <div className="sticky top-0 p-5 border-b border-gray-200 bg-white z-20 shrink-0">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Vendor Chat</h2>
            {/* Search Bar */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {displayList.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <FiMessageSquare className="text-4xl mx-auto mb-2 text-gray-400" />
                <p>No vendors found</p>
              </div>
            ) : (
              displayList.map((item) => {
                const isNewVendor = item.isNewVendor;
                const otherData = isNewVendor ? item.vendorData : item.otherParticipant?.userId;
                const unreadCount = item.unreadCount || 0;
                const isSelected = selectedConversation?._id === item._id;
                const role = isNewVendor ? 'vendor' : (item.otherParticipant?.role || 'user');

                return (
                  <div
                    key={item._id}
                    onClick={() => {
                      if (isNewVendor) {
                        startNewConversation(item.vendorData);
                      } else {
                        selectConversation(item);
                      }
                    }}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                      }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${role === 'user' ? 'bg-blue-100' : 'bg-primary-100'}`}>
                        {otherData?.storeLogo || otherData?.image || otherData?.avatar ? (
                          <img
                            src={otherData.storeLogo || otherData.image || otherData.avatar}
                            alt={otherData.storeName || otherData.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          role === 'user' ? <FiUser className="text-blue-600 text-xl" /> : <FiUser className="text-primary-600 text-xl" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {otherData?.storeName || otherData?.name || 'User'}
                          </h3>
                          {unreadCount > 0 && (
                            <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {!isNewVendor && item.lastMessage && (
                          <p className="text-sm text-gray-600 truncate italic">
                            {item.lastMessage.messageType === 'inquiry' ? '📦 Premium Inquiry Received' : item.lastMessage.message}
                          </p>
                        )}
                        {isNewVendor && (
                          <p className="text-xs text-gray-500">Click to start chat</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`${!selectedConversation ? 'hidden sm:flex' : 'flex'} flex-1 flex flex-col h-full bg-gray-50 relative overflow-hidden`}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-3 shrink-0 z-20">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="sm:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
                  <FiArrowLeft className="text-xl" />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${displayRole === 'Buyer' ? 'bg-blue-100' : 'bg-primary-100'}`}>
                  {currentOtherInfo?.storeLogo || currentOtherInfo?.image || currentOtherInfo?.avatar ? (
                    <img
                      src={currentOtherInfo.storeLogo || currentOtherInfo.image || currentOtherInfo.avatar}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <FiUser className={displayRole === 'Buyer' ? 'text-blue-600' : 'text-primary-600'} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-semibold text-gray-800 truncate">{displayName}</h1>
                  <p className="text-sm text-gray-500">{displayRole}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isSender = (message.senderId?._id || message.senderId) === (vendor?._id || vendor?.id);
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
                                <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-extrabold ${isSender ? 'text-primary-100' : 'text-amber-700'}`}>
                                  <FiBox className="text-xs" />
                                  Wholesale Inquiry
                                </div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSender ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  #{message._id.slice(-4).toUpperCase()}
                                </span>
                              </div>

                              {/* Product Card */}
                              <div className={`flex items-center gap-3 p-2.5 rounded-2xl ${isSender ? 'bg-white/10 shadow-inner' : 'bg-amber-50/50 border border-amber-100'}`}>
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
                                  <p className={`text-[11px] mt-1 font-bold ${isSender ? 'text-primary-100' : 'text-amber-700'}`}>
                                    Rate: ₹{metadata.productPrice || 'N/A'}/unit
                                  </p>
                                </div>
                              </div>

                              {/* Order Parameters */}
                              <div className="grid grid-cols-2 gap-2.5">
                                <div className={`p-3 rounded-2xl ${isSender ? 'bg-white/10' : 'bg-gray-50'}`}>
                                  <p className={`text-[9px] uppercase font-bold opacity-60 ${isSender ? 'text-white' : 'text-gray-500'}`}>Order Quantity</p>
                                  <p className={`text-md font-black mt-0.5 ${isSender ? 'text-white' : 'text-primary-700'}`}>
                                    {metadata.quantity || (message.message.match(/\*Quantity:\* (.*?) units/)?.[1]) || '---'}
                                    <span className="text-[10px] font-normal ml-1">Units</span>
                                  </p>
                                </div>
                                <div className={`p-3 rounded-2xl ${isSender ? 'bg-white/10' : 'bg-green-50'}`}>
                                  <p className={`text-[9px] uppercase font-bold opacity-60 ${isSender ? 'text-white' : 'text-green-700'}`}>Type</p>
                                  <p className={`text-xs font-bold mt-1.5 ${isSender ? 'text-white' : 'text-green-900'}`}>Bulk Order</p>
                                </div>
                              </div>

                              {/* User Message */}
                              {(metadata.clientMessage || message.message.includes('💬 *Message:*')) && (
                                <div className={`relative px-4 py-3 rounded-2xl text-[13px] leading-relaxed italic ${isSender ? 'bg-black/15 text-primary-50 shadow-inner' : 'bg-white/70 text-gray-700 border border-gray-100'}`}>
                                  "{metadata.clientMessage || (message.message.match(/💬 \*Message:\*\n(.*?)$/s)?.[1]) || 'Interested in this product.'}"
                                </div>
                              )}
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
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shrink-0 z-20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <FiSend className="text-lg" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <FiMessageSquare className="text-6xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a vendor to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default VendorChat;
