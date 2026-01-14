import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiSearch, FiSend, FiPaperclip, FiMoreVertical, FiArrowLeft, FiCheck, FiClock, FiUser, FiPackage, FiInfo } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';

const Inquiries = () => {
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [message, setMessage] = useState('');

    const chats = [
        {
            id: '1',
            vendor: 'Surat Textiles Ltd.',
            lastMessage: 'We can offer 10% discount on orders above 500 units.',
            time: '2:30 PM',
            unread: 2,
            avatar: 'https://images.unsplash.com/photo-1558588942-930faae5a389?auto=format&fit=crop&q=80&w=100',
            product: 'Cotton Fabric - Bulk',
            status: 'Negotiating'
        },
        {
            id: '2',
            vendor: 'Gizmo Wholesale',
            lastMessage: 'The shipment for Smart Watch X10 has been dispatched.',
            time: 'Yesterday',
            unread: 0,
            avatar: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=100',
            product: 'Wireless Earbuds X10',
            status: 'Shipped'
        },
        {
            id: '3',
            vendor: 'Agra Leathers',
            lastMessage: 'Can you please confirm the payment terms?',
            time: 'Monday',
            unread: 0,
            avatar: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&q=80&w=100',
            product: 'Leather Bags (50pcs)',
            status: 'Pending'
        },
        {
            id: '4',
            vendor: 'Indo-Chemicals Corp',
            lastMessage: 'Samples are ready for pickup.',
            time: '3 days ago',
            unread: 0,
            avatar: 'https://images.unsplash.com/photo-1532187875681-3f91459a9f53?auto=format&fit=crop&q=80&w=100',
            product: 'Industrial Grade Resin',
            status: 'Closed'
        }
    ];

    const messages = [
        { id: 1, sender: 'vendor', text: 'Hello! I saw your inquiry for Cotton Fabric bulk order.', time: '10:00 AM' },
        { id: 2, sender: 'user', text: 'Yes, looking for 1000 meters. What is the best price?', time: '10:05 AM' },
        { id: 3, sender: 'vendor', text: 'For 1000m, we can give ₹180/meter.', time: '10:15 AM' },
        { id: 4, sender: 'user', text: 'Can we do ₹165? We have regular requirements.', time: '10:20 AM' },
        { id: 5, sender: 'vendor', text: 'We can offer 10% discount on orders above 500 units.', time: '2:30 PM' },
    ];

    const filteredChats = chats.filter(chat =>
        chat.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.product.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        // Logic for sending message would go here
        setMessage('');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0">
            <B2BHeader title="Inquiries & Messages" />

            <main className="flex-1 flex max-w-7xl mx-auto w-full overflow-hidden h-[calc(100vh-64px-80px)] md:h-[calc(100vh-64px)]">
                {/* Chat List */}
                <div className={`w-full md:w-96 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-50">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500/20 text-sm transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`w-full p-4 flex gap-4 transition-all hover:bg-gray-50 border-b border-gray-50/50 ${selectedChat?.id === chat.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : 'bg-white'}`}
                            >
                                <div className="relative flex-shrink-0">
                                    <img src={chat.avatar} alt={chat.vendor} className="w-12 h-12 rounded-2xl object-cover" />
                                    {chat.unread > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                            {chat.unread}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className="font-bold text-gray-800 text-sm truncate">{chat.vendor}</h4>
                                        <span className="text-[10px] font-medium text-gray-500 whitespace-nowrap ml-2">{chat.time}</span>
                                    </div>
                                    <p className="text-xs font-bold text-primary-600 mb-1 truncate">{chat.product}</p>
                                    <p className="text-xs text-gray-500 truncate leading-tight line-clamp-1">{chat.lastMessage}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={`flex-1 flex flex-col bg-white ${!selectedChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                    {selectedChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-800">
                                        <FiArrowLeft size={20} />
                                    </button>
                                    <img src={selectedChat.avatar} alt={selectedChat.vendor} className="w-10 h-10 rounded-xl object-cover" />
                                    <div>
                                        <h3 className="font-bold text-gray-800 leading-tight">{selectedChat.vendor}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
                                        <FiInfo size={20} />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
                                        <FiMoreVertical size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Conversation Info Context */}
                            <div className="px-6 py-3 bg-primary-50/50 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary-600">
                                        <FiPackage size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Regarding Product</p>
                                        <p className="text-xs font-bold text-primary-700">{selectedChat.product}</p>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedChat.status === 'Negotiating' ? 'bg-blue-100 text-blue-700' :
                                        selectedChat.status === 'Shipped' ? 'bg-green-100 text-green-700' :
                                            selectedChat.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-600'
                                    }`}>
                                    {selectedChat.status}
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm relative ${msg.sender === 'user'
                                                ? 'bg-primary-600 text-white rounded-tr-none'
                                                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                            }`}>
                                            <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                            <div className={`flex items-center justify-end gap-1 mt-1 ${msg.sender === 'user' ? 'text-primary-100' : 'text-gray-400'}`}>
                                                <span className="text-[10px] font-medium">{msg.time}</span>
                                                {msg.sender === 'user' && <FiCheck size={12} />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Message Input */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                    <button type="button" className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all">
                                        <FiPaperclip size={20} />
                                    </button>
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            placeholder="Write a message..."
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500/20 text-sm transition-all"
                                        />
                                        <button
                                            type="submit"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95"
                                        >
                                            <FiSend size={18} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="text-center px-4">
                            <div className="w-24 h-24 bg-primary-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-primary-600 shadow-xl shadow-primary-50">
                                <FiMessageSquare size={40} />
                            </div>
                            <h3 className="text-2xl font-extrabold text-gray-800 mb-2">Select a Conversation</h3>
                            <p className="text-gray-500 max-w-xs mx-auto leading-relaxed">
                                Pick a vendor from the list to view your inquiry details and continue the conversation.
                            </p>
                        </div>
                    )}
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default Inquiries;
