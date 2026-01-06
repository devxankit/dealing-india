import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiMessageSquare, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';
import PageTransition from '../../../shared/components/PageTransition';
import chatService from '../../../shared/services/chatService';
import { initializeSocket } from '../../../shared/utils/socket';
import { useVendorAuthStore } from '../store/vendorAuthStore';
import toast from 'react-hot-toast';

const VendorChat = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        setLoading(true);
        
        // Initialize socket
        const token = localStorage.getItem('vendorToken');
        if (token) {
          socketRef.current = initializeSocket(token);
          
          socketRef.current.on('receive_message', (message) => {
            if (message.conversationId === selectedConversation?._id) {
              setMessages((prev) => [...prev, message]);
              scrollToBottom();
            }
            // Update conversation list
            loadConversations();
          });

          socketRef.current.on('new_chat_message', (message) => {
            if (message.conversationId === selectedConversation?._id) {
              setMessages((prev) => [...prev, message]);
              scrollToBottom();
            }
            loadConversations();
          });
        }

        await loadConversations();

        if (userId) {
          // Find conversation with this user
          const conv = conversations.find(
            (c) => c.otherParticipant?.userId?._id === userId || c.otherParticipant?.userId === userId
          );
          if (conv) {
            selectConversation(conv);
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
        if (selectedConversation?._id) {
          socketRef.current.emit('leave_chat_room', { conversationId: selectedConversation._id });
        }
      }
    };
  }, []);

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

  const selectConversation = async (conversation) => {
    try {
      setSelectedConversation(conversation);
      
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
      const userParticipant = selectedConversation.participants.find(p => p.role === 'user');
      if (!userParticipant) {
        toast.error('User not found');
        return;
      }

      const receiverId = userParticipant.userId._id || userParticipant.userId;
      const response = await chatService.sendVendorMessage(
        selectedConversation._id,
        receiverId,
        messageText
      );

      if (response.success) {
        setMessages((prev) => [...prev, response.data.data]);
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

  const userInfo = selectedConversation?.otherParticipant?.userId;
  const userName = userInfo?.name || 'User';

  return (
    <PageTransition>
      <div className="h-full flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">User Chats</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <FiMessageSquare className="text-4xl mx-auto mb-2 text-gray-400" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const otherUser = conv.otherParticipant?.userId;
                const unreadCount = conv.unreadCount || 0;
                const isSelected = selectedConversation?._id === conv._id;
                
                return (
                  <div
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <FiUser className="text-primary-600 text-xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {otherUser?.name || 'User'}
                          </h3>
                          {unreadCount > 0 && (
                            <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-gray-600 truncate">
                            {conv.lastMessage.message}
                          </p>
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
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <FiUser className="text-primary-600" />
                </div>
                <div className="flex-1">
                  <h1 className="font-semibold text-gray-800">{userName}</h1>
                  <p className="text-sm text-gray-500">User</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isSender = message.senderRole === 'vendor';
                    return (
                      <motion.div
                        key={message._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-2 ${
                            isSender
                              ? 'bg-primary-600 text-white'
                              : 'bg-white text-gray-800 border border-gray-200'
                          }`}>
                          <p className="text-sm">{message.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isSender ? 'text-primary-100' : 'text-gray-500'
                            }`}>
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-200 p-4">
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
                <p className="text-gray-600">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default VendorChat;

