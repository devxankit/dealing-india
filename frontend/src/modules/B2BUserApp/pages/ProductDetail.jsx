import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiMessageSquare, FiTruck, FiShield,
    FiCheckCircle, FiShare2, FiInfo, FiSend, FiX,
    FiPlus, FiMinus, FiShoppingBag, FiStar, FiPaperclip, FiFile
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
    const [inquiryAttachment, setInquiryAttachment] = useState(null);
    const [uploadingInquiryFile, setUploadingInquiryFile] = useState(false);
    const [hasInquiry, setHasInquiry] = useState(false);

    const handleInquiryFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size too large. Max 10MB.');
            return;
        }

        try {
            setUploadingInquiryFile(true);
            const response = await chatService.uploadAttachment(file);
            if (response.success) {
                setInquiryAttachment(response.data);
                toast.success('File attached');
            }
        } catch (error) {
            console.error('File upload error:', error);
            toast.error('Failed to upload file');
        } finally {
            setUploadingInquiryFile(false);
        }
    };

    useEffect(() => {
        fetchProductDetails();
    }, [id]);

    useEffect(() => {
        if (product && isAuthenticated) {
            checkInquiryStatus();
        }
    }, [product, isAuthenticated, id]);

    const checkInquiryStatus = async () => {
        if (!product || !isAuthenticated) return;
        
        try {
            const productId = product._id || product.id;
            if (!productId) return;

            const response = await api.get(`/user/chat/inquiries/check/${productId}`);
            if (response.success && response.data) {
                setHasInquiry(response.data.hasInquiry || false);
            }
        } catch (error) {
            // If error (e.g., not authenticated), treat as no inquiry
            setHasInquiry(false);
        }
    };

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
            console.log('Product Detail API Response:', response);
            if (response.success && response.data) {
                // Handle both response.data (object) and response.data.product
                const productData = response.data.product || response.data;
                console.log('Product Data:', productData);
                console.log('Product Images:', productData.images, 'Product Image:', productData.image);
                setProduct(productData);
            } else {
                console.error('Invalid API response structure:', response);
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
                // Add attachment if exists
                attachment: inquiryAttachment ? {
                    fileUrl: inquiryAttachment.url,
                    fileName: inquiryAttachment.originalName,
                    fileFormat: inquiryAttachment.format,
                    resourceType: inquiryAttachment.resourceType
                } : null
            };

            const inquiryMessage = `📦 *INQUIRY FOR: ${product.name}*\n` +
                `🔢 *Quantity:* ${inquiryQuantity} units\n` +
                `💬 *Message:* ${message}`;

            await chatService.sendMessage(
                conversation._id,
                vendorId,
                inquiryMessage,
                'inquiry',
                metadata
            );

            // Update inquiry status immediately
            setHasInquiry(true);

            toast.success('Inquiry sent successfully!');
            setShowInquiryModal(false);
            setInquiryAttachment(null);
            
            // Optional: Navigate to inquiries page, or stay on product page
            // navigate(`/b2b/inquiries?vendorId=${vendorId}`);
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

    // Normalize images array - handle both single image and array cases
    // Combine product.image (main) with product.images (gallery) if both exist
    let productImages = [];
    if (product.image) {
        productImages.push(product.image);
    }
    if (Array.isArray(product.images) && product.images.length > 0) {
        // Add images that are not already in the array (avoid duplicates)
        product.images.forEach(img => {
            if (img && !productImages.includes(img)) {
                productImages.push(img);
            }
        });
    }
    // If no images found, use placeholder
    if (productImages.length === 0) {
        productImages = ['https://via.placeholder.com/800x600?text=No+Image'];
    }

    // Ensure selectedImage is within bounds
    const safeSelectedImage = Math.min(selectedImage, productImages.length - 1);

    // Get category from attributes or categoryId
    const getCategoryName = () => {
        if (product.categoryId?.name) return product.categoryId.name;
        const categoryAttr = product.attributes?.find(attr =>
            attr.name === 'category' || attr.attributeName === 'category'
        );
        return categoryAttr?.value || 'Product';
    };

    // Get specifications from attributes
    const getSpecifications = () => {
        if (product.specifications && Array.isArray(product.specifications)) {
            return product.specifications;
        }
        // Extract specifications from attributes (excluding category, subcategory, bulkPricing)
        if (product.attributes && Array.isArray(product.attributes)) {
            return product.attributes
                .filter(attr => {
                    const name = attr.name || attr.attributeName || '';
                    return name && !['category', 'subcategory', 'bulkPricing'].includes(name);
                })
                .map(attr => ({
                    name: attr.name || attr.attributeName || 'Specification',
                    value: attr.value || ''
                }))
                .filter(spec => spec.name && spec.value);
        }
        return [];
    };

    // Get bulk pricing from attributes
    const getBulkPricing = () => {
        if (!product.attributes || !Array.isArray(product.attributes)) {
            return [];
        }
        const bulkPricingAttr = product.attributes.find(attr =>
            attr.name === 'bulkPricing' || attr.attributeName === 'bulkPricing'
        );
        if (bulkPricingAttr && bulkPricingAttr.value) {
            try {
                // If value is a string (JSON), parse it
                if (typeof bulkPricingAttr.value === 'string') {
                    return JSON.parse(bulkPricingAttr.value);
                }
                // If already an array, return it
                if (Array.isArray(bulkPricingAttr.value)) {
                    return bulkPricingAttr.value;
                }
            } catch (error) {
                console.error('Error parsing bulk pricing:', error);
            }
        }
        return [];
    };

    const specifications = getSpecifications();
    const bulkPricing = getBulkPricing();

    // Get price for selected quantity based on bulk pricing
    const getPriceForQuantity = (qty) => {
        if (!bulkPricing || bulkPricing.length === 0) {
            return product.price || 0;
        }
        // Sort bulk pricing by minQty descending to find the highest applicable tier
        const sortedTiers = [...bulkPricing].sort((a, b) => (b.minQty || 0) - (a.minQty || 0));
        // Find the first tier where quantity meets or exceeds minQty
        const applicableTier = sortedTiers.find(tier => qty >= (tier.minQty || 0));
        return applicableTier ? (applicableTier.price || product.price || 0) : (product.price || 0);
    };

    const currentPrice = getPriceForQuantity(quantity);

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
                                    src={productImages[safeSelectedImage]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-6 left-6 px-4 py-2 bg-white/90 backdrop-blur rounded-2xl text-xs font-bold text-primary-600 uppercase tracking-widest shadow-sm">
                                    Verified Wholesaler
                                </div>
                            </motion.div>

                            {productImages.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                    {productImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage(idx)}
                                            className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${safeSelectedImage === idx ? 'border-primary-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                                                }`}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Product Info */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                        <div>
                            <span className="text-xs font-bold text-primary-600 uppercase tracking-widest px-3 py-1 bg-primary-50 rounded-full mb-3 inline-block">
                                {getCategoryName()}
                            </span>
                            <h1 className="text-4xl font-extrabold text-gray-800 leading-tight mb-4">
                                {product.name}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
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

                                {/* Bulk Pricing Display */}
                                {bulkPricing && bulkPricing.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-2">Bulk Pricing Rates</p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {bulkPricing
                                                .sort((a, b) => (a.minQty || 0) - (b.minQty || 0))
                                                .map((tier, index) => {
                                                    const isSelected = quantity >= (tier.minQty || 0) &&
                                                        (index === bulkPricing.length - 1 || quantity < (bulkPricing[index + 1]?.minQty || Infinity));
                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isSelected
                                                                ? 'bg-primary-50 border-primary-300 shadow-sm'
                                                                : 'bg-white border-gray-100'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-gray-500">Min Qty:</span>
                                                                <span className={`text-sm font-bold ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                                                                    {tier.minQty || 0}+ units
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-gray-500">Rate:</span>
                                                                <span className={`text-base font-black ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                                                                    ₹{tier.price || 0} / unit
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-primary-100 rounded-xl border-2 border-primary-300">
                                            <span className="text-sm font-bold text-gray-700">Your Price ({quantity} units):</span>
                                            <span className="text-xl font-black text-primary-700">₹{currentPrice} / unit</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-[11px] text-gray-400 justify-center">
                                        <FiInfo /> Price may vary based on final order volume
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {hasInquiry ? (
                                    <div className="w-full py-5 bg-green-50 border-2 border-green-200 text-green-700 rounded-[1.25rem] font-bold text-lg flex items-center justify-center gap-3 cursor-not-allowed">
                                        <span>✓ Inquiry Done</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowInquiryModal(true)}
                                        className="w-full py-5 bg-primary-600 text-white rounded-[1.25rem] font-bold text-lg hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={hasInquiry}
                                    >
                                        <FiSend className="text-xl" />
                                        Send Inquiry Request
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/b2b/inquiries?vendorId=${product.vendorId?._id || product.vendorId}`)}
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
                                        {(product.vendorId?.storeName || product.vendorId?.businessName || 'V').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            {product.vendorId?.storeName || product.vendorId?.businessName || 'Verified Seller'}
                                            {product.vendorId?.isEmailVerified && (
                                                <FiCheckCircle className="text-primary-400" />
                                            )}
                                        </h3>
                                        <p className="text-gray-400 text-sm">
                                            {(() => {
                                                const vendor = product.vendorId;
                                                const address = vendor?.address;
                                                if (address) {
                                                    const locationParts = [];
                                                    if (address.city) locationParts.push(address.city);
                                                    if (address.state) locationParts.push(address.state);
                                                    if (address.country) locationParts.push(address.country);
                                                    return locationParts.length > 0
                                                        ? `Manufacturer in ${locationParts.join(', ')}`
                                                        : 'Manufacturer';
                                                }
                                                return 'Manufacturer';
                                            })()}
                                        </p>
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
                                    {specifications.map((spec, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                            <span className="text-gray-500 font-medium">{spec.name}</span>
                                            <span className="text-gray-800 font-bold">{spec.value}</span>
                                        </div>
                                    ))}
                                    {specifications.length === 0 && (
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
                            onClick={() => {
                                setShowInquiryModal(false);
                                setInquiryAttachment(null);
                            }}
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
                                    <button onClick={() => {
                                        setShowInquiryModal(false);
                                        setInquiryAttachment(null);
                                    }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
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
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-bold text-gray-700">Message to Vendor</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id="inquiry-file"
                                                    onChange={handleInquiryFileSelect}
                                                    className="hidden"
                                                    accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => document.getElementById('inquiry-file').click()}
                                                    disabled={uploadingInquiryFile}
                                                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${inquiryAttachment ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-primary-600 border-primary-100 hover:bg-primary-50'}`}
                                                >
                                                    {uploadingInquiryFile ? (
                                                        <div className="w-3 h-3 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
                                                    ) : inquiryAttachment ? (
                                                        <FiCheckCircle />
                                                    ) : (
                                                        <FiPaperclip />
                                                    )}
                                                    {inquiryAttachment ? 'File Attached' : 'Attach File'}
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            name="message"
                                            rows="4"
                                            placeholder="Write your specific requirements here (e.g. delivery time, branding need)..."
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium resize-none shadow-inner"
                                            required
                                        ></textarea>

                                        {inquiryAttachment && (
                                            <div className="mt-3 flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary-600 shadow-sm border border-gray-100">
                                                        <FiFile />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-800 truncate">{inquiryAttachment.originalName}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">{inquiryAttachment.format} • Max 10MB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setInquiryAttachment(null)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        )}
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
