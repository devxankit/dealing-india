import { useState, useEffect, useRef } from "react";
import {
  FiMessageCircle,
  FiSend,
  FiUser,
  FiSearch,
  FiFilter,
  FiClock,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Badge from "../../../shared/components/Badge";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { useOrderStore } from "../../../shared/store/orderStore";
import toast from "react-hot-toast";

const Chat = () => {
  const { vendor } = useVendorAuthStore();
  const { orders } = useOrderStore();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const messagesEndRef = useRef(null);
  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;

    // Load chats from localStorage or initialize with dummy data
    const savedChats = localStorage.getItem(`vendor-${vendorId}-chats`);
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    } else {
      // Initialize with chats from orders
      const orderChats = orders
        .filter((order) => {
          if (order.vendorItems && Array.isArray(order.vendorItems)) {
            return order.vendorItems.some((vi) => vi.vendorId === vendorId);
          }
          return false;
        })
        .slice(0, 5)
        .map((order, index) => ({
          id: `chat-${order.id}`,
          customerId: order.userId || `customer-${index}`,
          customerName: order.shippingAddress?.name || `Customer ${index + 1}`,
          customerEmail:
            order.shippingAddress?.email || `customer${index + 1}@example.com`,
          orderId: order.id,
          lastMessage:
            index === 0
              ? "Hello, I need help with my order"
              : "Thank you for your help!",
          unreadCount: index === 0 ? 2 : 0,
          status: index === 0 ? "active" : index === 1 ? "resolved" : "active",
          lastActivity: order.date,
          createdAt: order.date,
        }));

      setChats(orderChats);
      localStorage.setItem(
        `vendor-${vendorId}-chats`,
        JSON.stringify(orderChats)
      );
    }
  }, [vendorId, orders]);

  useEffect(() => {
    if (selectedChat) {
      // Load messages for selected chat
      const savedMessages = localStorage.getItem(
        `vendor-${vendorId}-chat-${selectedChat.id}-messages`
      );
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        // Initialize with default messages
        const defaultMessages = [
          {
            id: 1,
            sender: "customer",
            message: selectedChat.lastMessage,
            time: selectedChat.lastActivity,
          },
          {
            id: 2,
            sender: "vendor",
            message: "Hi! How can I help you today?",
            time: new Date().toISOString(),
          },
        ];
        setMessages(defaultMessages);
        localStorage.setItem(
          `vendor-${vendorId}-chat-${selectedChat.id}-messages`,
          JSON.stringify(defaultMessages)
        );
      }
    }
  }, [selectedChat, vendorId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    // Mark as read
    const updatedChats = chats.map((c) =>
      c.id === chat.id ? { ...c, unreadCount: 0, status: "active" } : c
    );
    setChats(updatedChats);
    localStorage.setItem(
      `vendor-${vendorId}-chats`,
      JSON.stringify(updatedChats)
    );
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;

    const message = {
      id: messages.length + 1,
      sender: "vendor",
      message: newMessage,
      time: new Date().toISOString(),
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    setNewMessage("");

    // Update chat last message
    const updatedChats = chats.map((c) =>
      c.id === selectedChat.id
        ? {
          ...c,
          lastMessage: newMessage,
          lastActivity: new Date().toISOString(),
          unreadCount: 0,
        }
        : c
    );
    setChats(updatedChats);

    // Save to localStorage
    localStorage.setItem(
      `vendor-${vendorId}-chat-${selectedChat.id}-messages`,
      JSON.stringify(updatedMessages)
    );
    localStorage.setItem(
      `vendor-${vendorId}-chats`,
      JSON.stringify(updatedChats)
    );
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredChats = chats.filter((chat) => {
    const matchesSearch =
      !searchQuery ||
      chat.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.orderId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || chat.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeChats = chats.filter((c) => c.status === "active").length;
  const unreadCount = chats.reduce((sum, c) => sum + c.unreadCount, 0);

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to access chat</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Chat
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Communicate with customers and support
          </p>
        </div>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <Badge variant="warning" className="text-sm">
              {unreadCount} Unread
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${filterStatus === "all"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                All ({chats.length})
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${filterStatus === "active"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                Active ({activeChats})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredChats.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id
                        ? "bg-primary-50 border-l-4 border-primary-600"
                        : ""
                      }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <FiUser className="text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {chat.customerName}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {chat.orderId
                              ? `Order: ${chat.orderId}`
                              : chat.customerEmail}
                          </p>
                        </div>
                      </div>
                      {chat.unreadCount > 0 && (
                        <Badge variant="warning" className="text-xs">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate mb-1">
                      {chat.lastMessage}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(chat.lastActivity).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FiMessageCircle className="text-4xl text-gray-400 mb-4" />
                <p className="text-gray-500">No chats found</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        {selectedChat ? (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-primary-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <FiUser className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {selectedChat.customerName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedChat.orderId
                        ? `Order: ${selectedChat.orderId}`
                        : selectedChat.customerEmail}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    selectedChat.status === "active" ? "success" : "info"
                  }
                  className="text-xs">
                  {selectedChat.status === "active" ? "Active" : "Resolved"}
                </Badge>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "vendor" ? "justify-end" : "justify-start"
                    }`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.sender === "vendor"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-800"
                      }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${msg.sender === "vendor"
                          ? "text-primary-100"
                          : "text-gray-500"
                        }`}>
                      {new Date(msg.time).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <FiSend />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center p-12">
            <div className="text-center">
              <FiMessageCircle className="mx-auto text-4xl text-gray-400 mb-4" />
              <p className="text-gray-500">
                Select a chat to start conversation
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Chat;
