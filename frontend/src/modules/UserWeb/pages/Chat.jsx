import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiMessageSquare } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import MobileLayout from '../../UserApp/components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';
import chatService from '../../../shared/services/chatService';
import { initializeSocket, getSocket } from '../../../shared/utils/socket';
import { useAuthStore } from '../../../shared/store/authStore';
import toast from 'react-hot-toast';

const Chat = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const { responsivePadding } = useResponsiveHeaderPadding();
  const { user } = useAuthStore();
  const location = window.location.pathname;
  const isMobileApp = location.startsWith('/app');

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [vendor, setVendor] = useState(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        setLoading(true);
        
        // Initialize socket
        const token = localStorage.getItem('token');
        if (token) {
          socketRef.current = initializeSocket(token);
          
          socketRef.current.on('receive_message', (message) => {
            console.log('Received message:', message);
            if (message.conversationId === conversation?._id || message.conversationId === vendorId) {
              setMessages((prev) => {
                // Avoid duplicates
                const exists = prev.find(m => m._id === message._id);
                if (exists) return prev;
                return [...prev, message];
              });
              scrollToBottom();
            }
          });

          socketRef.current.on('new_chat_message', (message) => {
            console.log('New chat message:', message);
            if (message.conversationId === conversation?._id || message.conversationId === vendorId) {
              setMessages((prev) => {
                // Avoid duplicates
                const exists = prev.find(m => m._id === message._id);
                if (exists) return prev;
                return [...prev, message];
              });
              scrollToBottom();
            }
          });
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

            // Join chat room
            if (socketRef.current && conv._id) {
              socketRef.current.emit('join_chat_room', { conversationId: conv._id });
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
          // Get all conversations
          const convsResponse = await chatService.getUserConversations();
          if (convsResponse.success && convsResponse.data && convsResponse.data.length > 0) {
            const firstConv = convsResponse.data[0];
            setConversation(firstConv);
            const vendorIdFromConv = firstConv.otherParticipant?.userId?._id || firstConv.otherParticipant?.userId || firstConv.participants?.find(p => p.role === 'vendor')?.userId?._id || firstConv.participants?.find(p => p.role === 'vendor')?.userId;
            if (vendorIdFromConv) {
              navigate(`/app/chat/${vendorIdFromConv}`, { replace: true });
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
        if (conversation?._id) {
          socketRef.current.emit('leave_chat_room', { conversationId: conversation._id });
        }
      }
    };
  }, [vendorId]);

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
      const vendorParticipant = conversation.participants.find(p => p.role === 'vendor');
      if (!vendorParticipant) {
        toast.error('Vendor not found');
        return;
      }

      const receiverId = vendorParticipant.userId._id || vendorParticipant.userId;
      const response = await chatService.sendMessage(
        conversation._id,
        receiverId,
        messageText
      );

      if (response && response.success !== false) {
        const newMessage = response.data?.data || response.data || response;
        setMessages((prev) => [...prev, newMessage]);
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
        <PageTransition>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading chat...</p>
            </div>
          </div>
        </PageTransition>
      </ProtectedRoute>
    );
  }

  if (!conversation && !loading) {
    return (
      <ProtectedRoute>
        <PageTransition>
          {isMobileApp ? (
            <MobileLayout showBottomNav={false} showCartBar={false}>
              <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
                            window.location.reload(); // Reload to show the conversation
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
          ) : (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
          )}
        </PageTransition>
      </ProtectedRoute>
    );
  }

  const vendorInfo = conversation.otherParticipant?.userId || vendor;
  const vendorName = vendorInfo?.storeName || vendorInfo?.name || 'Vendor';

  const content = (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
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
            <div className="container mx-auto px-4 py-6 max-w-4xl">
              {content}
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default Chat;

