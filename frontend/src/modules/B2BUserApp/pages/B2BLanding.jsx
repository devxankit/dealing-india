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
import B2BProductCard from '../components/B2BProductCard';
import B2BVendorCard from '../components/B2BVendorCard';
import RealEstateCard from '../components/RealEstateCard';
import api from '../../../shared/utils/api';
import { debounce, getGoogleMapsUrl } from '../../../shared/utils/helpers';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import { useAuthStore } from '../../../shared/store/authStore';
import { useB2BLocationStore } from '../../../shared/store/b2bLocationStore';


const B2BLanding = () => {
    const navigate = useNavigate();
    const { categories, initialize: fetchCategories } = useB2BCategoryStore();
    const { isAuthenticated } = useAuthStore();

    // Navigation helper: requires login for any navigation from landing page (except login/register)
    const navigateWithAuth = (path) => {
        // Allow navigation to login/register without auth check
        if (path === '/b2b/login' || path === '/b2b/register' || path === '/b2b-vendor/register' || path === '/b2b-vendor/login') {
            navigate(path);
            return;
        }

        // For all other routes, require authentication
        if (!isAuthenticated) {
            navigate('/b2b/login', { state: { from: { pathname: path } } });
            return;
        }

        navigate(path);
    };

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Popup States
    const [activePopup, setActivePopup] = useState(null); // 'subcategories' | 'products' | 'lots' | 'realEstate' | 'stores'
    const [selectedRootCategory, setSelectedRootCategory] = useState(null);
    const [popupProducts, setPopupProducts] = useState([]);
    const [popupVendors, setPopupVendors] = useState([]);
    const [popupProperties, setPopupProperties] = useState([]);

    // Dropdown States
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
    const [isBusinessTypeDropdownOpen, setIsBusinessTypeDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Filter Data
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [businessTypes, setBusinessTypes] = useState([]);
    const [selectedBusinessType, setSelectedBusinessType] = useState(null);
    const [allVendors, setAllVendors] = useState([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [isMobileBusinessTypeOpen, setIsMobileBusinessTypeOpen] = useState(false);

    // Refs
    const searchRef = useRef(null);
    const categoryRef = useRef(null);
    const cityDropdownRef = useRef(null);
    const priceRef = useRef(null);
    const businessTypeRef = useRef(null);

    const [citySearchQuery, setCitySearchQuery] = useState('');

    // Store hooks
    const { states: availableStates, initialize: fetchLocations, isLoading: locationsLoading } = useB2BLocationStore();

    // Fetch initial data on mount
    useEffect(() => {
        fetchCategories();
        fetchLocations(false); // Let the store handle re-fetching if options changed

        const fetchBusinessTypes = async () => {
            try {
                const response = await api.get('/business-types');
                if (response.success) {
                    setBusinessTypes(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching business types:', error);
            }
        };

        const fetchAllVendors = async () => {
            try {
                setVendorsLoading(true);
                const response = await api.get('/vendors', {
                    params: { limit: 50, vendorType: 'b2b' }
                });
                if (response.success && response.data) {
                    const vendorData = Array.isArray(response.data) ? response.data : (response.data.vendors || []);
                    setAllVendors(vendorData);
                }
            } catch (error) {
                console.error('Error fetching vendors:', error);
            } finally {
                setVendorsLoading(false);
            }
        };

        fetchBusinessTypes();
        fetchAllVendors();
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
        // In B2B, subcategories are objects with {name, fields} structure
        // Transform them into objects with id and name for the UI to handle
        return (selectedRootCategory.subcategories || []).map((sub, index) => {
            const subName = typeof sub === 'string' ? sub : (sub?.name || '');
            return {
                id: `${selectedRootCategory.id}-sub-${index}`,
                name: subName,
                originalName: subName // Store original name for filtering
            };
        });
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
        if (!isAuthenticated) {
            navigate('/b2b/login', { state: { from: { pathname: '/b2b/landing' } } });
            return;
        }

        const searchTerm = typeof queryOrProduct === 'string' ? queryOrProduct : queryOrProduct.text;
        const isStoreSuggestion = typeof queryOrProduct !== 'string' && queryOrProduct.type === 'store';
        const isPropertySuggestion = typeof queryOrProduct !== 'string' && queryOrProduct.type === 'property';
        const isRealEstateSuggestion = typeof queryOrProduct !== 'string' && (
            queryOrProduct.isRealEstate ||
            (queryOrProduct.businessType && /developer|broker/i.test(queryOrProduct.businessType))
        );

        setIsSearching(true);
        setSearchQuery(searchTerm);

        const isStrict = typeof queryOrProduct !== 'string';

        try {
            if (isPropertySuggestion && queryOrProduct.id) {
                // Show specific property in the PropertiesPopup box
                setActivePopup('properties');
                setPopupProperties([]);
                const response = await api.get('/property/all', { params: { search: searchTerm, strict: isStrict } });
                if (response.success && response.data) {
                    setPopupProperties(response.data);
                }
            } else if ((isRealEstateSuggestion && queryOrProduct.vendorId) || isStoreSuggestion) {
                // User wants to see ALL matching stores when a suggestion is clicked
                setActivePopup('stores');
                setPopupVendors([]);
                const response = await api.get('/vendors', {
                    params: {
                        search: searchTerm,
                        strict: isStrict,
                        limit: 10
                    }
                });
                if (response.success && response.data) {
                    const vendorData = Array.isArray(response.data) ? response.data : (response.data.vendors || []);
                    setPopupVendors(vendorData.map(v => ({
                        ...v,
                        isRealEstate: v.isRealEstate || (v.businessType && /developer|broker/i.test(v.businessType))
                    })));
                }
            } else {
                // Determine if we should search for vendors too
                // Preserving product search as priority
                const [productRes, vendorRes, propertyRes] = await Promise.all([
                    api.get('/products', { params: { search: searchTerm, limit: 10, vendorType: 'b2b', strict: isStrict } }),
                    api.get('/vendors', { params: { search: searchTerm, limit: 10, strict: isStrict } }),
                    api.get('/property/all', { params: { search: searchTerm, limit: 10, strict: isStrict } })
                ]);

                const products = productRes.success && productRes.data ? (Array.isArray(productRes.data) ? productRes.data : (productRes.data.products || [])) : [];
                const vendors = vendorRes.success && vendorRes.data ? (Array.isArray(vendorRes.data) ? vendorRes.data : (vendorRes.data.vendors || [])) : [];
                const properties = propertyRes.success && propertyRes.data ? propertyRes.data : [];

                setPopupProducts(products.map(p => ({ ...p, moq: p.moq || p.minimumOrderQuantity || 1 })));
                setPopupVendors(vendors);
                setPopupProperties(properties);

                // Correctly prioritize results
                // If we found a real estate vendor (Developer/Broker), show the Office box
                const hasOfficeMatch = vendors.some(v =>
                    v.isRealEstate ||
                    (v.businessType || '').toLowerCase().includes('developer') ||
                    (v.businessType || '').toLowerCase().includes('broker') ||
                    (v.businessType || '').toLowerCase().includes('office') ||
                    (v.businessType || '').toLowerCase().includes('property')
                );

                if (hasOfficeMatch) {
                    setActivePopup('stores');
                } else if (properties.length > 0) {
                    setActivePopup('properties');
                } else if (vendors.length > 0) {
                    setActivePopup('stores');
                } else {
                    setActivePopup('products'); // Default to products if no specific results
                }
            }
        } catch (e) {
            console.error("Error fetching popup data", e);
            setPopupProducts([]);
            setPopupVendors([]);
            setPopupProperties([]);
            setActivePopup('products');
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
            navigateWithAuth(`/b2b/catalog?category=${encodeURIComponent(category.name)}${cityParam}`);
        }
    };

    const handleSubCategoryClick = (subCat) => {
        setActivePopup(null);
        const cityParam = selectedCity !== 'All Cities' ? `&city=${encodeURIComponent(selectedCity)}` : '';
        // Pass subcategory name as well
        navigateWithAuth(`/b2b/catalog?category=${encodeURIComponent(selectedRootCategory.name)}&subcategory=${encodeURIComponent(subCat.originalName)}${cityParam}`);
    };

    const handleProductClick = (product) => {
        setActivePopup(null);
        navigateWithAuth(`/b2b/catalog`);
    };

    const handleHeaderPopupItemClick = (item) => {
        setActivePopup(null);
        navigateWithAuth(`/b2b/catalog?type=${item.type}&filter=${item.id}`);
    };

    const handleBusinessTypeClick = (type) => {
        // Check if it's a real estate type - navigate to real estate page (case-insensitive)
        const typeName = (type.name || '').toUpperCase().trim();
        if (typeName === 'DEVELOPER' || typeName === 'PROPERTY BROKER') {
            setIsBusinessTypeDropdownOpen(false);
            const t = typeName === 'DEVELOPER' ? 'developer' : 'broker';
            navigateWithAuth(`/b2b/real-estate?type=${encodeURIComponent(t)}`);
            return;
        }

        const hasSubTypes = type.subTypes && type.subTypes.length > 0;
        if (hasSubTypes) {
            setSelectedBusinessType(type);
            setIsBusinessTypeDropdownOpen(false);
            setActivePopup('businessSubTypes');
        } else {
            setIsBusinessTypeDropdownOpen(false);
            const cityParam = selectedCity !== 'All Cities' ? `&city=${encodeURIComponent(selectedCity)}` : '';
            navigateWithAuth(`/b2b/catalog?businessType=${encodeURIComponent(type.name)}${cityParam}`);
        }
    };

    const handleBusinessSubTypeClick = (subType) => {
        setActivePopup(null);
        const cityParam = selectedCity !== 'All Cities' ? `&city=${encodeURIComponent(selectedCity)}` : '';
        navigateWithAuth(`/b2b/catalog?businessType=${encodeURIComponent(selectedBusinessType.name)}&businessSubType=${encodeURIComponent(subType)}${cityParam}`);
    };

    const closePopup = () => setActivePopup(null);

    // Track vendor contact clicks (call or whatsapp)
    const trackContactClick = async (vendorId, clickType) => {
        try {
            if (!vendorId) return;
            await api.post('/vendor/analytics/track-click', {
                vendorId,
                clickType
            });
        } catch (error) {
            // Silently fail - tracking shouldn't block user action
            console.error('Error tracking click:', error);
        }
    };

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
            if (businessTypeRef.current && !businessTypeRef.current.contains(event.target)) {
                setIsBusinessTypeDropdownOpen(false);
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
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Explore Categories</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">{selectedRootCategory?.name}</h3>
                    </div>
                    <button onClick={closePopup} className="p-2.5 bg-white shadow-sm rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
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
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Marketplace Hub</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
                    </div>
                    <button onClick={closePopup} className="p-2.5 bg-white shadow-sm rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
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
                    vendorType: 'b2b',
                    excludeBusinessTypes: 'Developer,Property Broker'
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

    const PropertiesPopup = ({ title, onViewAll }) => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Verified Properties</p>
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
                    </div>
                    <button onClick={closePopup} className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {popupProperties.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {popupProperties.slice(0, 10).map((property) => (
                                <RealEstateCard
                                    key={property._id}
                                    property={property}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                                <FiHome size={28} className="opacity-20" />
                            </div>
                            <p className="font-black uppercase tracking-widest text-[9px]">No matching properties found</p>
                        </div>
                    )}
                </div>
                <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
                    <button
                        onClick={() => {
                            closePopup();
                            if (onViewAll) onViewAll();
                            else navigateWithAuth('/b2b/real-estate');
                        }}
                        className="w-full md:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                    >
                        Explore Real Estate Hub <FiArrowRight />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    const ProductPopup = ({ title, onViewAll, itemType }) => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">
                            {popupProducts.some(p => p.itemType === 'lotslot') ? 'Verified Lots' : 'Verified Listings'}
                        </p>
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
                    </div>
                    <button onClick={closePopup} className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {popupProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {popupProducts.slice(0, 10).map((product) => (
                                <B2BProductCard
                                    key={product._id}
                                    product={product}
                                    viewMode="grid"
                                    trackContactClick={trackContactClick}
                                    itemType={itemType}
                                    onCardClick={() => {
                                        closePopup();
                                        navigateWithAuth(`/b2b/product/${product._id}`);
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                                <FiShoppingBag size={28} className="opacity-20" />
                            </div>
                            <p className="font-black uppercase tracking-widest text-[9px]">No matches found in inventory</p>
                        </div>
                    )}
                </div>
                <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
                    <button
                        onClick={() => {
                            closePopup();
                            if (onViewAll) onViewAll();
                            else navigateWithAuth('/b2b/catalog');
                        }}
                        className="w-full md:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                    >
                        View Full Marketplace <FiArrowRight />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    const StorePopup = ({ title, onViewAll }) => {
        const hasRealEstate = popupVendors.some(v =>
            v.isRealEstate ||
            (v.businessType || '').toLowerCase().includes('developer') ||
            (v.businessType || '').toLowerCase().includes('broker') ||
            (v.businessType || '').toLowerCase().includes('office') ||
            (v.businessType || '').toLowerCase().includes('property')
        );
        return (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
                onClick={closePopup}
            >
                <motion.div
                    initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">
                                {hasRealEstate ? 'Verified Offices' : 'Verified Stores'}
                            </p>
                            <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">
                                {hasRealEstate ? title.replace(/Stores/i, 'Offices') : title}
                            </h3>
                        </div>
                        <button onClick={closePopup} className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                            <FiX size={20} />
                        </button>
                    </div>
                    <div className="p-4 md:p-6 max-h-[55vh] overflow-y-auto custom-scrollbar">
                        {popupVendors.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {popupVendors.slice(0, 10).map((vendor) => (
                                    <B2BVendorCard
                                        key={vendor._id}
                                        vendor={vendor}
                                        viewMode="grid"
                                        trackContactClick={trackContactClick}
                                        itemType={hasRealEstate ? 'realestate' : ''}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                                    <FiBriefcase size={28} className="opacity-20" />
                                </div>
                                <p className="font-black uppercase tracking-widest text-[9px]">No matching {hasRealEstate ? 'offices' : 'stores'} found</p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
                        {hasRealEstate ? (
                            <div className="flex flex-col md:flex-row gap-3">
                                <button
                                    onClick={() => {
                                        closePopup();
                                        navigateWithAuth(`/b2b/real-estate?search=${encodeURIComponent(searchQuery)}`);
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                                >
                                    Explore Real Estate Hub <FiArrowRight />
                                </button>
                                <button
                                    onClick={() => {
                                        closePopup();
                                        navigateWithAuth(`/b2b/catalog?search=${encodeURIComponent(searchQuery)}&strict=true&shopOnly=true`);
                                    }}
                                    className="flex-1 px-6 py-3 bg-primary-50 text-primary-700 rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-primary-600 hover:text-white transition-all border border-primary-200 shadow-xl shadow-primary-100 flex items-center justify-center gap-3"
                                >
                                    View Marketplace <FiArrowRight />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    closePopup();
                                    if (onViewAll) {
                                        onViewAll();
                                    } else {
                                        navigateWithAuth('/b2b/catalog');
                                    }
                                }}
                                className="w-full md:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                            >
                                View Full Marketplace <FiArrowRight />
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        );
    };

    const BusinessSubTypePopup = () => (
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
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Business Specialization</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">{selectedBusinessType?.name}</h3>
                    </div>
                    <button onClick={closePopup} className="p-2.5 bg-white shadow-sm rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {selectedBusinessType?.subTypes && selectedBusinessType.subTypes.length > 0 ? (
                        selectedBusinessType.subTypes.map((sub, index) => (
                            <button
                                key={index}
                                onClick={() => handleBusinessSubTypeClick(sub)}
                                className="p-5 md:p-6 rounded-[1.5rem] border border-gray-100 hover:border-primary-200 hover:bg-primary-50 text-left transition-all group flex items-center justify-between"
                            >
                                <span className="font-black text-[11px] md:text-sm text-gray-700 group-hover:text-primary-600 uppercase tracking-wider">{sub}</span>
                                <FiArrowRight className="opacity-0 group-hover:opacity-100 transition-all text-primary-600 -translate-x-2 group-hover:translate-x-0" />
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20">
                            <FiBriefcase className="mx-auto text-4xl text-gray-200 mb-4" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No subtypes mapped</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );

    return (
        <div className="h-screen bg-white font-sans text-gray-900 overflow-hidden flex flex-col">

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-12 md:h-14 flex items-center gap-2 md:gap-4 justify-between">

                    {/* Left Section: Logo + City + Navigator Links */}
                    <div className="flex items-center gap-2 md:gap-6 flex-1">
                        {/* 1. Logo */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <img src={appLogo.src} alt="Dealing India" className="h-10 md:h-16 w-auto object-contain" />
                        </div>

                        {/* 2. Business Type Dropdown */}
                        <div className="relative hidden md:flex items-center" ref={businessTypeRef}>
                            <button
                                onClick={() => setIsBusinessTypeDropdownOpen(!isBusinessTypeDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2 border border-primary-100 rounded-full text-[11px] md:text-xs font-black uppercase tracking-wider text-gray-700 hover:bg-primary-50 transition-all min-w-[140px] justify-between outline-none"
                            >
                                <div className="flex items-center gap-2">
                                    <FiBriefcase className="text-primary-600" />
                                    <span className="truncate max-w-[100px]">Business Type</span>
                                </div>
                                <FiChevronDown className={`transition-transform duration-200 border-l border-primary-100 pl-1 ml-1 ${isBusinessTypeDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isBusinessTypeDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
                                    >
                                        {businessTypes.map(type => (
                                            <button
                                                key={type._id}
                                                onClick={() => handleBusinessTypeClick(type)}
                                                className="w-full text-left px-5 py-3 hover:bg-primary-50 text-[11px] font-black text-gray-700 border-b border-gray-50 last:border-0 uppercase tracking-wider flex items-center justify-between group"
                                            >
                                                <span>{type.name}</span>
                                                {type.subTypes && type.subTypes.length > 0 && <FiArrowRight className="opacity-0 group-hover:opacity-100 transition-all text-primary-600" />}
                                            </button>
                                        ))}
                                        {businessTypes.length === 0 && (
                                            <div className="py-4 text-center">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">No types available</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 3. Lot / SOT & Real Estate */}
                        <div className="hidden lg:flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (!isAuthenticated) {
                                        navigate('/b2b/login', { state: { from: { pathname: '/b2b/landing' } } });
                                        return;
                                    }
                                    fetchLotProducts();
                                    setActivePopup('lots');
                                }}
                                className="px-3 py-2 text-xs md:text-sm font-black text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap uppercase tracking-widest"
                            >
                                <FiTrendingUp size={16} /> Lot / SOT
                            </button>
                            <button
                                onClick={() => navigateWithAuth('/b2b/real-estate')}
                                className="px-3 py-2 text-xs md:text-sm font-black text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap uppercase tracking-widest"
                            >
                                <FiHome size={16} /> Real Estate
                            </button>
                        </div>
                        {/* Mobile quick links beside logo */}
                        <div className="flex md:hidden items-center gap-1 ml-1">
                            <button
                                onClick={() => {
                                    if (!isAuthenticated) {
                                        navigate('/b2b/login', { state: { from: { pathname: '/b2b/landing' } } });
                                        return;
                                    }
                                    fetchLotProducts();
                                    setActivePopup('lots');
                                }}
                                className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white border border-gray-200 text-gray-700"
                            >
                                Lot / SOT
                            </button>
                            <button
                                onClick={() => navigateWithAuth('/b2b/real-estate')}
                                className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white border border-gray-200 text-gray-700"
                            >
                                Real Estate
                            </button>
                            <button
                                onClick={() => navigate('/b2b-vendor/register')}
                                className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-black text-white"
                            >
                                Seller
                            </button>
                        </div>
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
                                className="hidden md:flex items-center gap-2 hover:bg-gray-50 p-1 md:p-1.5 rounded-full transition-colors"
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

                        <button className="hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
                                    <button onClick={() => {
                                        if (!isAuthenticated) {
                                            navigate('/b2b/login', { state: { from: { pathname: '/b2b/landing' } } });
                                        } else {
                                            fetchLotProducts();
                                            setActivePopup('lots');
                                        }
                                        setIsMobileMenuOpen(false);
                                    }} className="flex flex-col items-center gap-3 p-4 bg-primary-50 text-primary-600 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all hover:bg-primary-100">
                                        <FiTrendingUp size={24} /> Lot / SOT
                                    </button>
                                    <button onClick={() => { navigateWithAuth('/b2b/real-estate'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center gap-3 p-4 bg-primary-50 text-primary-600 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all hover:bg-primary-100">
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
                                            <option value="All Cities">All Cities</option>
                                            {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
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

            {/* Mobile footer bar */}
            <footer className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-white border-t border-gray-100 shadow-lg">
                <div className="max-w-[1920px] mx-auto px-4 py-2 flex items-center justify-between">
                    <button
                        onClick={() => navigate(isAuthenticated ? '/b2b/profile' : '/b2b/login')}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest"
                        aria-label="Profile"
                    >
                        <FiUser size={16} /> Profile
                    </button>
                    <button
                        onClick={() => setIsMobileBusinessTypeOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 font-black text-[10px] uppercase tracking-widest"
                    >
                        <FiBriefcase className="text-primary-600" /> Business Type
                    </button>
                </div>
            </footer>

            {/* Mobile Business Type sheet */}
            <AnimatePresence>
                {isMobileBusinessTypeOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] bg-black/40"
                        onClick={() => setIsMobileBusinessTypeOpen(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[60vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-black text-gray-800 uppercase">Select Business Type</h4>
                                <button onClick={() => setIsMobileBusinessTypeOpen(false)} className="p-2 bg-gray-100 rounded-lg"><FiX /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {businessTypes.map(type => (
                                    <button
                                        key={type._id}
                                        onClick={() => { handleBusinessTypeClick(type); setIsMobileBusinessTypeOpen(false); }}
                                        className="w-full text-left px-3 py-2 rounded-xl border border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-700 hover:bg-primary-50"
                                    >
                                        {type.name}
                                    </button>
                                ))}
                                {businessTypes.length === 0 && (
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-4">No types available</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- TOOLBAR (Categories, Search, Price) --- */}
            <section className="bg-white border-b border-gray-100 shadow-sm relative z-40 flex-none">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-1 md:py-1.5 flex flex-col md:flex-row items-stretch md:items-center gap-2">

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


                        {/* 3. Price Filter - Now shows Business Types */}
                        <div className="relative flex-1 md:flex-none" ref={priceRef}>
                            <button
                                onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                                className="flex items-center justify-between gap-2 px-4 md:px-5 py-2.5 md:py-3 border border-gray-200 rounded-xl text-[10px] md:text-sm font-black text-gray-600 hover:bg-gray-50 hover:border-primary-300 transition-all w-full uppercase tracking-wider md:tracking-widest"
                            >
                                <span>PRICE</span>
                                <FiChevronDown className={`transition-transform ${isPriceFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isPriceFilterOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full right-0 md:left-auto mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-5"
                                    >
                                        <h4 className="font-black text-gray-400 mb-4 text-[9px] uppercase tracking-[0.2em]">Quick Business Filters</h4>
                                        <div className="space-y-1">
                                            {['Mill', 'Yarn', 'Gray', 'Weaver'].map((label, i) => {
                                                // Find the actual full business type name from the database list
                                                const matchingType = businessTypes.find(t =>
                                                    t.name.toLowerCase().includes(label.toLowerCase())
                                                );
                                                const filterValue = matchingType ? matchingType.name : label;

                                                return (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-between cursor-pointer group hover:bg-primary-50 p-3 rounded-xl transition-all border border-transparent hover:border-primary-100"
                                                        onClick={() => {
                                                            setIsPriceFilterOpen(false);
                                                            const cityParam = selectedCity !== 'All Cities' ? `&city=${encodeURIComponent(selectedCity)}` : '';
                                                            navigateWithAuth(`/b2b/catalog?businessType=${encodeURIComponent(filterValue)}${cityParam}`);
                                                        }}
                                                    >
                                                        <span className="font-black text-[11px] md:text-sm text-gray-600 group-hover:text-primary-600 uppercase tracking-wider">{filterValue}</span>
                                                        <FiArrowRight className="opacity-0 group-hover:opacity-100 transition-all text-primary-600" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 3. City Dropdown (Search Station) */}
                        <div className="relative flex-1 md:flex-none" ref={cityDropdownRef}>
                            <button
                                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                                disabled={locationsLoading}
                                className="flex items-center justify-between gap-2 px-4 md:px-5 py-2.5 md:py-3 border border-gray-200 rounded-xl text-[10px] md:text-sm font-black text-gray-600 hover:bg-gray-50 hover:border-primary-300 transition-all w-full uppercase tracking-wider md:tracking-widest"
                            >
                                <div className="flex items-center gap-2">
                                    <FiMapPin className="text-primary-600" />
                                    <span className="hidden sm:inline">{selectedCity}</span>
                                    <span className="sm:hidden">City</span>
                                </div>
                                <FiChevronDown className={`transition-transform duration-200 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isCityDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-[100]"
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
                    </div>

                    {/* 2. Product Search (Full Width) */}
                    <div className="flex-1 relative order-first md:order-none" ref={searchRef}>
                        <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 px-3 md:px-4 py-0 md:py-0.5 transition-all focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-300 focus-within:bg-white">
                            <FiSearch className="text-gray-400 mr-2" size={16} />
                            <input
                                type="text"
                                placeholder="SEARCH PRODUCTS AND SHOPS"
                                className="w-full bg-transparent py-1.5 md:py-2.5 text-[10px] md:text-sm font-bold text-gray-700 outline-none placeholder:text-gray-400 h-9 md:h-10 uppercase tracking-tight"
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
                                                    {s.type === 'property' || s.isRealEstate ? <FiHome size={14} className="text-primary-500" /> : <FiShoppingBag />}
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

            {/* --- VENDOR SHIPS AUTO-SCROLL --- */}
            <section className="w-full bg-white pt-2 pb-0.5 overflow-hidden flex-none">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6 mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                                    <FiUser size={12} className="text-gray-400" />
                                </div>
                            ))}
                        </div>
                        <h2 className="text-[11px] md:text-sm font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            PREMIUM SUPPLIERS <span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded text-[9px] lowercase tracking-normal">verified</span>
                        </h2>
                    </div>
                </div>

                <div className="relative group">
                    <div className="flex gap-4 md:gap-6 animate-scroll hover:pause-scroll py-2">
                        {/* Render twice for infinite loop effect */}
                        {[...allVendors, ...allVendors].map((vendor, idx) => (
                            <div
                                key={`${vendor._id}-${idx}`}
                                className="flex-shrink-0 w-[140px] md:w-[160px]"
                            >
                                <B2BVendorCard
                                    vendor={vendor}
                                    viewMode="grid"
                                    trackContactClick={trackContactClick}
                                    compact={true}
                                />
                            </div>
                        ))}

                        {vendorsLoading && [...Array(6)].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-[240px] md:w-[280px] aspect-[4/5] bg-gray-50 animate-pulse rounded-2xl"></div>
                        ))}
                    </div>
                </div>

                <style>{`
                    @keyframes scroll {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(calc(-140px * ${allVendors.length} - 1rem * ${allVendors.length})); }
                    }
                    @media (min-width: 768px) {
                        @keyframes scroll {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(calc(-160px * ${allVendors.length} - 1.5rem * ${allVendors.length})); }
                        }
                    }
                    .animate-scroll {
                        display: flex;
                        width: max-content;
                        animation: scroll 40s linear infinite;
                    }
                    .pause-scroll:hover {
                        animation-play-state: paused;
                    }
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
            </section>

            {/* --- BANNER SECTION --- */}
            <section className="w-full bg-white flex-1 min-h-0 pb-2">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-full">
                    <div className="h-full rounded-[1.2rem] md:rounded-[2rem] overflow-hidden shadow-lg border border-gray-50">
                        <B2BBanner />
                    </div>
                </div>
            </section>


            {/* --- POPUPS --- */}
            <AnimatePresence>
                {activePopup === 'subcategories' && <SubCategoryPopup />}
                {activePopup === 'businessSubTypes' && <BusinessSubTypePopup />}
                {activePopup === 'products' && (
                    <ProductPopup
                        title={`Related Products for "${searchQuery}"`}
                        onViewAll={() => navigateWithAuth(`/b2b/catalog?search=${encodeURIComponent(searchQuery)}`)}
                    />
                )}
                {activePopup === 'properties' && (
                    <PropertiesPopup
                        title={`Matching Properties for "${searchQuery}"`}
                        onViewAll={() => navigateWithAuth(`/b2b/real-estate?search=${encodeURIComponent(searchQuery)}&strict=true`)}
                    />
                )}
                {activePopup === 'stores' && (
                    <StorePopup
                        title={`Matching Stores for "${searchQuery}"`}
                        onViewAll={() => {
                            const hasRealEstateMatch = popupVendors.some(v =>
                                v.isRealEstate ||
                                (v.businessType || '').toLowerCase().includes('developer') ||
                                (v.businessType || '').toLowerCase().includes('broker') ||
                                (v.businessType || '').toLowerCase().includes('office') ||
                                (v.businessType || '').toLowerCase().includes('property')
                            );
                            if (hasRealEstateMatch) {
                                navigateWithAuth(`/b2b/real-estate?search=${encodeURIComponent(searchQuery)}&strict=true`);
                            } else {
                                navigateWithAuth(`/b2b/catalog?search=${encodeURIComponent(searchQuery)}&strict=true`);
                            }
                        }}
                    />
                )}
                {activePopup === 'lots' && (
                    <ProductPopup
                        title="Explore Lot / SOT"
                        itemType="lotslot"
                        onViewAll={() => navigateWithAuth('/b2b/catalog?itemType=lotslot')}
                    />
                )}
            </AnimatePresence>

        </div >
    );
};

export default B2BLanding;
