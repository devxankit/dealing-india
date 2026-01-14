import { useState, useRef, useEffect } from 'react';
import { FiSend, FiMessageSquare, FiUser, FiSearch } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';

const B2BVendorMessages = () => {
    const { vendor } = useB2BVendorAuthStore();
    const [conversations] = useState([
        { _id: 'c1', vendor: { storeName: 'Urban Fashion' }, lastMessage: 'Interested in bulk cotton shirts', time: '10:30 AM', unread: 2 },
        { _id: 'c2', vendor: { storeName: 'Tech Hub' }, lastMessage: 'What is the MOQ for earbuds?', time: 'Yesterday', unread: 0 },
    ]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef(null);

    const selectConversation = (conv) => {
        setSelectedConversation(conv);
        setMessages([
            { _id: 'm1', senderId: 'retailer123', text: conv.lastMessage, time: '10:30 AM' },
            { _id: 'm2', senderId: 'vendor123', text: 'Hello! Our MOQ is 100 units.', time: '10:35 AM' },
        ]);
    };

    const handleSend = () => {
        if (!messageText.trim()) return;
        const newMessage = { _id: Date.now().toString(), senderId: 'vendor123', text: messageText, time: 'Just now' };
        setMessages([...messages, newMessage]);
        setMessageText('');
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="h-[calc(100vh-140px)] flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Sidebar */}
            <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-100 flex-col`}>
                <div className="p-4 border-b border-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Buyer Inquiries</h2>
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search buyers..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.map(conv => (
                        <div key={conv._id} onClick={() => selectConversation(conv)} className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-slate-50 transition-colors ${selectedConversation?._id === conv._id ? 'bg-primary-50' : ''}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                                    <FiUser className="text-slate-400 text-xl" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between mb-1">
                                        <h4 className="font-bold text-gray-800 truncate">{conv.vendor.storeName}</h4>
                                        <span className="text-[10px] text-gray-400">{conv.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                                </div>
                                {conv.unread > 0 && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-slate-50`}>
                {selectedConversation ? (
                    <>
                        <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-3">
                            <button onClick={() => setSelectedConversation(null)} className="md:hidden text-gray-400"><FiSearch /></button>
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <FiUser className="text-primary-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{selectedConversation.vendor.storeName}</h3>
                                <p className="text-xs text-green-500 font-medium">Online</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(msg => {
                                const isVendor = msg.senderId === 'vendor123';
                                return (
                                    <div key={msg._id} className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-2xl ${isVendor ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-white text-gray-800 shadow-sm rounded-tl-none'}`}>
                                            <p className="text-sm">{msg.text}</p>
                                            <span className={`text-[10px] block mt-1 ${isVendor ? 'text-primary-100' : 'text-gray-400'}`}>{msg.time}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 bg-white border-t border-gray-100">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type your response..."
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-primary-500"
                                />
                                <button onClick={handleSend} className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-md">
                                    <FiSend />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <FiMessageSquare className="text-6xl mb-4 opacity-20" />
                        <p className="font-medium">Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default B2BVendorMessages;
