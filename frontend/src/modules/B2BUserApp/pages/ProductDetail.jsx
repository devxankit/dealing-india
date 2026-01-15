import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiMessageSquare, FiTruck, FiShield,
    FiCheckCircle, FiShare2, FiInfo, FiSend, FiX,
    FiPlus, FiMinus, FiShoppingBag, FiStar
} from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import chatService from '../../../shared/services/chatService';
import { useAuthStore } from '../../../shared/store/authStore';
import toast from 'react-hot-toast';
import { formatPrice } from '../../../shared/utils/helpers';

const B2BProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(100); // Default B2B MOQ
    const [showInquiryModal, setShowInquiryModal] = useState(false);

    useEffect(() => {
        fetchProductDetails();
    }, [id]);

    const fetchProductDetails = async () => {
        setLoading(true);
        try {
            // Check for mock IDs first to avoid hitting the backend with invalid ObjectIds
            if (id.startsWith('m')) {
                const mockProducts = {
                    'm1': {
                        _id: 'm1',
                        name: 'Premium Silk Sarees (Bulk)',
                        description: 'Pure Banarasi silk sarees for showrooms and boutique owners. Direct from manufacturer. These sarees are woven with high-quality silk and feature exquisite zari work. Perfect for luxury wedding collections and high-end retail showrooms.',
                        price: 4500,
                        images: ['https://images.unsplash.com/photo-1610030469668-935142b96fe4?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=800'],
                        categoryId: { name: 'Textiles' },
                        vendorId: { _id: 'v1', storeName: 'Royal Silk Weavers', isVerified: true },
                        moq: 100,
                        specifications: [
                            { name: 'Material', value: '100% Pure Silk' },
                            { name: 'Work', value: 'Handwoven Zari' },
                            { name: 'Length', value: '6.5 Meters with blouse' },
                            { name: 'Origin', value: 'Varanasi, India' }
                        ]
                    },
                    'm2': {
                        _id: 'm2',
                        name: 'Smart Watch Gen 3',
                        description: 'Bulk quantity smart watches with heart rate monitor, GPS and waterproof design. Highly durable and feature-rich wearable technology for corporate gifting or retail chains. Supports all major fitness tracking and notification features.',
                        price: 1200,
                        images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1508685096489-7aeb29688461?auto=format&fit=crop&q=80&w=800'],
                        categoryId: { name: 'Electronics' },
                        vendorId: { _id: 'v2', storeName: 'TechHub Wholesale', isVerified: true },
                        moq: 50,
                        specifications: [
                            { name: 'Screen', value: '1.8" AMOLED' },
                            { name: 'Battery Life', value: '10 Days' },
                            { name: 'Water Resistance', value: 'IP68' },
                            { name: 'Bluetooth', value: 'v5.2' }
                        ]
                    },
                    'm3': {
                        _id: 'm3',
                        name: 'Industrial Heavy Drill Machine',
                        description: 'Professional grade drill machines for construction and industrial use.',
                        price: 8500,
                        images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=400'],
                        categoryId: { name: 'Industrial' },
                        vendorId: { _id: 'v3', storeName: 'Industrial Pro Tools', isVerified: true },
                        moq: 20,
                        specifications: [
                            { name: 'Power', value: '1500W' },
                            { name: 'Speed', value: '3000 RPM' }
                        ]
                    },
                    'm4': {
                        _id: 'm4',
                        name: 'Handcrafted Bamboo Lamps',
                        description: 'Eco-friendly bamboo lamps made by local artisans. Great for home decor stores.',
                        price: 650,
                        images: ['https://images.unsplash.com/photo-1542736667-069246bdbc6d?auto=format&fit=crop&q=80&w=400'],
                        categoryId: { name: 'Handicrafts' },
                        vendorId: { _id: 'v4', storeName: 'Artisan Hub', isVerified: true },
                        moq: 50,
                        specifications: [
                            { name: 'Material', value: 'Eco Bamboo' }
                        ]
                    },
                    'm8': {
                        _id: 'm8',
                        name: 'Designer Ceramic Vases',
                        description: 'Modern ceramic vases in various sizes. Perfect for interior design shops.',
                        price: 1800,
                        images: ['https://images.unsplash.com/photo-1581783898377-1c85bc937427?auto=format&fit=crop&q=80&w=400'],
                        categoryId: { name: 'Handicrafts' },
                        vendorId: { _id: 'v5', storeName: 'Ceramic Studio', isVerified: true },
                        moq: 30,
                        specifications: [
                            { name: 'Finish', value: 'Matte Glaze' }
                        ]
                    }
                };
                setProduct(mockProducts[id] || mockProducts['m1']);
                return;
            }

            const response = await api.get(`/products/${id}`);
            if (response.success && response.data) {
                setProduct(response.data);
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            toast.error('Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    const handleInquirySubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error('Please login to send inquiries');
            navigate('/b2b/login');
            return;
        }

        const message = e.target.elements.message.value;
        const inquiryQuantity = e.target.elements.quantity.value;

        try {
            const vendorId = product.vendorId?._id || product.vendorId;
            const convResponse = await chatService.createOrGetConversation(vendorId);
            const conversation = convResponse.data || convResponse;

            const metadata = {
                productId: product._id,
                productName: product.name,
                productImage: product.images?.[0] || product.image,
                productPrice: product.price,
                quantity: inquiryQuantity,
                clientMessage: message
            };

            const inquiryMessage = `📦 *INQUIRY FOR: ${product.name}*\n` +
                `🔢 *Quantity:* ${inquiryQuantity} units\n` +
                `💬 *Message:* ${message}`;

            await chatService.sendMessage(conversation._id, vendorId, inquiryMessage, 'inquiry', metadata);

            toast.success('Inquiry sent successfully!');
            setShowInquiryModal(false);
            navigate(`/app/chat/${vendorId}`);
        } catch (err) {
            toast.error('Failed to send inquiry');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <B2BHeader />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Fetching details...</p>
                </div>
            </div>
        );
    }

    if (!product) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <B2BHeader />

            <main className="max-w-7xl mx-auto px-4 py-4">
                {/* Back Button & Share */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white rounded-full transition-all text-gray-600 flex items-center gap-2 font-medium"
                    >
                        <FiArrowLeft className="text-xl" /> Back to Catalog
                    </button>
                    <button className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-primary-600 transition-all border border-gray-100">
                        <FiShare2 />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left: Image Gallery */}
                    <div className="lg:col-span-12 xl:col-span-7">
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-white shadow-xl border border-gray-100"
                            >
                                <img
                                    src={product.images[selectedImage]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-6 left-6 px-4 py-2 bg-white/90 backdrop-blur rounded-2xl text-xs font-bold text-primary-600 uppercase tracking-widest shadow-sm">
                                    Verified Wholesaler
                                </div>
                            </motion.div>

                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                {product.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-primary-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Product Info */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                        <div>
                            <span className="text-xs font-bold text-primary-600 uppercase tracking-widest px-3 py-1 bg-primary-50 rounded-full mb-3 inline-block">
                                {product.categoryId?.name}
                            </span>
                            <h1 className="text-4xl font-extrabold text-gray-800 leading-tight mb-4">
                                {product.name}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><FiStar className="text-yellow-400 fill-yellow-400" /> 4.8 (124+ orders)</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                                <span className="flex items-center gap-1 text-green-600 font-bold"><FiCheckCircle /> Verified Supply</span>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50">
                            <div className="flex items-end justify-between mb-8">
                                <div>
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-tight mb-1 block">Expected Bulk Price</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-primary-600">₹{product.price}</span>
                                        <span className="text-gray-400 font-bold">/ unit</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-tight mb-1 block">MOQ</span>
                                    <span className="text-lg font-bold text-gray-700">{product.moq || 100} Units</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span className="text-sm font-bold text-gray-600">Select Quantity</span>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setQuantity(Math.max(product.moq || 100, quantity - 50))}
                                            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-primary-50 hover:border-primary-200 transition-all shadow-sm"
                                        >
                                            <FiMinus />
                                        </button>
                                        <span className="w-16 text-center font-black text-lg text-gray-800">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(quantity + 50)}
                                            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-primary-50 hover:border-primary-200 transition-all shadow-sm"
                                        >
                                            <FiPlus />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-400 justify-center">
                                    <FiInfo /> Price may vary based on final order volume
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => setShowInquiryModal(true)}
                                    className="w-full py-5 bg-primary-600 text-white rounded-[1.25rem] font-bold text-lg hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all flex items-center justify-center gap-3"
                                >
                                    <FiSend className="text-xl" />
                                    Send Inquiry Request
                                </button>
                                <button
                                    onClick={() => navigate(`/app/chat/${product.vendorId?._id || product.vendorId}`)}
                                    className="w-full py-5 bg-white border-2 border-primary-600 text-primary-600 rounded-[1.25rem] font-bold text-lg hover:bg-primary-50 transition-all flex items-center justify-center gap-3"
                                >
                                    <FiMessageSquare className="text-xl" />
                                    Chat with Seller
                                </button>
                            </div>
                        </div>

                        {/* Seller Card */}
                        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="relative z-10">
                                <h4 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4">Sold By</h4>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-2xl font-black border border-white/20">
                                        {product.vendorId?.storeName?.charAt(0) || 'V'}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            {product.vendorId?.storeName || 'Verified Seller'}
                                            <FiCheckCircle className="text-primary-400" />
                                        </h3>
                                        <p className="text-gray-400 text-sm">Manufacturer in Gujarat, India</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Response Rate</p>
                                        <p className="text-lg font-bold">98% <span className="text-xs font-normal text-gray-500">Very Fast</span></p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">In Business</p>
                                        <p className="text-lg font-bold">5+ Years</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description & Specifications */}
                    <div className="lg:col-span-12 space-y-12 mt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                    <FiInfo className="text-primary-500" /> Product Overview
                                </h2>
                                <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                                    {product.description}
                                </p>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                    <FiCheckCircle className="text-primary-500" /> Technical details
                                </h2>
                                <div className="space-y-3">
                                    {(product.specifications || []).map((spec, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                            <span className="text-gray-500 font-medium">{spec.name}</span>
                                            <span className="text-gray-800 font-bold">{spec.value}</span>
                                        </div>
                                    ))}
                                    {(!product.specifications || product.specifications.length === 0) && (
                                        <p className="text-gray-400 italic">No specific details available for this product.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Order Process */}
                        <div className="bg-primary-50 p-10 rounded-[3rem] border border-primary-100">
                            <h2 className="text-2xl font-bold text-gray-800 mb-10 text-center">Simple Order Process</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { icon: <FiSend />, title: "Send Inquiry", desc: "Submit your requirement with quantity" },
                                    { icon: <FiMessageSquare />, title: "Negotiate", desc: "Chat with seller & get final quotes" },
                                    { icon: <FiTruck />, title: "Secure Delivery", desc: "Pay securely after agreement" }
                                ].map((step, i) => (
                                    <div key={i} className="text-center group">
                                        <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 text-primary-600 text-2xl shadow-lg shadow-primary-200 group-hover:scale-110 transition-all duration-300">
                                            {step.icon}
                                        </div>
                                        <h4 className="font-bold text-gray-800 mb-2">{step.title}</h4>
                                        <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
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
                                            <p className="text-gray-500 text-sm">Bulk Quote Request</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowInquiryModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                        <FiX className="text-2xl" />
                                    </button>
                                </div>

                                <form className="space-y-6" onSubmit={handleInquirySubmit}>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Quantity Needed</label>
                                        <input
                                            name="quantity"
                                            type="number"
                                            defaultValue={quantity}
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Message to Vendor</label>
                                        <textarea
                                            name="message"
                                            rows="4"
                                            placeholder="Write your specific requirements here (e.g. delivery time, branding need)..."
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium resize-none shadow-inner"
                                            required
                                        ></textarea>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-primary-600 text-white rounded-[1.25rem] font-bold text-lg hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <FiSend />
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

export default B2BProductDetail;
