import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiSearch, FiMenu, FiX, FiChevronDown, FiGrid, FiShoppingBag,
    FiUser, FiArrowRight, FiBriefcase, FiTrendingUp, FiHome, FiMapPin, FiFilter
} from 'react-icons/fi';
import { appLogo } from '../../../data/logos';
import B2BBanner from '../components/B2BBanner';
import api from '../../../shared/utils/api';
import { debounce } from '../../../shared/utils/helpers';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';

// Dummy data for Header Popups
const HEADER_POPUP_DATA = {
    lots: [
        { id: 'l1', name: 'Mixed Electronics Lot', type: 'lot' },
        { id: 'l2', name: 'Textile Surplus', type: 'lot' },
        { id: 'l3', name: 'Liquidation Stock', type: 'lot' },
        { id: 'l4', name: 'Industrial Machinery', type: 'lot' },
    ],
    realEstate: [
        { id: 'r1', name: 'Warehouses', type: 'realEstate' },
        { id: 'r2', name: 'Retail Spaces', type: 'realEstate' },
        { id: 'r3', name: 'Commercial Offices', type: 'realEstate' },
        { id: 'r4', name: 'Industrial Plots', type: 'realEstate' },
    ]
};

const B2BLanding = () => {
    const navigate = useNavigate();
    const { categories, initialize: fetchCategories } = useB2BCategoryStore();

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

    const [availableStates, setAvailableStates] = useState([]);
    const [locationsLoading, setLocationsLoading] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');

    // Fetch categories on mount
    useEffect(() => {
        // Ensure we fetch the latest categories that vendors have added
        fetchCategories();

        // Fetch cities used in actual products
        const fetchAvailableLocations = async () => {
            setLocationsLoading(true);
            try {
                const response = await api.get('/public/b2b-locations');
                if (response.success && response.data) {
                    const states = (response.data.states || []).map(state => ({
                        ...state,
                        name: (state.name || '').trim()
                    }));
                    setAvailableStates(states);
                }
            } catch (error) {
                console.error('Error fetching locations:', error);
            } finally {
                setLocationsLoading(false);
            }
        };
        fetchAvailableLocations();
    }, [fetchCategories]);

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

        try {
            const searchTerm = typeof queryOrProduct === 'string' ? queryOrProduct : queryOrProduct.text;
            const response = await api.get(`/products/b2b-suggestions?q=${encodeURIComponent(searchTerm)}&limit=6`);

            if (response.success && response.data) {
                setPopupProducts(response.data.map((item, idx) => ({
                    id: item.id || idx,
                    name: item.text,
                    image: item.image || 'https://via.placeholder.com/150',
                    price: '₹' + (Math.floor(Math.random() * 5000) + 500)
                })));
            } else {
                setPopupProducts([]);
            }
        } catch (e) {
            console.error("Error fetching popup products", e);
            setPopupProducts([
                { id: 1, name: 'Sample Bulk Item 1', price: '₹1,200', image: 'https://via.placeholder.com/150' },
                { id: 2, name: 'Sample Bulk Item 2', price: '₹800', image: 'https://via.placeholder.com/150' },
                { id: 3, name: 'Sample Bulk Item 3', price: '₹2,500', image: 'https://via.placeholder.com/150' },
                { id: 4, name: 'Sample Bulk Item 4', price: '₹550', image: 'https://via.placeholder.com/150' },
            ]);
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800">{selectedRootCategory?.name} - Subcategories</h3>
                    <button onClick={closePopup}><FiX size={24} className="text-gray-500 hover:text-red-500" /></button>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                    {activeSubcategories.length > 0 ? (
                        activeSubcategories.map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => handleSubCategoryClick(sub)}
                                className="p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 text-left transition-all group"
                            >
                                <span className="font-semibold text-gray-700 group-hover:text-blue-700">{sub.name}</span>
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8 text-gray-500">No subcategories found.</div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );

    const GenericHeaderPopup = ({ title, data }) => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <button onClick={closePopup}><FiX size={24} className="text-gray-500 hover:text-red-500" /></button>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                    {data.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleHeaderPopupItemClick(item)}
                            className="p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 text-left transition-all"
                        >
                            <span className="font-semibold text-gray-700">{item.name}</span>
                        </button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );

    const ProductPopup = () => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800">Related Products</h3>
                    <button onClick={closePopup}><FiX size={24} className="text-gray-500 hover:text-red-500" /></button>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto">
                    {popupProducts.map((product) => (
                        <div
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className="border border-gray-100 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                        >
                            <div className="aspect-square bg-gray-100 overflow-hidden relative">
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="p-3">
                                <h4 className="font-bold text-sm text-gray-800 truncate">{product.name}</h4>
                                <p className="text-blue-600 font-bold text-sm mt-1">{product.price}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                    <button
                        onClick={() => navigate('/b2b/catalog')}
                        className="text-blue-600 font-bold hover:underline flex items-center justify-center gap-2"
                    >
                        View All Products <FiArrowRight />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-20 flex items-center gap-4 justify-between">

                    {/* 1. Logo */}
                    <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate('/b2b/landing')}>
                        <img src={appLogo.src} alt="Dealing India" className="h-12 w-auto" />
                    </div>

                    {/* 2. City Dropdown (Search Station) */}
                    <div className="relative hidden md:block" ref={cityDropdownRef}>
                        <button
                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                            disabled={locationsLoading}
                            className="flex items-center gap-2 px-4 py-2 border border-blue-200 rounded-full text-sm font-bold text-gray-700 hover:bg-blue-50 transition-all min-w-[140px] justify-between outline-none"
                        >
                            <div className="flex items-center gap-2">
                                <FiMapPin className="text-blue-600" />
                                <span className="truncate max-w-[100px]">{selectedCity}</span>
                            </div>
                            <FiChevronDown className={`transition-transform duration-200 border-l border-blue-100 pl-1 ml-1 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isCityDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[100]"
                                >
                                    <div className="p-3 border-b border-gray-50">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search city..."
                                                className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none"
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
                                            className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-blue-50 ${selectedCity === 'All Cities' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-600'}`}
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
                                                    className={`w-full px-4 py-2.5 text-left text-xs font-medium transition-colors hover:bg-blue-50 ${selectedCity === city ? 'text-blue-600 bg-blue-50/50' : 'text-gray-600'}`}
                                                >
                                                    {city}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-6 text-center">
                                                <p className="text-xs text-gray-400 font-medium">No cities found</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 3. Lot / SOT & Real Estate */}
                    <div className="hidden lg:flex items-center gap-1 xl:gap-2">
                        <button
                            onClick={() => setActivePopup('lots')}
                            className="px-3 py-2 text-sm font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <FiTrendingUp size={16} /> Lot / SOT
                        </button>
                        <button
                            onClick={() => setActivePopup('realEstate')}
                            className="px-3 py-2 text-sm font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <FiHome size={16} /> Real Estate Only
                        </button>
                    </div>

                    {/* 4. Become Seller & Profile */}
                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            onClick={() => navigate('/b2b-vendor/register')}
                            className="hidden md:flex bg-black text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors whitespace-nowrap"
                        >
                            Become Seller
                        </button>

                        <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

                        <button
                            onClick={() => navigate('/b2b/profile')}
                            className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-full transition-colors"
                        >
                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 border border-gray-200">
                                <FiUser size={18} />
                            </div>
                            <span className="text-sm font-bold text-gray-700 hidden md:block">Profile</span>
                        </button>

                        <button className="lg:hidden p-2" onClick={() => setIsMobileMenuOpen(true)}>
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
                        className="fixed inset-0 z-[60] bg-white"
                    >
                        <div className="p-4 flex items-center justify-between border-b border-gray-100">
                            <span className="font-bold text-lg">Menu</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full">
                                <FiX />
                            </button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            <div className="bg-gray-50 p-3 rounded-xl">
                                <h4 className="font-bold text-gray-500 text-xs uppercase mb-2">Location</h4>
                                <select
                                    value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}
                                    className="w-full p-2 rounded-lg border border-gray-200 bg-white"
                                >
                                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <button onClick={() => { setActivePopup('lots'); setIsMobileMenuOpen(false); }} className="w-full text-left p-3 font-bold text-gray-700 hover:bg-gray-50 rounded-xl">Lot / SOT</button>
                            <button onClick={() => { setActivePopup('realEstate'); setIsMobileMenuOpen(false); }} className="w-full text-left p-3 font-bold text-gray-700 hover:bg-gray-50 rounded-xl">Commercial Real Estate Only</button>
                            <div className="h-px bg-gray-100 my-2"></div>
                            <button onClick={() => navigate('/b2b-vendor/register')} className="w-full text-left p-3 font-bold text-white bg-black rounded-xl">Become Seller</button>
                            <button onClick={() => navigate('/b2b/profile')} className="w-full text-left p-3 font-bold text-gray-700 rounded-xl">Profile</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- TOOLBAR (Categories, Search, Price) --- */}
            <section className="bg-white border-b border-gray-100 shadow-sm relative z-40">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">

                    {/* 1. Category Dropdown */}
                    <div className="relative" ref={categoryRef}>
                        <button
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            className="flex items-center justify-between md:justify-start gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-800 transition-colors w-full md:w-auto"
                        >
                            <FiGrid /> Categories <FiChevronDown className={`transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
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
                                            className="w-full text-left px-5 py-3 hover:bg-blue-50 text-sm font-medium text-gray-700 border-b border-gray-50 last:border-0"
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 2. Product Search (Full Width) */}
                    <div className="flex-1 relative" ref={searchRef}>
                        <div className="flex items-center bg-white rounded-xl border border-gray-200 px-4 py-1 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 shadow-sm">
                            <FiSearch className="text-gray-400 mr-3" size={20} />
                            <input
                                type="text"
                                placeholder="Search products, brands..."
                                className="w-full bg-transparent py-2.5 text-sm font-medium outline-none placeholder:text-gray-400 h-10"
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
                                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0"
                                            >
                                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                                                    <FiShoppingBag />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{s.text}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase">{s.context}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 3. Price Filter */}
                    <div className="relative" ref={priceRef}>
                        <button
                            onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                            className="flex items-center justify-between md:justify-start gap-2 px-5 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-blue-300 transition-all w-full md:w-auto"
                        >
                            Price <FiChevronDown className={`transition-transform ${isPriceFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isPriceFilterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full right-0 md:left-auto mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-5"
                                >
                                    <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Price</h4>

                                    <div className="space-y-3 mb-6">
                                        {['Below ₹100', '₹101 - ₹200', '₹201 - ₹500', 'Above ₹501'].map((range, i) => (
                                            <div key={i} className="flex items-center gap-3 cursor-pointer group">
                                                <div className="w-4 h-4 rounded-full border border-gray-300 group-hover:border-blue-500"></div>
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">{range}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number" placeholder="₹ min"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-400"
                                            value={priceRange.min} onChange={e => setPriceRange({ ...priceRange, min: e.target.value })}
                                        />
                                        <input
                                            type="number" placeholder="₹ max"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-400"
                                            value={priceRange.max} onChange={e => setPriceRange({ ...priceRange, max: e.target.value })}
                                        />
                                        <button
                                            className="bg-blue-600 text-white font-bold p-2 px-4 rounded-lg hover:bg-blue-700"
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
                {activePopup === 'products' && <ProductPopup />}
                {activePopup === 'lots' && <GenericHeaderPopup title="Explore Lot / SOT" data={HEADER_POPUP_DATA.lots} />}
                {activePopup === 'realEstate' && <GenericHeaderPopup title="Commercial Real Estate" data={HEADER_POPUP_DATA.realEstate} />}
            </AnimatePresence>

        </div>
    );
};

export default B2BLanding;
