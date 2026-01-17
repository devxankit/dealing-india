import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiSearch, FiArrowLeft } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import Chat from '../../../shared/components/Chat/Chat';
import chatService from '../../../shared/services/chatService';
import { useAuthStore } from '../../../shared/store/authStore';
import { getImageUrl } from '../../../shared/utils/helpers';
import { toast } from 'react-hot-toast';

const Inquiries = () => {
    const [searchParams] = useSearchParams();
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
            if (!localStorage.getItem('token')) return;

            const response = await chatService.getUserConversations({ vendorType: 'b2b' });
            if (response.success && response.data) {
                setConversations(response.data);

                // If vendorId is in URL, auto-select that chat
                const urlVendorId = searchParams.get('vendorId');
                if (urlVendorId) {
                    const conv = response.data.find(c => {
                        const otherP = c.participants.find(p => {
                            const pId = p.userId?._id || p.userId?.id || (typeof p.userId === 'string' ? p.userId : null);
                            return pId === urlVendorId;
                        });
                        return !!otherP;
                    });

                    if (conv) {
                        handleSelectChat(conv);
                    } else {
                        // If no existing conversation, we can still set a mock one or wait for Chat component to create it
                        setSelectedChat({
                            id: 'new',
                            partnerId: urlVendorId,
                            partnerName: 'New Conversation'
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectChat = (conversation) => {
        // Find the other participant who is not the current user
        const otherParticipant = conversation.participants.find(p => {
            const participantId = p.userId?._id || p.userId?.id || (typeof p.userId === 'string' ? p.userId : null);
            const currentUserId = user?._id || user?.id;
            return participantId && participantId !== currentUserId;
        });

        const vendor = otherParticipant?.userId;
        const vendorId = vendor?._id || vendor?.id || (typeof vendor === 'string' ? vendor : null);

        if (!vendorId) {
            console.error('Could not find vendor ID for conversation:', conversation);
            toast.error('Could not open chat: Vendor information missing');
            return;
        }

        // Format conversation for Chat component
        const formattedChat = {
            id: conversation._id,
            partnerId: vendorId,
            partnerName: vendor?.storeName || vendor?.name || 'Vendor',
            partnerImage: vendor?.storeLogo || vendor?.avatar || '',
            lastMessage: conversation.lastMessage?.message,
            time: conversation.lastMessageAt,
            unreadCount: conversation.unreadCount
        };
        setSelectedChat(formattedChat);
    };

    // Filter conversations
    const filteredConversations = conversations.filter(chat => {
        const currentUserId = user?._id || user?.id;
        const otherParticipant = chat.participants.find(p => (p.userId?._id || p.userId) !== currentUserId);
        const vendor = otherParticipant?.userId;
        const vendorName = vendor?.storeName || vendor?.name || 'Vendor';
        return vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden h-screen">
            <B2BHeader title="Inquiries & Messages" sticky={false} />

            <main className="flex-1 flex max-w-7xl mx-auto w-full overflow-hidden relative min-h-0">
                {/* Chat List */}
                <div className={`w-full md:w-96 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-full min-h-0 ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
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
                                                    {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
                <div className={`flex-1 flex flex-col bg-white min-h-0 ${!selectedChat ? 'hidden sm:flex items-center justify-center' : 'flex bg-white z-[50] sm:z-0'}`}>
                    {selectedChat ? (
                        <div className="w-full h-full flex flex-col">
                            {/* Using the shared Chat component which handles everything including the header */}
                            <Chat
                                vendorId={selectedChat.partnerId}
                                initialProduct={null} // Not initiating a new inquiry, just viewing
                                onClose={() => setSelectedChat(null)}
                                embedded={true}
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
