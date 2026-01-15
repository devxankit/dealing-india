import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSearch, FiMessageSquare, FiTruck, FiShield, FiX, FiSend } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import chatService from '../../../shared/services/chatService';
import { useAuthStore } from '../../../shared/store/authStore';
import toast from 'react-hot-toast';

const ProductCatalog = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [b2bVendors, setB2bVendors] = useState([]);

    useEffect(() => {
        const init = async () => {
            await fetchB2BVendors();
            await fetchB2BProducts();
        };
        init();
    }, []);

    const fetchB2BVendors = async () => {
        try {
            const response = await api.get('/vendors', {
                params: {
                    vendorType: 'b2b',
                    status: 'approved',
                    limit: 10
                }
            });
            if (response.success) {
                setB2bVendors(response.data.vendors || []);
            }
        } catch (error) {
            console.error('Error fetching B2B vendors:', error);
        }
    };

    const fetchB2BProducts = async () => {
        setLoading(true);
        try {
            // Fetch products where vendorType is b2b
            const response = await api.get('/products?vendorType=b2b');
            if (response.success && response.data) {
                // The API returns a paginated object { products, total, page, totalPages }
                const productsData = Array.isArray(response.data) ? response.data : (response.data.products || []);

                // FALLBACK MOCK DATA IF API IS EMPTY
                if (productsData.length === 0) {
                    // Seek the specific mock B2B vendor if available in fetched vendors, 
                    // otherwise use the hardcoded ID we just created for 'mockb2bvendor@example.com'
                    const specificB2BVendor = b2bVendors.find(v => v.email === 'mockb2bvendor@example.com');
                    const targetVendorId = specificB2BVendor?._id || '65a1234567890abcdefb2b01';

                    setProducts([
                        {
                            _id: 'm1',
                            name: 'Premium Silk Sarees (Bulk)',
                            description: 'Pure Banarasi silk sarees for showrooms and boutique owners. Direct from manufacturer.',
                            price: 4500,
                            images: ['https://images.unsplash.com/photo-1610030469668-935142b96fe4?auto=format&fit=crop&q=80&w=400'],
                            categoryId: { name: 'Textiles' },
                            vendorId: targetVendorId
                        },
                        {
                            _id: 'm2',
                            name: 'Smart Watch Gen 3',
                            description: 'Bulk quantity smart watches with heart rate monitor, GPS and waterproof design.',
                            price: 1200,
                            images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=400'],
                            categoryId: { name: 'Electronics' },
                            vendorId: targetVendorId
                        },
                        {
                            _id: 'm3',
                            name: 'Industrial Heavy Drill Machine',
                            description: 'Professional grade drill machines for construction and industrial use.',
                            price: 8500,
                            images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=400'],
                            categoryId: { name: 'Industrial' },
                            vendorId: targetVendorId
                        },
                        {
                            _id: 'm4',
                            name: 'Handcrafted Bamboo Lamps',
                            description: 'Eco-friendly bamboo lamps made by local artisans. Great for home decor stores.',
                            price: 650,
                            images: ['https://images.unsplash.com/photo-1542736667-069246bdbc6d?auto=format&fit=crop&q=80&w=400'],
                            categoryId: { name: 'Handicrafts' },
                            vendorId: targetVendorId
                        },
                        {
                            _id: 'm5',
                            name: 'Bulk Essential Oils Kit',
                            description: 'Set of 12 therapeutic grade essential oils for wellness and spa businesses.',
                            price: 2800,
                            images: ['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=400'],
                            categoryId: { name: 'Chemicals' },
                            vendorId: targetVendorId
                        },
                        {
                            _id: 'm6',
                            name: 'Cotton Canvas Tote Bags',
                            description: 'Reusable eco-friendly tote bags. Customizable for branding.',
                            price: 85,
                            images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400'],
                            categoryId: { name: 'Textiles' },
                            vendorId: targetVendorId
                        },
                        {
                            _id: 'm7',
                            name: 'Solar Panel Kit (100W)',
                            description: 'High efficiency solar panels for residential and commercial installation.',
                            price: 12500,
                            images: ['https://images.unsplash.com/photo-1508514177221-18d14de6d62d?auto=format&fit=crop&q=80&w=400'],
                            categoryId: { name: 'Electronics' },
                            vendorId: targetVendorId
                        },
                        {
                            _id: 'm8',
                            name: 'Designer Ceramic Vases',
                            description: 'Modern ceramic vases in various sizes. Perfect for interior design shops.',
                            price: 1800,
                            images: ['https://images.unsplash.com/photo-1581783898377-1c85bc937427?auto=format&fit=crop&q=80&w=400'],
                            categoryId: { name: 'Handicrafts' },
                            vendorId: targetVendorId
                        }
                    ]);
                }
                else {
                    setProducts(productsData);
                }
            }
        } catch (error) {
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const categories = ['All', 'Electronics', 'Textiles', 'Industrial', 'Chemicals', 'Handicrafts'];

    const productsList = Array.isArray(products) ? products : [];

    const filteredProducts = productsList.filter(product => {
        const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || product.categoryId?.name === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const openInquiry = (product) => {
        if (!isAuthenticated) {
            toast.error('Please login to send inquiries');
            navigate('/b2b/login');
            return;
        }
        setSelectedProduct(product);
        setShowInquiryModal(true);
    };

    const handleChatDirect = (product) => {
        if (!isAuthenticated) {
            toast.error('Please login to chat with vendors');
            navigate('/b2b/login');
            return;
        }

        const vId = product.vendorId?._id || product.vendorId;

        // Validate ID format (24 char hex string)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(vId);

        if (vId && isValidObjectId) {
            navigate(`/app/chat/${vId}`);
        } else {
            console.error('Invalid vendor ID:', vId);
            toast.error('Cannot start chat: Invalid Vendor ID');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader />

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search bulk products, wholesalers or items..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar lg:pb-0">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2.5 rounded-2xl whitespace-nowrap font-medium transition-all ${selectedCategory === cat
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                    : 'bg-white text-gray-600 border border-gray-100 hover:border-primary-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading Bulk Catalog...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiSearch className="text-3xl text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">No products found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <motion.div
                                key={product._id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => navigate(`/b2b/product/${product._id}`)}
                                className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl hover:shadow-primary-100 transition-all duration-300 cursor-pointer"
                            >
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img
                                        src={product.images[0] || 'https://via.placeholder.com/400x300'}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-primary-600 uppercase tracking-wider">
                                        Bulk Only
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-800 line-clamp-1">{product.name}</h3>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                                        {product.description}
                                    </p>

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                                            <FiTruck className="text-primary-500" />
                                            <span>Min. 100 Units</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                                            <FiShield className="text-primary-500" />
                                            <span>Verified</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">MOQ Price</span>
                                            <span className="text-xl font-extrabold text-primary-600">₹{product.price} <span className="text-xs text-gray-400 font-medium">/ unit</span></span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openInquiry(product); }}
                                            className="flex-1 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-2xl hover:bg-primary-50 transition-all font-bold text-sm flex items-center justify-center gap-2"
                                        >
                                            <FiSend className="text-xs" />
                                            Inquiry
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleChatDirect(product); }}
                                            className="p-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all font-bold"
                                            title="Chat with Seller"
                                        >
                                            <FiMessageSquare />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            <B2BBottomNav />

            {/* Inquiry Modal */}
            <AnimatePresence>
                {showInquiryModal && (
                    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowInquiryModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%", opacity: 0.5 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0.5 }}
                            className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center">
                                            <FiMessageSquare className="text-2xl text-primary-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-800">Send Inquiry</h2>
                                            <p className="text-gray-500 text-sm">{selectedProduct?.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowInquiryModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                                        <FiX className="text-2xl" />
                                    </button>
                                </div>

                                <form className="space-y-6" onSubmit={async (e) => {
                                    e.preventDefault();
                                    const quantity = e.target.elements[0].value;
                                    const message = e.target.elements[1].value;

                                    try {
                                        const vendorId = selectedProduct.vendorId?._id || selectedProduct.vendorId;
                                        if (!vendorId) throw new Error('Vendor ID missing');

                                        // Validate ID format
                                        if (!/^[0-9a-fA-F]{24}$/.test(vendorId)) {
                                            throw new Error('Invalid Vendor ID format');
                                        }

                                        const convResponse = await chatService.createOrGetConversation(vendorId);
                                        const conversation = convResponse.data || convResponse;
                                        const conversationId = conversation._id;

                                        const metadata = {
                                            productId: selectedProduct._id,
                                            productName: selectedProduct.name,
                                            productImage: selectedProduct.images?.[0] || selectedProduct.image,
                                            productPrice: selectedProduct.price,
                                            quantity: quantity,
                                            clientMessage: message
                                        };

                                        const inquiryMessage = `📦 *INQUIRY FOR: ${selectedProduct.name}*\n` +
                                            `🔢 *Quantity:* ${quantity} units\n` +
                                            `💬 *Message:* ${message}`;

                                        await chatService.sendMessage(conversationId, vendorId, inquiryMessage, 'inquiry', metadata);

                                        toast.success('Inquiry sent via chat!');
                                        setShowInquiryModal(false);
                                        navigate(`/app/chat/${vendorId}`);
                                    } catch (err) {
                                        console.error('Inquiry failed:', err);
                                        toast.error('Failed to send inquiry via chat');
                                    }
                                }}>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Quantity Needed</label>
                                        <input
                                            type="number"
                                            placeholder="Min. 100 units"
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Message to Vendor</label>
                                        <textarea
                                            rows="4"
                                            placeholder="Write your requirements here..."
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium resize-none"
                                            required
                                        ></textarea>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-lg hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FiMessageSquare />
                                        Submit Quote Request
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductCatalog;
