import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiSearch } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import Chat from '../../../shared/components/Chat/Chat';
import chatService from '../../../shared/services/chatService';
import { useAuthStore } from '../../../shared/store/authStore';
import { getImageUrl } from '../../../shared/utils/helpers';

const Inquiries = () => {
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        setLoading(true);
        try {
            // Check if user is logged in
            if (!localStorage.getItem('token')) {
                return;
            }

            const response = await chatService.getUserConversations();
            if (response.success) {
                setConversations(response.data || []);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectChat = (conversation) => {
        // Format conversation for Chat component
        const formattedChat = {
            id: conversation._id,
            partnerId: conversation.participants.find(p => p.userId._id !== user._id)?.userId._id, // Find the vendor ID
            partnerName: conversation.participants.find(p => p.userId._id !== user._id)?.userId.storeName || 'Vendor',
            partnerImage: conversation.participants.find(p => p.userId._id !== user._id)?.userId.storeLogo || '',
            lastMessage: conversation.lastMessage?.message,
            time: conversation.lastMessageAt,
            unreadCount: conversation.unreadCount
        };
        setSelectedChat(formattedChat);
    };

    // Filter conversations
    const filteredConversations = conversations.filter(chat => {
        const vendor = chat.participants.find(p => p.userId._id !== user._id)?.userId;
        const vendorName = vendor?.storeName || vendor?.name || 'Vendor';
        return vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    });

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
                        {loading ? (
                            <div className="p-4 text-center text-gray-400 text-sm">Loading inquiries...</div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <FiMessageSquare className="text-4xl mx-auto mb-2 opacity-20" />
                                <p>No inquiries found</p>
                            </div>
                        ) : (
                            filteredConversations.map((chat) => {
                                const vendor = chat.participants.find(p => p.userId._id !== user?._id)?.userId;
                                const vendorName = vendor?.storeName || vendor?.name || 'Vendor';
                                const vendorImage = vendor?.storeLogo || vendor?.avatar;
                                const lastMsg = chat.lastMessage?.messageType === 'inquiry' ? '📦 Wholesale Inquiry' : chat.lastMessage?.message;

                                return (
                                    <button
                                        key={chat._id}
                                        onClick={() => handleSelectChat(chat)}
                                        className={`w-full p-4 flex gap-4 transition-all hover:bg-gray-50 border-b border-gray-50/50 ${selectedChat?.id === chat._id ? 'bg-primary-50 border-l-4 border-l-primary-600' : 'bg-white'}`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            {vendorImage ? (
                                                <img src={getImageUrl(vendorImage)} alt={vendorName} className="w-12 h-12 rounded-2xl object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl">
                                                    {vendorName.charAt(0)}
                                                </div>
                                            )}
                                            {chat.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="font-bold text-gray-800 text-sm truncate">{vendorName}</h4>
                                                <span className="text-[10px] font-medium text-gray-500 whitespace-nowrap ml-2">
                                                    {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate leading-tight line-clamp-1">{lastMsg || 'No messages yet'}</p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={`flex-1 flex flex-col bg-white ${!selectedChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                    {selectedChat ? (
                        <div className="w-full h-full flex flex-col">
                            {/* Using the shared Chat component which handles everything including the header */}
                            <Chat
                                vendorId={selectedChat.partnerId}
                                initialProduct={null} // Not initiating a new inquiry, just viewing
                                onClose={() => setSelectedChat(null)}
                                isFullPage={true} // Add a prop to adapt styling for full page if needed
                            />
                        </div>
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
