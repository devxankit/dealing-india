import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBox, FiMessageSquare, FiArrowRight, FiBriefcase, FiHash } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { Link } from 'react-router-dom';
import chatService from '../../../shared/services/chatService';
import { useAuthStore } from '../../../shared/store/authStore';

// Helper function to format relative time
const formatRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
};

const B2BUserDashboard = () => {
    const { isAuthenticated } = useAuthStore();
    const [stats, setStats] = useState([
        { label: 'Active Inquiries', value: '0', icon: FiMessageSquare, color: 'blue' },
        { label: 'Pending Quotes', value: '0', icon: FiBox, color: 'primary' },
    ]);
    const [recentInquiries, setRecentInquiries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            fetchDashboardData();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch user conversations with B2B vendors
            const response = await chatService.getUserConversations({ vendorType: 'b2b' });
            
            if (response.success && response.data) {
                const conversations = Array.isArray(response.data) ? response.data : [];
                
                // Calculate Active Inquiries (conversations with inquiry messages)
                let activeInquiriesCount = 0;
                let pendingQuotesCount = 0;
                const inquiriesList = [];

                for (const conv of conversations) {
                    // Check if conversation has inquiry messages
                    const lastMsg = conv.lastMessage;
                    const isInquiry = lastMsg?.messageType === 'inquiry' || 
                                     (lastMsg?.message && lastMsg.message.includes('📦 *INQUIRY FOR:'));
                    
                    if (isInquiry || lastMsg?.metadata?.productId) {
                        activeInquiriesCount++;
                        
                        // Get vendor name
                        const vendor = conv.participants?.find(p => p.role === 'vendor');
                        const vendorName = vendor?.userId?.storeName || vendor?.userId?.businessName || 'Unknown Vendor';
                        
                        // Get product name from metadata or message
                        const productName = lastMsg?.metadata?.productName || 
                                          (lastMsg?.message?.match(/INQUIRY FOR: (.+?)\*/)?.[1]) || 
                                          'Product Inquiry';
                        
                        // Determine status based on last message
                        // If last message is from vendor, status is "Responded"
                        // If last message is from user, status is "Pending"
                        let status = 'Pending';
                        if (lastMsg?.senderRole === 'vendor') {
                            status = 'Responded';
                        } else if (lastMsg?.senderRole === 'user') {
                            status = 'Pending';
                        }

                        // Format date
                        const createdAt = lastMsg?.createdAt ? new Date(lastMsg.createdAt) : new Date(conv.lastMessageAt || conv.updatedAt);
                        const dateStr = formatRelativeTime(createdAt);

                        inquiriesList.push({
                            id: conv._id || conv.id,
                            product: productName,
                            vendor: vendorName,
                            status: status,
                            date: dateStr,
                            conversationId: conv._id || conv.id
                        });

                        // Count pending (where last message is from user - awaiting vendor response)
                        if (lastMsg?.senderRole === 'user') {
                            pendingQuotesCount++;
                        }
                    }
                }

                // Sort by date (most recent first) and take top 3
                inquiriesList.sort((a, b) => {
                    const dateA = new Date(conversations.find(c => (c._id || c.id) === a.id)?.lastMessageAt || 0);
                    const dateB = new Date(conversations.find(c => (c._id || c.id) === b.id)?.lastMessageAt || 0);
                    return dateB - dateA;
                });

                setStats([
                    { label: 'Active Inquiries', value: activeInquiriesCount.toString(), icon: FiMessageSquare, color: 'blue' },
                    { label: 'Pending Quotes', value: pendingQuotesCount.toString(), icon: FiBox, color: 'primary' },
                ]);

                setRecentInquiries(inquiriesList.slice(0, 3));
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Business Dashboard" />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-${stat.color === 'primary' ? 'primary-50' : stat.color + '-50'} flex items-center justify-center`}>
                                <stat.icon className={`text-2xl text-${stat.color === 'primary' ? 'primary-600' : stat.color + '-600'}`} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{stat.label}</p>
                                <p className="text-3xl font-extrabold text-gray-800">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="space-y-8">
                    {/* Recent Inquiries */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-gray-800">Recent Inquiries</h2>
                            <Link to="/b2b/inquiries" className="text-sm font-bold text-primary-600 hover:underline flex items-center gap-1">
                                View All <FiArrowRight />
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-8 text-gray-500">Loading inquiries...</div>
                            ) : recentInquiries.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No inquiries yet. Start exploring the catalog!</div>
                            ) : (
                                recentInquiries.map((inquiry) => (
                                    <div key={inquiry.id} className="group p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-white transition-colors">
                                                <FiHash />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 line-clamp-1">{inquiry.product}</h4>
                                                <p className="text-xs text-gray-500 font-medium">{inquiry.vendor} • {inquiry.date}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${inquiry.status === 'Responded' ? 'bg-green-100 text-green-700' :
                                                inquiry.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {inquiry.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick Info / Recommendations */}
                    <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-6">
                                    <FiBriefcase className="text-2xl" />
                                </div>
                                <h2 className="text-2xl font-bold mb-3 tracking-tight">Expand Your Bulk Reach</h2>
                                <p className="text-primary-100 font-medium leading-relaxed mb-8">
                                    Connect with verified wholesalers across India. Get custom quotes and better pricing for high-volume orders.
                                </p>
                            </div>
                            <Link
                                to="/b2b/catalog"
                                className="w-full py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg text-center shadow-xl hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                            >
                                Explore Bulk Catalog <FiArrowRight />
                            </Link>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary-400/20 rounded-full blur-2xl"></div>
                    </div>
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default B2BUserDashboard;
