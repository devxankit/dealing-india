import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiSearch, FiMenu, FiX, FiChevronDown, FiGrid, FiShoppingBag,
    FiUser, FiArrowRight, FiArrowLeft, FiBriefcase, FiTrendingUp, FiHome, FiMapPin, FiFilter,
    FiTruck, FiPhone, FiShoppingCart
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { appLogo } from '../../../data/logos';
import B2BBanner from '../components/B2BBanner';
import api from '../../../shared/utils/api';
import { debounce } from '../../../shared/utils/helpers';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import { useAuthStore } from '../../../shared/store/authStore';
import { useB2BLocationStore } from '../../../shared/store/b2bLocationStore';

// Dummy data for Header Popups
const HEADER_POPUP_DATA = {
    lots: [], // Data hidden as per request
    realEstate: [] // Data hidden as per request
};

const B2BLanding = () => {
    const navigate = useNavigate();
    const { categories, initialize: fetchCategories } = useB2BCategoryStore();
    const { isAuthenticated } = useAuthStore();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Popup States
    const [activePopup, setActivePopup] = useState(null); // 'subcategories' | 'products' | 'lots' | 'realEstate'
    const [selectedRootCategory, setSelectedRootCategory] = useState(null);
    const [popupProducts, setPopupProducts] = useState([]);

    // Dropdown States
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Filter Data
    const [availableCities, setAvailableCities] = useState(['All Cities', 'Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad']);
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });

    // Refs
    const searchRef = useRef(null);
    const categoryRef = useRef(null);
    const cityDropdownRef = useRef(null);
    const priceRef = useRef(null);

    const [citySearchQuery, setCitySearchQuery] = useState('');

    // Store hooks
    const { states: availableStates, initialize: fetchLocations, isLoading: locationsLoading } = useB2BLocationStore();

    // Fetch initial data on mount
    useEffect(() => {
        fetchCategories();
        fetchLocations();
    }, [fetchCategories, fetchLocations]);

    const uniqueCities = useMemo(() => {
        return (availableStates || [])
            .flatMap(state => state.cities || [])
            .filter((city, index, self) => {
                if (!city || typeof city !== 'string') return false;
                const cleanCity = city.trim();
                if (cleanCity.length === 0 || /^\d+$/.test(cleanCity)) return false;
                return self.findIndex(c => c.trim() === cleanCity) === index;
            })
            .sort();
    }, [availableStates]);

    const filteredCitiesList = useMemo(() => {
        return citySearchQuery
            ? uniqueCities.filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()))
            : uniqueCities;
    }, [citySearchQuery, uniqueCities]);

    // Derived State: Root Categories
    const rootCategories = useMemo(() => {
        // B2B categories from the new store don't have parentId, they are all roots
        return categories;
    }, [categories]);

    // Derived State: Subcategories of selected root
    const activeSubcategories = useMemo(() => {
        if (!selectedRootCategory) return [];
        // In B2B, subcategories are an array of strings within the category object
        // Transform them into objects with id and name for the UI to handle
        return (selectedRootCategory.subcategories || []).map((sub, index) => ({
            id: `${selectedRootCategory.id}-sub-${index}`,
            name: sub,
            originalName: sub // Store original name for filtering
        }));
    }, [selectedRootCategory]);

    // --- Search Logic ---
    const debouncedFetchSuggestions = useMemo(
        () => debounce(async (query) => {
            if (query.trim().length < 1) {
                setSuggestions([]);
                setIsSearching(false);
                return;
            }
            setIsSearching(true);
            try {
                const response = await api.get(`/products/b2b-suggestions?q=${encodeURIComponent(query)}`);
                if (response.success) {
                    setSuggestions(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300),
        []
    );

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (value.trim().length > 0) {
            setShowSuggestions(true);
            debouncedFetchSuggestions(value);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSearchProductPopup = async (queryOrProduct) => {
        setIsSearching(true);
        setActivePopup('products');

        const searchTerm = typeof queryOrProduct === 'string' ? queryOrProduct : queryOrProduct.text;
        setSearchQuery(searchTerm); // Update state to reflect what is being shown

        try {
            // Fetch real products with full details
            const response = await api.get('/products', {
                params: {
                    search: searchTerm,
                    limit: 6,
                    vendorType: 'b2b'
                }
            });

            if (response.success && response.data) {
                const products = Array.isArray(response.data) ? response.data : (response.data.products || []);
                const normalizedProducts = products.map(p => ({
                    ...p,
                    moq: p.moq || p.minimumOrderQuantity || 1
                }));
                setPopupProducts(normalizedProducts);
            } else {
                setPopupProducts([]);
            }
        } catch (e) {
            console.error("Error fetching popup products", e);
            setPopupProducts([]);
        } finally {
            setIsSearching(false);
            setShowSuggestions(false);
        }
    };

    const handleCategoryClick = (category) => {
        // Check if this category has subcategories
        const hasSubcategories = category.subcategories && category.subcategories.length > 0;

        if (hasSubcategories) {
            setSelectedRootCategory(category);
            setIsCategoryDropdownOpen(false);
            setActivePopup('subcategories');
        } else {
            // No subcategories, navigate directly
            setIsCategoryDropdownOpen(false);
            const cityParam = selectedCity !== 'All Cities' ? `&city=${encodeURIComponent(selectedCity)}` : '';
            navigate(`/b2b/catalog?category=${encodeURIComponent(category.name)}${cityParam}`);
        }
    };

    const handleSubCategoryClick = (subCat) => {
        setActivePopup(null);
        const cityParam = selectedCity !== 'All Cities' ? `&city=${encodeURIComponent(selectedCity)}` : '';
        // Pass subcategory name as well
        navigate(`/b2b/catalog?category=${encodeURIComponent(selectedRootCategory.name)}&subcategory=${encodeURIComponent(subCat.originalName)}${cityParam}`);
    };

    const handleProductClick = (product) => {
        setActivePopup(null);
        navigate(`/b2b/catalog`);
    };

    const handleHeaderPopupItemClick = (item) => {
        setActivePopup(null);
        navigate(`/b2b/catalog?type=${item.type}&filter=${item.id}`);
    };

    const closePopup = () => setActivePopup(null);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target)) {
                setIsCategoryDropdownOpen(false);
            }
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
                setIsCityDropdownOpen(false);
            }
            if (priceRef.current && !priceRef.current.contains(event.target)) {
                setIsPriceFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    // --- Render Components ---

    const SubCategoryPopup = () => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Explore Categories</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">{selectedRootCategory?.name}</h3>
                    </div>
                    <button onClick={closePopup} className="p-3 bg-white shadow-sm rounded-2xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={24} />
                    </button>
                </div>
                <div className="p-6 md:p-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {activeSubcategories.length > 0 ? (
                        activeSubcategories.map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => handleSubCategoryClick(sub)}
                                className="p-5 md:p-6 rounded-[1.5rem] border border-gray-100 hover:border-primary-200 hover:bg-primary-50 text-left transition-all group flex items-center justify-between"
                            >
                                <span className="font-black text-[11px] md:text-sm text-gray-700 group-hover:text-primary-600 uppercase tracking-wider">{sub.name}</span>
                                <FiArrowRight className="opacity-0 group-hover:opacity-100 transition-all text-primary-600 -translate-x-2 group-hover:translate-x-0" />
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20">
                            <FiGrid className="mx-auto text-4xl text-gray-200 mb-4" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No segments mapped</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );

    const GenericHeaderPopup = ({ title, data }) => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Marketplace Hub</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
                    </div>
                    <button onClick={closePopup} className="p-3 bg-white shadow-sm rounded-2xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={24} />
                    </button>
                </div>
                <div className="p-6 md:p-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data && data.length > 0 ? (
                        data.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleHeaderPopupItemClick(item)}
                                className="p-5 md:p-6 rounded-[1.5rem] border border-gray-100 hover:border-primary-200 hover:bg-primary-50 text-left transition-all group flex items-center justify-between"
                            >
                                <span className="font-black text-[11px] md:text-sm text-gray-700 group-hover:text-primary-600 uppercase tracking-wider">{item.name}</span>
                                <FiArrowRight className="opacity-0 group-hover:opacity-100 transition-all text-primary-600" />
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20">
                            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FiTrendingUp className="text-primary-600 text-3xl" />
                            </div>
                            <h4 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-2">Expansion in Progress</h4>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Connecting elite suppliers across India</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );

    const fetchLotProducts = async () => {
        try {
            const response = await api.get('/products', {
                params: {
                    itemType: 'lotslot',
                    limit: 10,
                    vendorType: 'b2b'
                }
            });

            if (response.success && response.data) {
                const products = Array.isArray(response.data) ? response.data : (response.data.products || []);
                const normalizedProducts = products.map(p => ({
                    ...p,
                    moq: p.moq || p.minimumOrderQuantity || 1
                }));
                setPopupProducts(normalizedProducts);
            } else {
                setPopupProducts([]);
            }
        } catch (e) {
            console.error("Error fetching lot products", e);
            setPopupProducts([]);
        }
    };

    const ProductPopup = ({ title, onViewAll }) => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-gray-50 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl w-full max-w-6xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 md:p-10 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Verified Listings</p>
                        <h3 className="text-xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
                    </div>
                    <button onClick={closePopup} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={24} />
                    </button>
                </div>
                <div className="p-4 md:p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {popupProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                            {popupProducts.map((product) => (
                                <div
                                    key={product._id}
                                    onClick={() => {
                                        closePopup();
                                        navigate(`/b2b/product/${product._id}`);
                                    }}
                                    className="group bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer flex flex-col"
                                >
                                    {/* Image Container */}
                                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                                        <img
                                            src={product.coverImage || product.image || (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null) || 'https://via.placeholder.com/400x300'}
                                            alt={product.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black text-primary-600 uppercase tracking-wider shadow-sm">
                                            {product.itemType === 'lotslot' ? 'Bulk Lot' : 'Bulk Supply'}
                                        </div>
                                        <div className="absolute bottom-4 right-4 px-4 py-2 bg-primary-600 rounded-2xl shadow-xl shadow-primary-200">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-[10px] font-black text-white/80">₹</span>
                                                <span className="text-xl font-black text-white">{product.price}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Body */}
                                    <div className="p-6 md:p-8 flex flex-col gap-4">
                                        <div className="min-w-0">
                                            <h3 className="text-base md:text-xl font-black text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase tracking-tight">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {product.subcategory || product.attributes?.find(a => a.name === 'subcategory')?.value || 'Industrial'}
                                                </p>
                                                {product.vendorId?.address?.city && (
                                                    <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">• {product.vendorId.address.city}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info Row: MOQ and Vendor */}
                                        <div className="flex items-center justify-between gap-4 py-4 border-y border-gray-50">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                                <FiTruck className="text-primary-500" size={14} />
                                                <span>Min {product.moq || 1} {product.unit || 'pcs'}</span>
                                            </div>
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    closePopup();
                                                    if (product.vendorId?._id) {
                                                        navigate(`/b2b/vendor/${product.vendorId._id}`);
                                                    }
                                                }}
                                                className="text-[10px] font-black text-primary-600 hover:text-primary-800 uppercase tracking-widest truncate max-w-[120px]"
                                            >
                                                {product.vendorId?.storeName || 'Verified Vendor'}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {product.vendorId?.phone ? (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`https://wa.me/91${product.vendorId.phone.replace(/\D/g, '')}`, '_blank');
                                                        }}
                                                        className="flex-1 py-4 bg-[#25D366]/10 text-[#25D366] rounded-2xl hover:bg-[#25D366] hover:text-white transition-all duration-300 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                                    >
                                                        <FaWhatsapp size={14} /> WhatsApp
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`tel:+91${product.vendorId?.phone}`, '_self');
                                                        }}
                                                        className="flex-1 py-4 bg-primary-50 text-primary-600 rounded-2xl hover:bg-primary-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                                    >
                                                        <FiPhone size={14} /> Call
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        closePopup();
                                                        navigate(`/b2b/product/${product._id}`);
                                                    }}
                                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                                                >
                                                    View Details
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                <FiShoppingBag size={32} className="opacity-20" />
                            </div>
                            <p className="font-black uppercase tracking-widest text-[10px]">No matches found in inventory</p>
                        </div>
                    )}
                </div>
                <div className="p-6 md:p-10 border-t border-gray-100 bg-white">
                    <button
                        onClick={() => {
                            closePopup();
                            if (onViewAll) onViewAll();
                            else navigate('/b2b/catalog');
                        }}
                        className="w-full md:w-auto px-10 py-5 bg-gray-900 text-white rounded-2xl md:rounded-full font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                    >
                        View Full Marketplace <FiArrowRight />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center gap-2 md:gap-4 justify-between">

                    {/* 1. Logo */}
                    <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate('/b2b/catalog')}>
                        <img src={appLogo.src} alt="Dealing India" className="h-10 md:h-24 w-auto object-contain" />
                    </div>

                    {/* 2. City Dropdown (Search Station) */}
                    <div className="relative hidden md:flex items-center" ref={cityDropdownRef}>
                        <button
                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                            disabled={locationsLoading}
                            className="flex items-center gap-2 px-4 py-2 border border-primary-100 rounded-full text-[11px] md:text-xs font-black uppercase tracking-wider text-gray-700 hover:bg-primary-50 transition-all min-w-[140px] justify-between outline-none"
                        >
                            <div className="flex items-center gap-2">
                                <FiMapPin className="text-primary-600" />
                                <span className="truncate max-w-[100px]">{selectedCity}</span>
                            </div>
                            <FiChevronDown className={`transition-transform duration-200 border-l border-primary-100 pl-1 ml-1 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isCityDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[100]"
                                >
                                    <div className="p-3 border-b border-gray-50">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search city..."
                                                className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-xl text-[10px] font-bold focus:ring-1 focus:ring-primary-600 outline-none uppercase tracking-wider"
                                                value={citySearchQuery}
                                                onChange={(e) => setCitySearchQuery(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>

                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                        <button
                                            onClick={() => {
                                                setSelectedCity('All Cities');
                                                setIsCityDropdownOpen(false);
                                                setCitySearchQuery('');
                                            }}
                                            className={`w-full px-4 py-2.5 text-left text-[10px] font-black transition-colors hover:bg-primary-50 uppercase tracking-wider ${selectedCity === 'All Cities' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                        >
                                            All Cities
                                        </button>

                                        {filteredCitiesList.length > 0 ? (
                                            filteredCitiesList.map((city, index) => (
                                                <button
                                                    key={`${city}-${index}`}
                                                    onClick={() => {
                                                        setSelectedCity(city);
                                                        setIsCityDropdownOpen(false);
                                                        setCitySearchQuery('');
                                                    }}
                                                    className={`w-full px-4 py-2.5 text-left text-[10px] font-black transition-colors hover:bg-primary-50 uppercase tracking-wider ${selectedCity === city ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                                >
                                                    {city}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">No cities found</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 3. Lot / SOT & Real Estate */}
                    <div className="hidden lg:flex items-center gap-1">
                        <button
                            onClick={() => {
                                fetchLotProducts();
                                setActivePopup('lots');
                            }}
                            className="px-3 py-2 text-[10px] font-black text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap uppercase tracking-widest"
                        >
                            <FiTrendingUp size={14} /> Lot / SOT
                        </button>
                        <button
                            onClick={() => navigate('/b2b/real-estate')}
                            className="px-3 py-2 text-[10px] font-black text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap uppercase tracking-widest"
                        >
                            <FiHome size={14} /> Real Estate
                        </button>
                    </div>

                    {/* 4. Become Seller & Profile */}
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => navigate('/b2b-vendor/register')}
                            className="hidden md:flex bg-black text-white px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors whitespace-nowrap"
                        >
                            Become Seller
                        </button>

                        <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

                        {isAuthenticated ? (
                            <button
                                onClick={() => navigate('/b2b/profile')}
                                className="flex items-center gap-2 hover:bg-gray-50 p-1 md:p-1.5 rounded-full transition-colors"
                            >
                                <div className="w-8 h-8 md:w-9 md:h-9 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 border border-primary-100 shadow-sm">
                                    <FiUser size={16} className="md:size-[18px]" />
                                </div>
                                <span className="text-[10px] font-black text-gray-700 hidden md:block uppercase tracking-wider">Profile</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/b2b/login')}
                                className="flex items-center gap-2 bg-primary-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100"
                            >
                                Login
                            </button>
                        )}

                        <button className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
                            <FiMenu size={24} />
                        </button>
                    </div>
                </div>
            </header>

            {/* --- MOBILE MENU --- */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }}
                        className="fixed inset-0 z-[60] bg-white flex flex-col"
                    >
                        <div className="p-4 flex items-center justify-between border-b border-gray-100 h-16">
                            <img src={appLogo.src} alt="Logo" className="h-8 w-auto object-contain" />
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-xl text-gray-600">
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-4">
                                <h4 className="font-black text-gray-400 text-[9px] uppercase tracking-[0.2em]">Quick Access</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => { fetchLotProducts(); setActivePopup('lots'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center gap-3 p-4 bg-primary-50 text-primary-600 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all hover:bg-primary-100">
                                        <FiTrendingUp size={24} /> Lot / SOT
                                    </button>
                                    <button onClick={() => { navigate('/b2b/real-estate'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center gap-3 p-4 bg-primary-50 text-primary-600 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all hover:bg-primary-100">
                                        <FiHome size={24} /> Real Estate
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-gray-50">
                                <h4 className="font-black text-gray-400 text-[9px] uppercase tracking-[0.2em]">Marketplace Settings</h4>
                                <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Location</span>
                                        <select
                                            value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}
                                            className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
                                        >
                                            {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50 space-y-3">
                                <button onClick={() => { navigate('/b2b-vendor/register'); setIsMobileMenuOpen(false); }} className="w-full py-4 font-black transition-all bg-black text-white rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-gray-200 hover:bg-gray-800">
                                    Become Seller
                                </button>
                                {!isAuthenticated && (
                                    <button onClick={() => { navigate('/b2b/login'); setIsMobileMenuOpen(false); }} className="w-full py-4 font-black transition-all bg-primary-600 text-white rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary-100 hover:bg-primary-700">
                                        Partner Login
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- TOOLBAR (Categories, Search, Price) --- */}
            <section className="bg-white border-b border-gray-100 shadow-sm relative z-40">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">

                    <div className="flex gap-2 w-full md:w-auto">
                        {/* 1. Category Dropdown */}
                        <div className="relative flex-1 md:flex-none" ref={categoryRef}>
                            <button
                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                className="flex items-center justify-between gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-[10px] md:text-sm font-black text-gray-800 transition-colors w-full uppercase tracking-wider md:tracking-widest"
                            >
                                <div className="flex items-center gap-2">
                                    <FiGrid className="text-primary-600" /> <span className="hidden sm:inline">Categories</span><span className="sm:hidden">Cat.</span>
                                </div>
                                <FiChevronDown className={`transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isCategoryDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
                                    >
                                        {rootCategories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleCategoryClick(cat)}
                                                className="w-full text-left px-5 py-3 hover:bg-primary-50 text-[11px] font-black text-gray-700 border-b border-gray-50 last:border-0 uppercase tracking-wider"
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 3. Price Filter */}
                        <div className="relative flex-1 md:flex-none" ref={priceRef}>
                            <button
                                onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                                className="flex items-center justify-between gap-2 px-4 md:px-5 py-2.5 md:py-3 border border-gray-200 rounded-xl text-[10px] md:text-sm font-black text-gray-600 hover:bg-gray-50 hover:border-primary-300 transition-all w-full uppercase tracking-wider md:tracking-widest"
                            >
                                <span className="hidden sm:inline">Price Filter</span><span className="sm:hidden">Price</span>
                                <FiChevronDown className={`transition-transform ${isPriceFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isPriceFilterOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full right-0 md:left-auto mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-5"
                                    >
                                        <h4 className="font-black text-gray-400 mb-4 text-[9px] uppercase tracking-[0.2em]">Price Context</h4>

                                        <div className="space-y-2 mb-6">
                                            {[
                                                { label: 'Below ₹100', min: 0, max: 100 },
                                                { label: '₹101 - ₹200', min: 101, max: 200 },
                                                { label: '₹201 - ₹500', min: 201, max: 500 },
                                                { label: 'Above ₹501', min: 501, max: null }
                                            ].map((item, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between cursor-pointer group hover:bg-primary-50 p-2.5 rounded-xl transition-all border border-transparent hover:border-primary-100"
                                                    onClick={() => {
                                                        setIsPriceFilterOpen(false);
                                                        navigate(`/b2b/catalog?min=${item.min}&max=${item.max}`);
                                                    }}
                                                >
                                                    <span className="text-[11px] font-black text-gray-600 group-hover:text-primary-600 uppercase tracking-wider">{item.label}</span>
                                                    <FiArrowLeft className="rotate-180 opacity-0 group-hover:opacity-100 transition-opacity text-primary-600" />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number" placeholder="₹ min"
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-[10px] font-bold outline-none focus:border-primary-400 uppercase"
                                                value={priceRange.min} onChange={e => setPriceRange({ ...priceRange, min: e.target.value })}
                                            />
                                            <input
                                                type="number" placeholder="₹ max"
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-[10px] font-bold outline-none focus:border-primary-400 uppercase"
                                                value={priceRange.max} onChange={e => setPriceRange({ ...priceRange, max: e.target.value })}
                                            />
                                            <button
                                                className="bg-primary-600 text-white font-black p-2.5 px-5 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-100 text-[10px] uppercase tracking-widest"
                                                onClick={() => { setIsPriceFilterOpen(false); navigate(`/b2b/catalog?min=${priceRange.min}&max=${priceRange.max}`); }}
                                            >
                                                GO
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* 2. Product Search (Full Width) */}
                    <div className="flex-1 relative order-first md:order-none" ref={searchRef}>
                        <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 px-4 py-0.5 transition-all focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-300 focus-within:bg-white">
                            <FiSearch className="text-gray-400 mr-2" size={18} />
                            <input
                                type="text"
                                placeholder="Search products, brands or assets..."
                                className="w-full bg-transparent py-2.5 text-[11px] md:text-sm font-bold text-gray-700 outline-none placeholder:text-gray-400 h-10 uppercase tracking-tight"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchProductPopup(searchQuery)}
                                onFocus={() => setShowSuggestions(true)}
                            />
                        </div>
                        {/* Suggestions */}
                        <AnimatePresence>
                            {(showSuggestions && suggestions.length > 0) && (
                                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                    <div className="max-h-60 overflow-y-auto">
                                        {suggestions.map((s, i) => (
                                            <div
                                                key={i}
                                                onClick={() => handleSearchProductPopup(s)}
                                                className="px-4 py-3 hover:bg-primary-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-400">
                                                    <FiShoppingBag />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-gray-800 uppercase tracking-tight">{s.text}</p>
                                                    <p className="text-[8px] text-gray-500 uppercase tracking-widest">{s.context}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </section>

            {/* --- BANNER SECTION --- */}
            <section className="w-full bg-gray-50 py-4 md:py-6">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6">
                    <B2BBanner />
                </div>
            </section>



            {/* --- POPUPS --- */}
            <AnimatePresence>
                {activePopup === 'subcategories' && <SubCategoryPopup />}
                {activePopup === 'products' && (
                    <ProductPopup
                        title={`Related Products for "${searchQuery}"`}
                        onViewAll={() => navigate(`/b2b/catalog?search=${encodeURIComponent(searchQuery)}`)}
                    />
                )}
                {activePopup === 'lots' && (
                    <ProductPopup
                        title="Explore Lot / SOT"
                        onViewAll={() => navigate('/b2b/catalog?itemType=lotslot')}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

export default B2BLanding;
