import { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiSend, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';
import api from '../../../../shared/utils/api';
import { API_BASE_URL } from '../../../../shared/utils/constants';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const LiveChat = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatDetail, setChatDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
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
      console.log('Socket connected for Live Chat');
    });

    socket.on('message_received', (data) => {
      if (selectedChat && data.sessionId === selectedChat.id) {
        setMessages((prev) => [...prev, data.message]);
        // Update chat list
        fetchChatSessions();
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        // Update chat list if message is for another chat
        fetchChatSessions();
      }
    });

    socket.on('error', (error) => {
      toast.error(error.message || 'Socket error');
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedChat]);

  // Fetch chat sessions
  useEffect(() => {
    fetchChatSessions();
  }, []);

  const fetchChatSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/support/chat/sessions');
      if (response.success && response.data?.sessions) {
        setChats(response.data.sessions);
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = async (chat) => {
    try {
      setLoadingMessages(true);
      setSelectedChat(chat);
      const response = await api.get(`/admin/support/chat/sessions/${chat.id}`);
      if (response.success && response.data?.session) {
        const sessionData = response.data.session;
        setChatDetail(sessionData);
        setMessages(sessionData.messages || []);

        // Mark messages as read
        await api.put(`/admin/support/chat/sessions/${chat.id}/read`);

        // Join chat session room via Socket.io
        if (socketRef.current) {
          socketRef.current.emit('join_chat_session', { sessionId: chat.id });
        }

        // Refresh chat list to update unread count
        await fetchChatSessions();

        // Scroll to bottom after messages load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      // Send via Socket.io if connected, otherwise fallback to REST
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_chat_message', {
          sessionId: selectedChat.id,
          message: newMessage.trim(),
        });
      } else {
        // REST fallback
        const response = await api.post(`/admin/support/chat/sessions/${selectedChat.id}/messages`, {
          message: newMessage.trim(),
        });
        if (response.success) {
          setMessages((prev) => [...prev, response.data.message]);
        }
      }
      setNewMessage('');
      // Refresh chat list
      await fetchChatSessions();
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      // Error toast is handled by api interceptor
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Live Chat</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage customer support chats</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Active Chats</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading chats...</div>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">No active chats</div>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiUser className="text-gray-400" />
                      <span className="font-semibold text-gray-800">{chat.customerName}</span>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{chat.lastMessage || 'No messages yet'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(chat.lastActivity).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedChat ? (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">{selectedChat.customerName}</h3>
              <p className="text-xs text-gray-500">
                Customer ID: {selectedChat.customerId || chatDetail?.customerId || 'N/A'}
              </p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px]">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">No messages yet</div>
                </div>
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
                      <p>{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender === 'admin' ? 'text-primary-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(msg.time).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
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
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center p-12">
            <div className="text-center">
              <FiMessageCircle className="mx-auto text-4xl text-gray-400 mb-4" />
              <p className="text-gray-500">Select a chat to start conversation</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LiveChat;

