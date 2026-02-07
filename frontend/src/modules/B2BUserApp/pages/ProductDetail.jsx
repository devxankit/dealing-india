import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiMessageSquare, FiTruck, FiShield,
    FiCheckCircle, FiShare2, FiInfo, FiSend, FiX,
    FiPlus, FiMinus, FiShoppingBag, FiStar, FiPaperclip, FiFile, FiPhone
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
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
    const [quantity, setQuantity] = useState(1);
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [inquiryAttachment, setInquiryAttachment] = useState(null);
    const [hasInquiry, setHasInquiry] = useState(false);

    useEffect(() => {
        fetchProductDetails();
    }, [id]);

    const fetchProductDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/products/${id}`);
            if (response.success && response.data) {
                const productData = response.data.product || response.data;
                if (productData.minimumOrderQuantity && !productData.moq) {
                    productData.moq = productData.minimumOrderQuantity;
                }
                setProduct(productData);
                if (productData.moq) {
                    setQuantity(Number(productData.moq));
                }
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
                productName: product.name || '',
                productImage: product.images?.[0] || product.image || null,
                productPrice: product.price ? Number(product.price) : null,
                quantity: Number(inquiryQuantity) || 0,
                clientMessage: message || '',
                attachment: inquiryAttachment ? {
                    fileUrl: inquiryAttachment.url,
                    fileName: inquiryAttachment.originalName,
                    fileFormat: inquiryAttachment.format,
                    resourceType: inquiryAttachment.resourceType
                } : null
            };

            const inquiryMessage = `📦 *INQUIRY FOR: ${product.name}*\n` +
                `🔢 *Quantity:* ${inquiryQuantity} ${product.unit || 'units'}\n` +
                `💬 *Message:* ${message}`;

            await chatService.sendMessage(
                conversation._id,
                vendorId,
                inquiryMessage,
                'inquiry',
                metadata
            );

            setHasInquiry(true);
            toast.success('Inquiry sent successfully!');
            setShowInquiryModal(false);
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

    let productImages = [];
    if (product.coverImage) productImages.push(product.coverImage);
    if (product.image) productImages.push(product.image);
    if (Array.isArray(product.images) && product.images.length > 0) {
        product.images.forEach(img => {
            if (img && !productImages.includes(img)) productImages.push(img);
        });
    }
    if (productImages.length === 0) productImages = ['https://via.placeholder.com/800x600?text=No+Image'];

    const safeSelectedImage = Math.min(selectedImage, productImages.length - 1);

    const getCategoryName = () => {
        if (product.category) return product.category; // LotSlot string field
        if (product.categoryId?.name) return product.categoryId.name;
        const categoryAttr = product.attributes?.find(attr =>
            attr.name === 'category' || attr.attributeName === 'category'
        );
        return categoryAttr?.value || 'Product';
    };

    const getSpecifications = () => {
        if (product.specifications && Array.isArray(product.specifications)) return product.specifications;
        if (product.attributes && Array.isArray(product.attributes)) {
            return product.attributes
                .filter(attr => !['category', 'subcategory', 'bulkPricing', 'Color', 'color'].includes(attr.name || attr.attributeName || ''))
                .map(attr => ({ name: attr.name || attr.attributeName || 'Spec', value: attr.value || '' }))
                .filter(spec => spec.name && spec.value);
        }
        return [];
    };

    const getBulkPricing = () => {
        if (product.bulkPricing && Array.isArray(product.bulkPricing) && product.bulkPricing.length > 0) return product.bulkPricing;
        const attr = product.attributes?.find(a => a.name === 'bulkPricing' || a.attributeName === 'bulkPricing');
        if (attr && attr.value) {
            try {
                return typeof attr.value === 'string' ? JSON.parse(attr.value) : attr.value;
            } catch (e) { return []; }
        }
        return [];
    };

    const specifications = getSpecifications();
    const bulkPricing = getBulkPricing();
    const currentPrice = (() => {
        if (!bulkPricing || bulkPricing.length === 0) return product.price || 0;
        const tier = [...bulkPricing].sort((a, b) => (b.minQty || 0) - (a.minQty || 0)).find(t => quantity >= (t.minQty || 0));
        return tier ? (tier.price || product.price || 0) : (product.price || 0);
    })();

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <B2BHeader />
            <main className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-full transition-all text-gray-600 flex items-center gap-2 font-medium">
                        <FiArrowLeft className="text-xl" /> Back to Catalog
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-12 xl:col-span-7">
                        <div className="space-y-4">
                            <motion.div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-white shadow-xl border border-gray-100">
                                <img src={productImages[safeSelectedImage]} alt={product.name} className="w-full h-full object-cover" />
                            </motion.div>
                            {productImages.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                    {productImages.map((img, idx) => (
                                        <button key={idx} onClick={() => setSelectedImage(idx)} className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${safeSelectedImage === idx ? 'border-primary-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                        <div>
                            <span className="text-xs font-bold text-primary-600 uppercase tracking-widest px-3 py-1 bg-primary-50 rounded-full mb-3 inline-block">
                                {getCategoryName()}
                            </span>
                            <h1 className="text-4xl font-extrabold text-gray-800 leading-tight mb-4">{product.name}</h1>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50">
                            <div className="flex items-end justify-between mb-8">
                                <div>
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-tight mb-1 block">Bulk Price</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-primary-600">₹{product.price}</span>
                                        <span className="text-gray-400 font-bold">/ {product.unit || 'piece'}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-tight mb-1 block">MOQ</span>
                                    <span className="text-lg font-bold text-gray-700">{product.moq || 1} {product.unit || 'Units'}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {bulkPricing && bulkPricing.length > 0 && (
                                    <div className="space-y-3 pt-0">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Volume Discounts</p>
                                        {bulkPricing.map((tier, idx) => (
                                            <div key={idx} className="flex justify-between p-3 bg-white border rounded-xl">
                                                <span className="text-sm font-bold">{tier.minQty}+ {product.unit || 'units'}</span>
                                                <span className="text-sm font-extrabold text-primary-600">₹{tier.price} / {product.unit || 'unit'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                                    {product.vendorId?.phone && (
                                        <>
                                            <a href={`https://wa.me/${product.vendorId.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="py-4 bg-[#25D366] text-white rounded-2xl font-bold text-sm hover:bg-[#128C7E] flex items-center justify-center gap-2 shadow-lg shadow-green-100">
                                                <FaWhatsapp size={20} /> WhatsApp
                                            </a>
                                            <a href={`tel:${product.vendorId.phone}`} className="py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                                                <FiPhone size={20} /> Call
                                            </a>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => product.vendorId?._id && navigate(`/b2b/vendor/${product.vendorId._id}`)}
                            className="bg-gray-900 p-8 rounded-[2.5rem] text-white cursor-pointer hover:bg-black transition-all"
                        >
                            <p className="text-xs font-bold text-primary-400 uppercase mb-4">Sold By</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center font-bold">
                                    {product.vendorId?.storeName?.charAt(0) || 'V'}
                                </div>
                                <h3 className="text-xl font-bold">{product.vendorId?.storeName || 'Verified Seller'}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Overview</h2>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Specifications</h2>
                            <div className="space-y-2">
                                {specifications.map((s, i) => (
                                    <div key={i} className="flex justify-between p-4 bg-white rounded-xl border border-gray-100">
                                        <span className="text-gray-500 font-medium">{s.name}</span>
                                        <span className="text-gray-800 font-bold">{s.value}</span>
                                    </div>
                                ))}
                                {specifications.length === 0 && <p className="text-gray-400 italic">No specifications available.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <B2BBottomNav />
        </div>
    );
};

export default B2BProductDetail;
