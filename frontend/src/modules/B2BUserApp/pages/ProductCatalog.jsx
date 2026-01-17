import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSearch, FiMessageSquare, FiTruck, FiShield, FiX, FiSend, FiChevronDown } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import B2BBanner from '../components/B2BBanner';
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
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [b2bVendors, setB2bVendors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [productInquiries, setProductInquiries] = useState({}); // Track which products have inquiries { productId: true/false }

    useEffect(() => {
        const init = async () => {
            await fetchB2BVendors();
            await fetchB2BProducts();
        };
        init();
    }, []);

    // Update categories when products change
    useEffect(() => {
        if (products.length > 0) {
            fetchB2BCategories();
            if (isAuthenticated) {
                checkInquiriesForProducts();
            }
        }
    }, [products, isAuthenticated]);

    const fetchB2BCategories = async () => {
        try {
            const response = await api.get('/public/b2b-categories');
            console.log('B2B Categories API Response:', response);
            if (response.success && response.data) {
                // Transform backend format to frontend format
                const transformedCategories = response.data.map((cat, index) => ({
                    id: cat._id || cat.id || index.toString(),
                    name: cat.name,
                    subcategories: cat.subcategories || [],
                }));
                
                // If products exist, filter categories to show only those that have products
                // Otherwise show all categories from admin
                let categoriesToShow = [];
                if (products.length > 0) {
                    categoriesToShow = transformedCategories.filter(cat => {
                        return products.some(product => {
                            // Get category from attributes array
                            const categoryAttr = product.attributes?.find(attr => 
                                attr.name === 'category' || attr.attributeName === 'category'
                            );
                            const productCategory = categoryAttr?.value || '';
                            return productCategory === cat.name;
                        });
                    });
                } else {
                    // If no products, show all categories (they might not have products yet)
                    categoriesToShow = transformedCategories;
                }
                
                // Build subcategories list based on actual products in each category
                const categoriesWithFilteredSubcategories = categoriesToShow.map(cat => {
                    // Get all subcategories that have products in this category (if products exist)
                    let subcategoriesToShow = cat.subcategories;
                    if (products.length > 0) {
                        subcategoriesToShow = cat.subcategories.filter(subcat => {
                            return products.some(product => {
                                const categoryAttr = product.attributes?.find(attr => 
                                    attr.name === 'category' || attr.attributeName === 'category'
                                );
                                const subcategoryAttr = product.attributes?.find(attr => 
                                    attr.name === 'subcategory' || attr.attributeName === 'subcategory'
                                );
                                const productCategory = categoryAttr?.value || '';
                                const productSubcategory = subcategoryAttr?.value || '';
                                return productCategory === cat.name && productSubcategory === subcat;
                            });
                        });
                    }
                    
                    return {
                        ...cat,
                        subcategories: subcategoriesToShow
                    };
                });
                
                // Always show 'All' option, then categories
                const finalCategories = [
                    { id: 'all', name: 'All', subcategories: [] },
                    ...categoriesWithFilteredSubcategories
                ];
                console.log('Setting categories:', finalCategories);
                console.log('Products count:', products.length);
                setCategories(finalCategories);
            } else {
                // Fallback: show empty categories
                setCategories([{ id: 'all', name: 'All', subcategories: [] }]);
            }
        } catch (error) {
            console.error('Error fetching B2B categories:', error);
            // Fallback: show empty categories
            setCategories([{ id: 'all', name: 'All', subcategories: [] }]);
        }
    };

    const handleCategoryClick = (categoryName) => {
        if (selectedCategory === categoryName && expandedCategory === categoryName) {
            // If clicking the same category, collapse it
            setExpandedCategory(null);
            setSelectedCategory('All');
            setSelectedSubcategory(null);
        } else {
            setSelectedCategory(categoryName);
            setExpandedCategory(categoryName);
            setSelectedSubcategory(null);
        }
    };

    const handleSubcategoryClick = (subcategoryName) => {
        setSelectedSubcategory(subcategoryName);
    };

    const getCurrentSubcategories = () => {
        if (selectedCategory === 'All' || !expandedCategory) return [];
        const category = categories.find(cat => cat.name === selectedCategory);
        return category ? category.subcategories : [];
    };

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

                // Use API data directly - no fallback mock data
                setProducts(productsData);
            }
        } catch (error) {
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const checkInquiriesForProducts = async () => {
        if (!isAuthenticated || products.length === 0) return;

        try {
            // Check inquiry status for all products in parallel
            const inquiryChecks = await Promise.all(
                products.map(async (product) => {
                    try {
                        const productId = product._id || product.id;
                        if (!productId) return { productId: null, hasInquiry: false };
                        
                        const response = await api.get(`/user/chat/inquiries/check/${productId}`);
                        return {
                            productId,
                            hasInquiry: response.success && response.data?.hasInquiry
                        };
                    } catch (error) {
                        // If error (e.g., not authenticated), treat as no inquiry
                        return { productId: product._id || product.id, hasInquiry: false };
                    }
                })
            );

            // Convert array to object for easy lookup
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

    const productsList = Array.isArray(products) ? products : [];

    const filteredProducts = productsList.filter(product => {
        const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesCategory = false;
        if (selectedCategory === 'All') {
            matchesCategory = true;
        } else {
            // Get category from attributes array
            const categoryAttr = product.attributes?.find(attr => 
                attr.name === 'category' || attr.attributeName === 'category'
            );
            const productCategory = categoryAttr?.value || product.categoryId?.name || product.category || '';
            
            if (selectedSubcategory) {
                // Get subcategory from attributes array
                const subcategoryAttr = product.attributes?.find(attr => 
                    attr.name === 'subcategory' || attr.attributeName === 'subcategory'
                );
                const productSubcategory = subcategoryAttr?.value || product.subcategory || product.subcategoryId?.name || '';
                
                // Filter by both category and subcategory
                matchesCategory = productCategory === selectedCategory && productSubcategory === selectedSubcategory;
            } else {
                // Filter by category only
                matchesCategory = productCategory === selectedCategory;
            }
        }
        
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
            navigate(`/b2b/inquiries?vendorId=${vId}`);
        } else {
            console.error('Invalid vendor ID:', vId);
            toast.error('Cannot start chat: Invalid Vendor ID');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader />

            {/* B2B Banner Carousel */}
            <B2BBanner />

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
                    <div className="space-y-3">
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar lg:pb-0">
                            <button
                                onClick={() => {
                                    setSelectedCategory('All');
                                    setExpandedCategory(null);
                                    setSelectedSubcategory(null);
                                }}
                                className={`px-5 py-2.5 rounded-2xl whitespace-nowrap font-medium transition-all ${selectedCategory === 'All'
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                    : 'bg-white text-gray-600 border border-gray-100 hover:border-primary-200'
                                    }`}
                            >
                                All
                            </button>
                            {categories.filter(cat => cat.name !== 'All').map((cat) => (
                                <div key={cat.id} className="relative">
                                    <button
                                        onClick={() => handleCategoryClick(cat.name)}
                                        className={`px-5 py-2.5 rounded-2xl whitespace-nowrap font-medium transition-all flex items-center gap-2 ${selectedCategory === cat.name
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                            : 'bg-white text-gray-600 border border-gray-100 hover:border-primary-200'
                                            }`}
                                    >
                                        {cat.name}
                                        {expandedCategory === cat.name && (
                                            <FiChevronDown className="text-xs rotate-180" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        {/* Subcategories Dropdown */}
                        {expandedCategory && getCurrentSubcategories().length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-2 overflow-x-auto pb-2 no-scrollbar lg:pb-0 flex-wrap"
                            >
                                {getCurrentSubcategories().map((sub, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSubcategoryClick(sub)}
                                        className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-all ${selectedSubcategory === sub
                                            ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </motion.div>
                        )}
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
                                        src={
                                            (Array.isArray(product.images) && product.images.length > 0) 
                                                ? product.images[0] 
                                                : product.image || 'https://via.placeholder.com/400x300'
                                        }
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
                                        {productInquiries[product._id || product.id] ? (
                                            <div className="flex-1 py-3 bg-green-50 border-2 border-green-200 text-green-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                                                <span>✓ Inquiry Done</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openInquiry(product); }}
                                                className="flex-1 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-2xl hover:bg-primary-50 transition-all font-bold text-sm flex items-center justify-center gap-2"
                                            >
                                                <FiSend className="text-xs" />
                                                Inquiry
                                            </button>
                                        )}
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

                                        // Update inquiry status for this product
                                        const productId = selectedProduct._id || selectedProduct.id;
                                        if (productId) {
                                            setProductInquiries(prev => ({
                                                ...prev,
                                                [productId]: true
                                            }));
                                        }

                                        toast.success('Inquiry sent via chat!');
                                        setShowInquiryModal(false);
                                        navigate(`/b2b/inquiries?vendorId=${vendorId}`);
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
