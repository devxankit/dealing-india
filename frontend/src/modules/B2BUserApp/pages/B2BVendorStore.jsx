import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    FiArrowLeft,
    FiStar,
    FiShoppingBag,
    FiCheckCircle,
    FiFilter,
    FiGrid,
    FiList,
    FiLoader,
    FiMessageSquare,
    FiTruck,
    FiShield,
    FiX,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import api from "../../../shared/utils/api";
import chatService from "../../../shared/services/chatService";
import { useAuthStore } from "../../../shared/store/authStore";
import toast from "react-hot-toast";

const B2BVendorStore = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    const [vendor, setVendor] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("grid");
    const [sortBy, setSortBy] = useState("popular");
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productInquiries, setProductInquiries] = useState({});

    // Fetch vendor details and products
    useEffect(() => {
        const fetchVendorData = async () => {
            setLoading(true);
            try {
                // Fetch vendor details
                const vendorRes = await api.get(`/vendors/${id}`);
                if (vendorRes?.success) {
                    setVendor(vendorRes.data.vendor);
                }

                // Fetch products for this vendor (explicitly B2B)
                const productsRes = await api.get(`/products`, {
                    params: {
                        vendorId: id,
                        vendorType: 'b2b',
                        limit: 100,
                    }
                });

                if (productsRes?.success) {
                    const productsList = Array.isArray(productsRes.data)
                        ? productsRes.data
                        : (productsRes.data.products || []);
                    setProducts(productsList);
                }
            } catch (error) {
                console.error("Error fetching vendor store data:", error);
                toast.error("Failed to load store details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchVendorData();
        }
    }, [id]);

    // Check inquiries for current products
    useEffect(() => {
        if (isAuthenticated && products.length > 0) {
            checkInquiriesForProducts();
        }
    }, [products, isAuthenticated]);

    const checkInquiriesForProducts = async () => {
        try {
            const inquiryChecks = await Promise.all(
                products.map(async (product) => {
                    try {
                        const productId = product._id || product.id;
                        const response = await api.get(`/user/chat/inquiries/check/${productId}`);
                        return {
                            productId,
                            hasInquiry: response.success && response.data?.hasInquiry
                        };
                    } catch (error) {
                        return { productId: product._id || product.id, hasInquiry: false };
                    }
                })
            );

            const inquiryMap = {};
            inquiryChecks.forEach(check => {
                if (check.productId) {
                    inquiryMap[check.productId] = check.hasInquiry;
                }
            });
            setProductInquiries(inquiryMap);
        } catch (error) {
            console.error('Error checking inquiries:', error);
        }
    };

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let filtered = [...products];

        if (searchQuery) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        switch (sortBy) {
            case "price-low":
                filtered.sort((a, b) => a.price - b.price);
                break;
            case "price-high":
                filtered.sort((a, b) => b.price - a.price);
                break;
            case "newest":
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            default:
            // popular/default
        }

        return filtered;
    }, [products, searchQuery, sortBy]);

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
        if (vId) {
            navigate(`/b2b/inquiries?vendorId=${vId}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <B2BHeader />
                <div className="flex flex-col items-center justify-center py-32">
                    <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-bold mt-8 text-lg tracking-wide uppercase">Opening Store Gates...</p>
                </div>
                <B2BBottomNav />
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="min-h-screen bg-gray-50">
                <B2BHeader />
                <div className="max-w-7xl mx-auto px-4 py-32 text-center">
                    <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-gray-800 mb-4">Store Not Found</h2>
                    <button onClick={() => navigate("/b2b/catalog")} className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-200">
                        Back to Catalog
                    </button>
                </div>
                <B2BBottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <B2BHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={setSearchQuery}
            />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Link */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors mb-8 font-bold text-sm uppercase tracking-widest"
                >
                    <FiArrowLeft />
                    Back to Selection
                </button>

                {/* Vendor Premium Profile Card */}
                <div className="relative mb-12">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-800 rounded-[3rem] blur-3xl opacity-10 animate-pulse"></div>
                    <div className="relative bg-white rounded-[3rem] p-8 lg:p-12 border border-white shadow-[0_32px_64px_-16px_rgba(114,46,209,0.1)] flex flex-col md:flex-row items-center gap-8 lg:gap-12">
                        {/* Logo Container */}
                        <div className="w-32 h-32 lg:w-40 lg:h-40 bg-gray-50 rounded-[2.5rem] p-2 border-4 border-gray-50 shadow-inner flex-shrink-0 relative">
                            {vendor.storeLogo ? (
                                <img
                                    src={vendor.storeLogo}
                                    alt={vendor.storeName}
                                    className="w-full h-full object-cover rounded-[2rem]"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary-50 rounded-[2rem]">
                                    <FiShoppingBag className="text-4xl text-primary-600" />
                                </div>
                            )}
                            {vendor.isVerified && (
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg border-2 border-white">
                                    <FiCheckCircle className="text-xl" />
                                </div>
                            )}
                        </div>

                        {/* Info Container */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                                <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
                                    {vendor.storeName}
                                </h1>
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <span className="px-4 py-1.5 bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                                        Verified Wholesaler
                                    </span>
                                </div>
                            </div>

                            <p className="text-gray-500 font-medium text-lg mb-6 max-w-2xl">
                                {vendor.businessDescription || "Premium B2B supplier providing high-quality bulk products across India."}
                            </p>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-primary-600 font-bold border border-gray-100">
                                        {products.length}
                                    </div>
                                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Listings</span>
                                </div>
                                {vendor.address?.city && (
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-primary-600 border border-gray-100">
                                            <FiShield />
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-widest">{vendor.address.city}, {vendor.address.state}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 w-full md:w-auto">
                            <button
                                onClick={() => navigate(`/b2b/inquiries?vendorId=${vendor._id}`)}
                                className="w-full md:px-8 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-200"
                            >
                                Contact Head Office
                            </button>
                            <button className="w-full md:px-8 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-primary-100 transition-all">
                                Request Catalogue
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter & View Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
                    <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase">
                        Current <span className="text-primary-600">Inventory</span>
                    </h2>

                    <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                        <div className="relative group">
                            <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary-600 transition-colors" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="pl-10 pr-6 py-3 bg-white border border-gray-100 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 outline-none focus:border-primary-200 transition-all appearance-none"
                            >
                                <option value="popular">Most Relevant</option>
                                <option value="newest">Newest Stock</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                            </select>
                        </div>

                        <div className="flex items-center p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-primary-600 text-white shadow-lg shadow-primary-100" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <FiGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-primary-600 text-white shadow-lg shadow-primary-100" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <FiList size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Products Display */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                        <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-gray-800">No products match your criteria</h3>
                        <p className="text-gray-400 mt-2">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className={viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                        : "space-y-6"
                    }>
                        {filteredProducts.map((product) => (
                            <motion.div
                                key={product._id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => navigate(`/b2b/product/${product._id}`)}
                                className={`group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100/50 hover:shadow-[0_20px_50px_rgba(114,46,209,0.15)] transition-all duration-500 cursor-pointer flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row'}`}
                            >
                                <div className={`${viewMode === 'grid' ? 'w-full aspect-[4/3]' : 'w-64 h-64 flex-shrink-0'} relative overflow-hidden`}>
                                    <img
                                        src={product.images?.[0] || product.image || 'https://via.placeholder.com/400x300'}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 left-4 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black text-primary-600 uppercase tracking-[0.1em] shadow-sm">
                                        Bulk Only
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col flex-1">
                                    <div className="mb-3">
                                        <h3 className="text-lg font-black text-gray-800 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase tracking-tight">{product.name}</h3>
                                        <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-[0.2em]">
                                            {product.attributes?.find(a => a.name === 'subcategory')?.value || 'General'}
                                        </p>
                                    </div>

                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 font-medium leading-relaxed">
                                        {product.description}
                                    </p>

                                    <div className="flex items-center gap-4 mt-auto mb-6">
                                        <div className="px-3 py-1.5 bg-gray-50 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider border border-gray-100">
                                            <FiTruck className="text-primary-500 text-sm" />
                                            <span>Min. 100</span>
                                        </div>
                                        <div className="px-3 py-1.5 bg-gray-50 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider border border-gray-100">
                                            <FiShield className="text-primary-500 text-sm" />
                                            <span>Verified</span>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">MOQ Price</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-primary-600">₹{product.price}</span>
                                                <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">/ unit</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                                        {productInquiries[product._id] ? (
                                            <div className="flex-1 py-3.5 bg-green-50 border-2 border-green-200 text-green-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                                <span>✓ Sent</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openInquiry(product); }}
                                                className="flex-1 py-3.5 bg-white border-2 border-primary-600 text-primary-600 rounded-2xl hover:bg-primary-600 hover:text-white transition-all duration-300 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                            >
                                                Inquiry
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleChatDirect(product); }}
                                            className="p-3.5 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all"
                                        >
                                            <FiMessageSquare className="text-lg" />
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
                                    const formData = new FormData(e.target);
                                    const quantity = formData.get('quantity');
                                    const message = formData.get('message');

                                    if (!quantity || !message) {
                                        toast.error('Please fill in all required fields');
                                        return;
                                    }

                                    try {
                                        const vendorId = selectedProduct.vendorId?._id || selectedProduct.vendorId;
                                        const convResponse = await chatService.createOrGetConversation(vendorId);
                                        const conversation = convResponse.data || convResponse;
                                        const conversationId = conversation._id;

                                        const metadata = {
                                            productId: selectedProduct._id,
                                            productName: selectedProduct.name,
                                            productImage: selectedProduct.images?.[0] || selectedProduct.image,
                                            productPrice: selectedProduct.price,
                                            quantity: Number(quantity),
                                            clientMessage: message
                                        };

                                        const inquiryMessage = `📦 *INQUIRY FOR: ${selectedProduct.name}*\n` +
                                            `🔢 *Quantity:* ${quantity} units\n` +
                                            `💬 *Message:* ${message}`;

                                        await chatService.sendMessage(conversationId, vendorId, inquiryMessage, 'inquiry', metadata);

                                        setProductInquiries(prev => ({
                                            ...prev,
                                            [selectedProduct._id]: true
                                        }));

                                        toast.success('Inquiry sent successfully!');
                                        setShowInquiryModal(false);
                                    } catch (err) {
                                        console.error('Inquiry failed:', err);
                                        toast.error('Failed to send inquiry');
                                    }
                                }}>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Quantity Needed</label>
                                        <input
                                            type="number"
                                            name="quantity"
                                            placeholder="Min. 100 units"
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium"
                                            required
                                            min="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Message to Vendor</label>
                                        <textarea
                                            name="message"
                                            rows="4"
                                            placeholder="Write your requirements here..."
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white transition-all font-medium resize-none"
                                            required
                                        ></textarea>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all flex items-center justify-center gap-2"
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

export default B2BVendorStore;
