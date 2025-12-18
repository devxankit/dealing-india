import { useState } from 'react';
import { FiMessageCircle, FiSend, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';

const LiveChat = () => {
  const [chats, setChats] = useState([
    {
      id: 1,
      customerName: 'John Doe',
      customerId: 'C001',
      lastMessage: 'Hello, I need help with my order',
      unreadCount: 2,
      status: 'active',
      lastActivity: new Date().toISOString(),
    },
    {
      id: 2,
      customerName: 'Jane Smith',
      customerId: 'C002',
      lastMessage: 'Thank you for your help!',
      unreadCount: 0,
      status: 'resolved',
      lastActivity: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setMessages([
      { id: 1, sender: 'customer', message: 'Hello, I need help with my order', time: new Date().toISOString() },
      { id: 2, sender: 'admin', message: 'Hi! How can I help you today?', time: new Date().toISOString() },
    ]);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages([...messages, {
      id: messages.length + 1,
      sender: 'admin',
      message: newMessage,
      time: new Date().toISOString(),
    }]);
    setNewMessage('');
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
            {chats.map((chat) => (
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
                <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(chat.lastActivity).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>

        {selectedChat ? (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">{selectedChat.customerName}</h3>
              <p className="text-xs text-gray-500">Customer ID: {selectedChat.customerId}</p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.sender === 'admin'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p>{msg.message}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender === 'admin' ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      {new Date(msg.time).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
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

