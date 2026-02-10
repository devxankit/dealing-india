import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSearch, FiTruck, FiShield, FiX, FiChevronDown, FiPhone, FiGrid, FiMapPin, FiTrendingUp, FiHome } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import { useAuthStore } from '../../../shared/store/authStore';
import { debounce } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import { useB2BLocationStore } from '../../../shared/store/b2bLocationStore';

const ProductCatalog = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuthenticated } = useAuthStore();
    const [products, setProducts] = useState([]);
    // categories come from store now

    // Initialize state from URL params to prevent double-mount effects
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
    const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get('subcategory') || null);
    const [expandedCategory, setExpandedCategory] = useState(searchParams.get('category') || null);
    const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || 'All Cities');


    const [loading, setLoading] = useState(true);
    const [b2bVendors, setB2bVendors] = useState([]);
    const [categories, setCategories] = useState([]);
    const categoryDropdownRefs = useRef({}); // Refs for each category dropdown
    const [selectedState, setSelectedState] = useState('All States');

    const { categories: allCategories, initialize: fetchB2BCategories } = useB2BCategoryStore();
    const { states: availableStates, initialize: fetchAvailableLocations, isLoading: locationsLoading } = useB2BLocationStore();

    const [availableCities, setAvailableCities] = useState([]);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const cityDropdownRef = useRef(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
    const [selectedPriceRange, setSelectedPriceRange] = useState(null);

    const [customPriceRange, setCustomPriceRange] = useState({ min: '', max: '' });
    const [priceInputs, setPriceInputs] = useState({ min: '', max: '' });
    const [businessCredentials, setBusinessCredentials] = useState({ gst: false, turnover: false });
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [selectedFabric, setSelectedFabric] = useState(null);
    const [isMainCategoryDropdownOpen, setIsMainCategoryDropdownOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const mainCategoryDropdownRef = useRef(null);
    const [openFilters, setOpenFilters] = useState({
        price: true,
        pattern: false,
        fabric: false
    });

    const [activeImageIndices, setActiveImageIndices] = useState({});

    // Use click-based navigation instead of hover
    const handleNextImage = (e, productId, totalImages) => {
        e.stopPropagation();
        setActiveImageIndices(prev => {
            const currentIndex = prev[productId] || 0;
            return {
                ...prev,
                [productId]: (currentIndex + 1) % totalImages
            };
        });
    };

    const handlePrevImage = (e, productId, totalImages) => {
        e.stopPropagation();
        setActiveImageIndices(prev => {
            const currentIndex = prev[productId] || 0;
            return {
                ...prev,
                [productId]: (currentIndex - 1 + totalImages) % totalImages
            };
        });
    };

    const toggleFilter = (section) => {
        setOpenFilters(prev => ({ ...prev, [section]: !prev[section] }));
    };

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

    const renderFilters = () => (
        <div className="space-y-6">
            {/* Price Filter Block */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Price</h3>
                    {(selectedPriceRange || customPriceRange.min || customPriceRange.max) && (
                        <button
                            onClick={() => {
                                setSelectedPriceRange(null);
                                setCustomPriceRange({ min: '', max: '' });
                            }}
                            className="text-[10px] font-bold text-primary-600 hover:text-primary-700"
                        >
                            RESET
                        </button>
                    )}
                </div>
                <div className="p-5 space-y-3">
                    {[
                        { label: 'Below ₹100', min: 0, max: 100 },
                        { label: '₹101 - ₹200', min: 101, max: 200 },
                        { label: '₹201 - ₹500', min: 201, max: 500 },
                        { label: 'Above ₹501', min: 501, max: null }
                    ].map((range) => (
                        <button
                            key={range.label}
                            onClick={() => {
                                setSelectedPriceRange(range);
                                setCustomPriceRange({ min: '', max: '' });
                                setPriceInputs({ min: '', max: '' });
                                if (isMobileFilterOpen) setIsMobileFilterOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedPriceRange?.label === range.label
                                ? 'bg-primary-50 text-primary-600'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}

                    <div className="pt-4 mt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <input
                                    type="number"
                                    placeholder="₹ min"
                                    value={priceInputs.min}
                                    onChange={(e) => {
                                        setPriceInputs(prev => ({ ...prev, min: e.target.value }));
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="number"
                                    placeholder="₹ max"
                                    value={priceInputs.max}
                                    onChange={(e) => {
                                        setPriceInputs(prev => ({ ...prev, max: e.target.value }));
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    setCustomPriceRange(priceInputs);
                                    setSelectedPriceRange(null);
                                    if (isMobileFilterOpen) setIsMobileFilterOpen(false);
                                }}
                                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                GO
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pattern Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleFilter('pattern')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Pattern</h3>
                    <div className="flex items-center gap-2">
                        {selectedPattern && (
                            <span onClick={(e) => { e.stopPropagation(); setSelectedPattern(null); }} className="text-[10px] font-bold text-primary-600 hover:text-primary-700 mr-2">RESET</span>
                        )}
                        <FiChevronDown className={`text-gray-400 transition-transform ${openFilters.pattern ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                <AnimatePresence>
                    {openFilters.pattern && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 space-y-2 max-h-48 overflow-y-auto custom-scrollbar border-t border-gray-50">
                                {uniquePatterns.map(pattern => (
                                    <label key={pattern} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="radio"
                                                name="pattern"
                                                className="peer sr-only"
                                                checked={selectedPattern === pattern}
                                                onChange={() => {
                                                    setSelectedPattern(pattern);
                                                    if (isMobileFilterOpen) setIsMobileFilterOpen(false);
                                                }}
                                            />
                                            <div className="w-4 h-4 border-2 border-gray-300 rounded-full peer-checked:border-primary-600 peer-checked:bg-primary-600 transition-all"></div>
                                        </div>
                                        <span className={`text-xs font-bold transition-colors ${selectedPattern === pattern ? 'text-primary-700' : 'text-gray-500 group-hover:text-gray-700'}`}>{pattern}</span>
                                    </label>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Fabric Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleFilter('fabric')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Fabric</h3>
                    <div className="flex items-center gap-2">
                        {selectedFabric && (
                            <span onClick={(e) => { e.stopPropagation(); setSelectedFabric(null); }} className="text-[10px] font-bold text-primary-600 hover:text-primary-700 mr-2">RESET</span>
                        )}
                        <FiChevronDown className={`text-gray-400 transition-transform ${openFilters.fabric ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                <AnimatePresence>
                    {openFilters.fabric && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 space-y-2 max-h-48 overflow-y-auto custom-scrollbar border-t border-gray-50">
                                {uniqueFabrics.map(fabric => (
                                    <label key={fabric} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="radio"
                                                name="fabric"
                                                className="peer sr-only"
                                                checked={selectedFabric === fabric}
                                                onChange={() => {
                                                    setSelectedFabric(fabric);
                                                    if (isMobileFilterOpen) setIsMobileFilterOpen(false);
                                                }}
                                            />
                                            <div className="w-4 h-4 border-2 border-gray-300 rounded-full peer-checked:border-primary-600 peer-checked:bg-primary-600 transition-all"></div>
                                        </div>
                                        <span className={`text-xs font-bold transition-colors ${selectedFabric === fabric ? 'text-primary-700' : 'text-gray-500 group-hover:text-gray-700'}`}>{fabric}</span>
                                    </label>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );


    // Define functions before useEffect hooks that use them
    // fetchAvailableLocations replaced by store action


    const handleStateChange = (selectedValue) => {
        // Backend already returns clean state names, so use directly
        // console.log('🔄 handleStateChange called with:', selectedValue);

        setSelectedCity('All Cities');

        if (selectedValue === 'All States' || !selectedValue || selectedValue.trim() === '') {
            setSelectedState('All States');
            setAvailableCities([]);
            return;
        }

        // Find state by exact match (trimmed) - backend already returns clean names
        const trimmedSelected = (selectedValue || '').trim();

        const stateData = availableStates.find(s => {
            const stateName = (s.name || '').trim();
            const matches = stateName === trimmedSelected;
            return matches;
        });

        if (!stateData) {
            console.error('❌ State not found!');
            setSelectedState('All States');
            setAvailableCities([]);
            return;
        }

        // Set selected state - use the exact name from stateData to ensure matching
        const exactStateName = (stateData.name || '').trim();
        setSelectedState(exactStateName);

        if (stateData.cities && Array.isArray(stateData.cities) && stateData.cities.length > 0) {
            const stateName = exactStateName;

            // Final cleanup of cities
            const cleanedCities = stateData.cities
                .map(city => {
                    if (!city || typeof city !== 'string') return null;
                    let cleanCity = city.trim();

                    // Skip if empty
                    if (!cleanCity || cleanCity.length === 0) return null;

                    // Skip if only numbers (pincode)
                    if (/^\d+$/.test(cleanCity)) return null;

                    // Skip if it's exactly the state name
                    if (cleanCity.toLowerCase() === stateName.toLowerCase()) return null;

                    // Remove pincode if present at the end
                    cleanCity = cleanCity.replace(/\s+\d{6}$/, '').replace(/\s+\d{5,6}$/, '').trim();

                    // Only remove state name from end if city has multiple words
                    const stateWords = stateName.split(' ').filter(w => w.length > 2);
                    if (stateWords.length > 0 && cleanCity.split(' ').length > 1) {
                        const cityWords = cleanCity.split(' ');
                        const lastWord = cityWords[cityWords.length - 1];
                        // Only remove if last word matches a state word AND city has more than one word
                        if (stateWords.some(sw => sw.toLowerCase() === lastWord.toLowerCase()) && cityWords.length > 1) {
                            cleanCity = cityWords.slice(0, -1).join(' ').trim();
                        }
                    }

                    // Return cleaned city if it's still valid
                    return (cleanCity && cleanCity.length > 0) ? cleanCity : null;
                })
                .filter(city => city !== null && city.length > 0); // Remove nulls and empty strings

            if (cleanedCities.length > 0) {
                setAvailableCities(cleanedCities);
            } else {
                // If all cities were filtered, use original cities (less filtered)
                const fallbackCities = stateData.cities
                    .filter(city => city && typeof city === 'string' && city.trim().length > 0 && !/^\d+$/.test(city.trim()))
                    .map(city => city.trim());
                setAvailableCities(fallbackCities);
            }
        } else {
            setAvailableCities([]);
        }
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

    const [selectedItemType, setSelectedItemType] = useState(searchParams.get('itemType') || null);

    const fetchB2BProducts = async () => {
        setLoading(true);
        try {
            // Build query parameters
            const params = {
                vendorType: 'b2b'
            };

            // Add location filters if selected
            if (selectedState !== 'All States') {
                params.state = selectedState;
            }
            if (selectedCity !== 'All Cities') {
                params.city = selectedCity;
            }

            // Add Item Type Filter (Lot/Slot vs Regular)
            if (selectedItemType) {
                params.itemType = selectedItemType;
            }

            // Pattern and Fabric Filters
            if (selectedPattern) {
                params.pattern = selectedPattern;
            }
            if (selectedFabric) {
                params.fabric = selectedFabric;
            }

            // Category & Subcategory Filters (Backend)
            if (selectedCategory && selectedCategory !== 'All') {
                const categoryObj = allCategories.find(c => c.name === selectedCategory);
                if (categoryObj) {
                    // Pass the ID to the backend
                    params.categoryId = categoryObj.id || categoryObj._id;
                }
            }
            if (selectedSubcategory) {
                params.subcategoryId = selectedSubcategory;
            }

            // Fetch products where vendorType is b2b
            const response = await api.get('/products', { params });
            if (response.success && response.data) {
                // The API returns a paginated object { products, total, page, totalPages }
                const productsData = Array.isArray(response.data) ? response.data : (response.data.products || []);

                // Normalize MOQ for catalog display
                const normalizedProducts = productsData.map(p => ({
                    ...p,
                    moq: p.moq || p.minimumOrderQuantity || 1
                }));

                // Use API data directly - no fallback mock data
                setProducts(normalizedProducts);
            }
        } catch (error) {
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    // Debounced suggestion fetch
    const debouncedFetchSuggestions = useRef(
        debounce(async (query) => {
            if (query.trim().length < 1) {
                setSuggestions([]);
                setIsSearchingSuggestions(false);
                return;
            }
            setIsSearchingSuggestions(true);
            try {
                const response = await api.get(`/products/b2b-suggestions?q=${encodeURIComponent(query)}`);
                if (response.success) {
                    setSuggestions(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            } finally {
                setIsSearchingSuggestions(false);
            }
        }, 300)
    ).current;

    const handleSearchInputChange = (e) => {
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

    const handleSuggestionClick = (suggestion) => {
        const query = suggestion.text;
        setSearchQuery(query);
        setShowSuggestions(false);
        handleHeaderSearchSubmit(query);
    };

    // Read search query, city, category and subcategory from URL on mount
    useEffect(() => {
        const urlSearch = searchParams.get('search');
        const urlCity = searchParams.get('city');
        const urlCategory = searchParams.get('category');
        const urlSubcategory = searchParams.get('subcategory');
        const urlMin = searchParams.get('min');
        const urlMax = searchParams.get('max');

        if (urlSearch && urlSearch !== searchQuery) {
            setSearchQuery(urlSearch);
        }
        if (urlCity && urlCity !== selectedCity) {
            setSelectedCity(urlCity);
        }
        if (urlCategory && urlCategory !== selectedCategory) {
            setSelectedCategory(urlCategory);
            setExpandedCategory(urlCategory);
        }
        if (urlSubcategory && urlSubcategory !== selectedSubcategory) {
            setSelectedSubcategory(urlSubcategory);
        }

        const urlItemType = searchParams.get('itemType');
        if (urlItemType && urlItemType !== selectedItemType) {
            setSelectedItemType(urlItemType);
        } else if (!urlItemType && selectedItemType) {
            setSelectedItemType(null);
        }

        // Handle Price params
        if (urlMin || urlMax) {
            // Check if it matches a predefined range to highlight the button
            const minVal = urlMin ? Number(urlMin) : null;
            const maxVal = urlMax ? Number(urlMax) : null;

            // Try to match predefined ranges
            const predefined = [
                { label: 'Below ₹100', min: 0, max: 100 },
                { label: '₹101 - ₹200', min: 101, max: 200 },
                { label: '₹201 - ₹500', min: 201, max: 500 },
                { label: 'Above ₹501', min: 501, max: null }
            ].find(r => r.min === minVal && r.max === maxVal);

            if (predefined) {
                setSelectedPriceRange(predefined);
                setCustomPriceRange({ min: '', max: '' });
                setPriceInputs({ min: '', max: '' });
            } else {
                const custom = { min: urlMin || '', max: urlMax || '' };
                setCustomPriceRange(custom);
                setPriceInputs(custom);
                setSelectedPriceRange(null);
            }
        }
    }, [searchParams]);

    // Initial Data Fetch
    useEffect(() => {
        const init = async () => {
            // Parallel fetches
            await Promise.all([
                fetchAvailableLocations(),
                fetchB2BVendors(),
                fetchB2BCategories()
            ]);
        };
        init();
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
                setIsCityDropdownOpen(false);
            }
            if (mainCategoryDropdownRef.current && !mainCategoryDropdownRef.current.contains(event.target)) {
                setIsMainCategoryDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Filter categories locally when products change
    useEffect(() => {
        filterCategoriesLocally();
    }, [products, allCategories]);

    // Recheck inquiries when modal closes (in case inquiry was just sent)


    // Refetch products when filters change (Location, ItemType, Pattern, Fabric, Category, Subcategory)
    // OPTIMIZED: Use allCategories.length as dependency instead of allCategories reference
    // This prevents duplicate API calls when the categories array reference changes but content stays the same
    useEffect(() => {
        // Skip fetch if a category is selected but categories haven't loaded yet
        if (selectedCategory && selectedCategory !== 'All' && allCategories.length === 0) {
            return; // Wait for categories to load before fetching by category
        }
        fetchB2BProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedState, selectedCity, selectedItemType, selectedPattern, selectedFabric, selectedCategory, selectedSubcategory, allCategories.length]);

    // Debug: Log state and cities changes
    useEffect(() => {
        // If state is selected but cities are empty, try to find cities again
        if (selectedState !== 'All States' && availableCities.length === 0 && !locationsLoading && availableStates.length > 0) {
            const stateData = availableStates.find(s => (s.name || '').trim() === selectedState);
            if (stateData && stateData.cities && stateData.cities.length > 0) {
                // Use cities directly without heavy filtering
                const directCities = stateData.cities
                    .filter(city => city && typeof city === 'string' && city.trim().length > 0)
                    .map(city => city.trim());
                if (directCities.length > 0) {
                    setAvailableCities(directCities);
                }
            }
        }
    }, [selectedState, availableCities, locationsLoading, availableStates]);

    // fetchB2BCategories replaced by store action

    const filterCategoriesLocally = () => {
        // Function to filter categories based on currently loaded products

        let categoriesToShow = [];
        if (allCategories.length === 0) {
            // Fallback
            setCategories([{ id: 'all', name: 'All', subcategories: [] }]);
            return;
        }

        if (products.length > 0) {
            categoriesToShow = allCategories.filter(cat => {
                return products.some(product => {
                    // Get category from root field or attributes array (fallback)
                    let productCategory = product.category;
                    if (!productCategory) {
                        const categoryAttr = product.attributes?.find(attr =>
                            attr.name === 'category' || attr.attributeName === 'category'
                        );
                        productCategory = categoryAttr?.value || '';
                    }
                    return productCategory === cat.name;
                });
            });
        } else {
            // If no products, show all categories
            categoriesToShow = allCategories;
        }

        // Build subcategories list - show all subcategories from backend, don't filter by products
        const categoriesWithFilteredSubcategories = categoriesToShow.map(cat => {
            return {
                ...cat,
                subcategories: cat.subcategories || []
            };
        });

        // Always show 'All' option, then categories
        const finalCategories = [
            { id: 'all', name: 'All', subcategories: [] },
            ...categoriesWithFilteredSubcategories
        ];

        setCategories(finalCategories);
    };

    const handleCategoryClick = (categoryName, event) => {
        if (event) {
            event.stopPropagation();
        }

        const category = categories.find(cat => cat.name === categoryName);
        const hasSubcategories = category && category.subcategories && category.subcategories.length > 0;

        if (hasSubcategories) {
            if (expandedCategory === categoryName) {
                // If already expanded, just collapse and reset selection to All
                setExpandedCategory(null);
                setSelectedCategory('All');
                setSelectedSubcategory(null);
            } else {
                // Expand and SELECT this category
                setExpandedCategory(categoryName);
                setSelectedCategory(categoryName);
                setSelectedSubcategory(null); // Reset subcategory when switching main category
            }
        } else {
            // No subcategories, select category directly
            setSelectedCategory(categoryName);
            setSelectedSubcategory(null);
            setExpandedCategory(null);
        }

        // Clear search query when changing category to avoid conflicts
        setSearchQuery('');
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('search');
        setSearchParams(newParams, { replace: true });
    };

    const handleSubcategoryClick = (subcategoryName, categoryName) => {
        setSelectedCategory(categoryName);
        setSelectedSubcategory(subcategoryName);
        // Keep expandedCategory as categoryName so the card stays open for further filtering

        // Clear search query
        setSearchQuery('');
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('search');
        setSearchParams(newParams, { replace: true });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!expandedCategory) return;

        const handleClickOutside = (event) => {
            // Check if click is inside any category dropdown container
            let clickedInside = false;
            Object.values(categoryDropdownRefs.current).forEach((ref) => {
                if (ref && ref.contains(event.target)) {
                    clickedInside = true;
                }
            });

            // Also check if click is on the category button itself (to allow toggle)
            const categoryButtons = document.querySelectorAll('[data-category-button]');
            categoryButtons.forEach(btn => {
                if (btn.contains(event.target)) {
                    clickedInside = true;
                }
            });

            // CRITICAL: Check if click is on subcategory buttons - don't close card when clicking subcategories
            // Find the expanded category card and check if click is inside it
            const expandedCard = document.querySelector('[data-expanded-category-card]');
            if (expandedCard && expandedCard.contains(event.target)) {
                clickedInside = true;
            }

            // Also check if click is on any subcategory button specifically
            const subcategoryButtons = document.querySelectorAll('[data-subcategory-button]');
            subcategoryButtons.forEach(btn => {
                if (btn.contains(event.target) || btn === event.target) {
                    clickedInside = true;
                }
            });

            if (!clickedInside) {
                setExpandedCategory(null);
            }
        };

        // Add event listener after a delay to avoid immediate closure
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [expandedCategory]);

    const getCurrentSubcategories = () => {
        if (selectedCategory === 'All' || !expandedCategory) return [];
        const category = categories.find(cat => cat.name === selectedCategory);
        return category ? category.subcategories : [];
    };



    const productsList = Array.isArray(products) ? products : [];

    // Helper to get all attributes including specifications
    const getProductAttributes = (p) => [
        ...(p.attributes || []),
        ...(p.specifications || [])
    ];

    // Predefined Filter Options (ensure these always show)
    const PREDEFINED_PATTERNS = ["Solid", "Striped", "Checked", "Floral", "Abstract", "Geometric", "Polka Dot", "Paisley", "Embroidered", "Printed"];
    const PREDEFINED_FABRICS = ["Cotton", "Silk", "Wool", "Polyester", "Linen", "Leather", "Denim", "Velvet", "Chiffon", "Georgette", "Rayon", "Nylon", "Satin"];


    // Derive unique filter options (Predefined + Actual)
    const uniquePatterns = [...new Set([
        ...PREDEFINED_PATTERNS,
        ...productsList.flatMap(p => getProductAttributes(p).filter(a => a.name === 'Pattern').map(a => a.value))
    ])].filter(Boolean).sort();

    const uniqueFabrics = [...new Set([
        ...PREDEFINED_FABRICS,
        ...productsList.flatMap(p => getProductAttributes(p).filter(a => a.name === 'Fabric').map(a => a.value))
    ])].filter(Boolean).sort();



    const filteredProducts = productsList.filter(product => {
        const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase());

        // Category filtering is now handled by the backend
        let matchesCategory = true;
        // if (selectedCategory === 'All') {
        //     matchesCategory = true;
        // } else {
        //    // Logic moved to backend
        // }

        // Price Filter Logic
        let matchesPrice = true;
        const price = Number(product.price);
        if (selectedPriceRange) {
            if (selectedPriceRange.min !== null && price < selectedPriceRange.min) matchesPrice = false;
            if (selectedPriceRange.max !== null && price > selectedPriceRange.max) matchesPrice = false;
        } else if (customPriceRange.min || customPriceRange.max) {
            if (customPriceRange.min && price < Number(customPriceRange.min)) matchesPrice = false;
            if (customPriceRange.max && price > Number(customPriceRange.max)) matchesPrice = false;
        }

        // Business Credential Filter Logic
        let matchesCredentials = true;
        if (businessCredentials.gst && !product.vendorId?.gstNumber) {
            matchesCredentials = false;
        }

        // Attribute Filters (Pattern, Fabric, Color) - Now handled by Backend
        // const pAttrs = getProductAttributes(product);
        // if (selectedPattern && !pAttrs.some(a => a.name === 'Pattern' && a.value === selectedPattern)) return false;
        // if (selectedFabric && !pAttrs.some(a => a.name === 'Fabric' && a.value === selectedFabric)) return false;

        return matchesSearch && matchesCategory && matchesPrice && matchesCredentials;
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

    const handleHeaderSearchChange = (value) => {
        setSearchQuery(value);
    };

    const handleHeaderSearchSubmit = (query) => {
        setSearchQuery(query);

        // Reset Category and Subcategory when searching to ensure global search
        setSelectedCategory('All');
        setSelectedSubcategory(null);
        setExpandedCategory(null);

        // Auto-select city if search query matches a known city name
        // This is a convenience feature requested by user
        if (query && query.trim().length > 2) {
            const cleanQuery = query.toLowerCase().trim();
            const foundCity = availableStates
                .flatMap(s => s.cities || [])
                .find(c => c && typeof c === 'string' && c.toLowerCase().trim() === cleanQuery);

            if (foundCity) {
                console.log('🏙️ Auto-selecting city from search:', foundCity);
                setSelectedCity(foundCity.trim());
                // Optional: Clear search query if you only want to filter by city?
                // setSearchQuery(''); 
            }
        }

        // Update URL without navigation
        const newParams = new URLSearchParams(searchParams);

        // Clear category params from URL
        newParams.delete('category');
        newParams.delete('subcategory');

        if (query) {
            newParams.set('search', query);
        } else {
            newParams.delete('search');
        }
        setSearchParams(newParams, { replace: true });
    };

    const uniqueCities = (availableStates || [])
        .flatMap(state => state.cities || [])
        .filter((city, index, self) => {
            if (!city || typeof city !== 'string') return false;
            const cleanCity = city.trim();
            if (cleanCity.length === 0 || /^\d+$/.test(cleanCity)) return false;
            return self.findIndex(c => c.trim() === cleanCity) === index;
        })
        .sort();

    const filteredCitiesList = citySearchQuery
        ? uniqueCities.filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()))
        : uniqueCities;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader
                searchQuery={searchQuery}
                onSearchChange={handleHeaderSearchChange}
                onSearchSubmit={handleHeaderSearchSubmit}
                hideSearch={false}
            />

            {/* Sticky Mobile Filter Bar */}
            <div className="lg:hidden sticky top-[65px] z-[45] bg-white/95 backdrop-blur-md border-b border-gray-100 flex items-center shadow-sm">
                <button
                    onClick={() => setIsMainCategoryDropdownOpen(!isMainCategoryDropdownOpen)}
                    className="flex-1 py-3 flex flex-col items-center gap-1 border-r border-gray-50 active:bg-gray-50 transition-colors"
                >
                    <FiGrid className="text-primary-600" size={18} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Categories</span>
                </button>
                <button
                    onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                    className="flex-1 py-3 flex flex-col items-center gap-1 border-r border-gray-50 active:bg-gray-50 transition-colors"
                >
                    <FiMapPin className="text-primary-600" size={18} />
                    <span className="text-[9px] font-black uppercase tracking-tighter truncate max-w-[70px]">
                        {selectedCity === 'All Cities' ? 'Location' : selectedCity}
                    </span>
                </button>
                <button
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="flex-1 py-3 flex flex-col items-center gap-1 active:bg-gray-50 transition-colors"
                >
                    <div className="relative">
                        <FiFilter className={selectedPriceRange || customPriceRange.min || selectedPattern || selectedFabric ? 'text-primary-600' : 'text-gray-400'} size={18} />
                        {(selectedPriceRange || customPriceRange.min || selectedPattern || selectedFabric) && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter">Filters</span>
                </button>
            </div>

            {/* Mobile Quick Navigation Shortcuts */}
            <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 bg-white border-b border-gray-50">
                <Link
                    to="/b2b/catalog?itemType=lotslot"
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-[10px] font-black uppercase tracking-wider transition-all border ${selectedItemType === 'lotslot'
                        ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100'
                        : 'bg-white text-gray-400 border-gray-100 hover:border-primary-300 hover:text-primary-600'}`}
                >
                    <FiTrendingUp size={14} className={selectedItemType === 'lotslot' ? 'text-white' : 'text-primary-600'} />
                    Lot / SOT
                </Link>
                <Link
                    to="/b2b/real-estate"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-[10px] font-black uppercase tracking-wider bg-white text-gray-400 border border-gray-100 hover:border-primary-300 hover:text-primary-600 transition-all font-bold"
                >
                    <FiHome size={14} className="text-primary-600" />
                    Real Estate
                </Link>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-4 md:py-8">
                {/* Search & Filter Bar */}
                <div className="space-y-4 md:space-y-6 mb-6 md:mb-10">
                    {/* Location Filters */}
                    <div className="hidden md:flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                        {/* City Searchable Dropdown */}
                        <div className="relative w-full md:w-64" ref={cityDropdownRef}>
                            <button
                                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                                disabled={locationsLoading}
                                className="w-full px-4 py-3 md:py-3.5 bg-white border border-gray-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-primary-500 font-bold text-xs md:text-sm shadow-sm transition-all outline-none flex items-center justify-between gap-2"
                            >
                                <span className="truncate">{selectedCity}</span>
                                <FiChevronDown className={`transition-transform duration-200 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isCityDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl md:rounded-2xl shadow-xl z-[100] overflow-hidden"
                                    >
                                        <div className="p-3 border-b border-gray-50">
                                            <div className="relative">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Search city..."
                                                    className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
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
                                                className={`w-full px-4 py-2.5 text-left text-[10px] md:text-xs font-black transition-colors hover:bg-primary-50 ${selectedCity === 'All Cities' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                            >
                                                ALL CITIES
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
                                                        className={`w-full px-4 py-2.5 text-left text-[10px] md:text-xs font-bold transition-colors hover:bg-primary-50 ${selectedCity === city ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                                    >
                                                        {city.toUpperCase()}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-6 text-center text-[10px] text-gray-400 font-bold">NO CITIES FOUND</div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Horizontal Scrollable Cities List */}
                        <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
                            <button
                                onClick={() => setSelectedCity('All Cities')}
                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 border ${selectedCity === 'All Cities'
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100'
                                    : 'bg-white text-gray-400 border-gray-100 hover:border-primary-300 hover:text-primary-600 shadow-sm'
                                    }`}
                            >
                                All Cities
                            </button>
                            {uniqueCities.slice(0, 15).map((city, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedCity(city)}
                                    className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 border ${selectedCity === city
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100'
                                        : 'bg-white text-gray-400 border-gray-100 hover:border-primary-300 hover:text-primary-600 shadow-sm'
                                        }`}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Category Dropdown Selection */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                        <div className="relative w-full md:w-72" ref={mainCategoryDropdownRef}>
                            <button
                                onClick={() => setIsMainCategoryDropdownOpen(!isMainCategoryDropdownOpen)}
                                className={`flex items-center justify-between gap-3 px-6 py-3.5 md:py-4 bg-white border rounded-xl md:rounded-2xl text-[11px] md:text-sm font-black transition-all w-full shadow-sm hover:shadow-md ${selectedCategory !== 'All' ? 'border-primary-200 text-primary-600 bg-primary-50/20' : 'border-gray-200 text-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2 uppercase tracking-widest">
                                    <FiGrid className={selectedCategory !== 'All' ? 'text-primary-600' : 'text-gray-400'} size={16} />
                                    <span>{selectedCategory === 'All' ? 'Browse Categories' : selectedCategory}</span>
                                </div>
                                <FiChevronDown className={`transition-transform duration-300 ${isMainCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isMainCategoryDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl md:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60]"
                                    >
                                        <div className="p-2 max-h-[400px] overflow-y-auto">
                                            <button
                                                onClick={() => {
                                                    setSelectedCategory('All');
                                                    setExpandedCategory(null);
                                                    setSelectedSubcategory(null);
                                                    setIsMainCategoryDropdownOpen(false);
                                                    setSearchQuery('');
                                                }}
                                                className={`w-full text-left px-4 py-3 rounded-lg text-[10px] md:text-xs font-black transition-all uppercase tracking-widest ${selectedCategory === 'All' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                View All
                                            </button>
                                            {categories.filter(cat => cat.name !== 'All').map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        handleCategoryClick(cat.name);
                                                        setIsMainCategoryDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 rounded-lg text-[10px] md:text-xs font-black transition-all flex items-center justify-between group uppercase tracking-widest ${selectedCategory === cat.name ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    <span>{cat.name}</span>
                                                    {cat.subcategories?.length > 0 && <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-400 group-hover:bg-primary-100 group-hover:text-primary-600">{cat.subcategories.length}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Quick filter info */}
                        {selectedCategory !== 'All' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full border border-primary-100 self-start md:self-auto">
                                <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest">Active:</span>
                                <span className="text-[10px] font-bold text-gray-700 uppercase">{selectedCategory}</span>
                                {selectedSubcategory && (
                                    <>
                                        <div className="w-1 h-1 bg-primary-300 rounded-full mx-1"></div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{selectedSubcategory}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Full Width Subcategory Explorer Card */}
                    <AnimatePresence mode="wait">
                        {expandedCategory && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, scale: 0.98 }}
                                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                                exit={{ height: 0, opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                                className="overflow-hidden"
                                data-expanded-category-card
                            >
                                <div className="bg-gradient-to-br from-white to-primary-50/30 rounded-[2.5rem] p-6 lg:p-8 border border-primary-100/50 shadow-2xl shadow-primary-100/10 mb-2 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/20 blur-3xl rounded-full -mr-16 -mt-16"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-100/20 blur-2xl rounded-full -ml-12 -mb-12"></div>

                                    <div className="flex items-center justify-between mb-6 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200">
                                                <FiFilter className="text-white text-xl" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-gray-800 tracking-tight leading-tight">
                                                    {expandedCategory} Collections
                                                </h3>
                                                <p className="text-sm text-gray-500 font-medium">Select a variety to explore</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setExpandedCategory(null)}
                                            className="p-3 hover:bg-white rounded-2xl text-gray-400 transition-all hover:text-gray-600 shadow-sm border border-transparent hover:border-gray-100"
                                        >
                                            <FiX size={24} />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-3 relative z-10">
                                        <button
                                            data-subcategory-button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSubcategoryClick(null, expandedCategory);
                                            }}
                                            className={`px-6 py-3 rounded-xl text-sm font-extrabold transition-all ${!selectedSubcategory && selectedCategory === expandedCategory
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                                : 'bg-white text-gray-600 border border-gray-100 hover:border-primary-100 hover:bg-white hover:shadow-md'
                                                }`}
                                        >
                                            All {expandedCategory}
                                        </button>

                                        {categories.find(c => c.name === expandedCategory)?.subcategories.map((sub, idx) => (
                                            <button
                                                key={idx}
                                                data-subcategory-button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSubcategoryClick(sub, expandedCategory);
                                                }}
                                                className={`px-6 py-3 rounded-xl text-sm font-extrabold transition-all ${selectedSubcategory === sub && selectedCategory === expandedCategory
                                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                                    : 'bg-white text-gray-600 border border-gray-100 hover:border-primary-100 hover:bg-white hover:shadow-md'
                                                    }`}
                                            >
                                                {sub}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* IndiaMart Style Sidebar */}
                    <aside className="hidden lg:block w-72 flex-shrink-0 space-y-6">
                        {renderFilters()}
                    </aside>

                    {/* Product Listing Area */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-10 h-10 bg-primary-50 rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                                <p className="text-gray-500 font-bold mt-8 text-lg tracking-wide uppercase">Discovering Premium Goods...</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                                <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform rotate-12">
                                    <FiSearch className="text-4xl text-gray-200" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-800 mb-2">No matching gems found</h3>
                                <p className="text-gray-400 font-medium max-w-sm mx-auto">Try broadening your search or choosing a different category to see more products.</p>
                                {(selectedPriceRange || customPriceRange.min || customPriceRange.max) && (
                                    <button
                                        onClick={() => {
                                            setSelectedPriceRange(null);
                                            setCustomPriceRange({ min: '', max: '' });
                                        }}
                                        className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-primary-700 transition-all"
                                    >
                                        Clear Price Filter
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                                {filteredProducts.map((product) => (
                                    <motion.div
                                        key={product._id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                                        onClick={() => navigate(`/b2b/product/${product._id}`)}
                                        className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-fit"
                                    >
                                        {/* Image Container - Interactive Gallery */}
                                        <div
                                            className="relative aspect-square overflow-hidden bg-gray-50 border-b border-gray-50 group/image"
                                        >
                                            {/* Images */}
                                            {(product.coverImage || product.image) ? (
                                                <img
                                                    src={product.coverImage || product.image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : Array.isArray(product.images) && product.images.length > 0 ? (
                                                product.images.map((img, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={img}
                                                        alt={`${product.name} - ${idx + 1}`}
                                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${(activeImageIndices[product._id] || 0) === idx ? 'opacity-100 scale-105' : 'opacity-0'
                                                            }`}
                                                    />
                                                ))
                                            ) : (
                                                <img
                                                    src="https://via.placeholder.com/400x300?text=No+Image"
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}

                                            {/* Navigation Buttons (Only if multiple images) */}
                                            {Array.isArray(product.images) && product.images.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={(e) => handlePrevImage(e, product._id, product.images.length)}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm opacity-0 group-hover/image:opacity-100 transition-all z-30"
                                                    >
                                                        <FiChevronDown className="rotate-90 text-sm" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleNextImage(e, product._id, product.images.length)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm opacity-0 group-hover/image:opacity-100 transition-all z-30"
                                                    >
                                                        <FiChevronDown className="-rotate-90 text-sm" />
                                                    </button>
                                                </>
                                            )}

                                            {/* Image Indicators (Dots/Lines) */}
                                            {Array.isArray(product.images) && product.images.length > 1 && (
                                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20 opacity-0 group-hover/image:opacity-100 transition-opacity px-2">
                                                    {product.images.map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`h-1 rounded-full transition-all duration-300 shadow-sm ${(activeImageIndices[product._id] || 0) === idx
                                                                ? 'w-4 bg-white'
                                                                : 'w-1 bg-white/50'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary-600/90 backdrop-blur-sm rounded-md text-[7px] font-black text-white uppercase tracking-wider shadow-sm z-20 pointer-events-none">
                                                {product.itemType === 'lotslot' ? 'Bulk Lot' : 'Bulk'}
                                            </div>
                                            <div className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 z-20 pointer-events-none">
                                                <div className="flex items-baseline gap-0.5">
                                                    <span className="text-[8px] font-black text-primary-600">₹</span>
                                                    <span className="text-sm font-black text-gray-800">{product.price}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content Body - Ultra Compact */}
                                        <div className="p-2.5 flex flex-col gap-2">
                                            <div className="min-w-0">
                                                <h3 className="text-[11px] font-black text-gray-800 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase leading-tight">
                                                    {product.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                                                        {product.subcategory || product.attributes?.find(a => a.name === 'subcategory')?.value || 'General'}
                                                    </p>
                                                    {product.vendorId?.address?.city && (
                                                        <span className="text-[8px] text-gray-300 font-bold">• {product.vendorId.address.city}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Info Row: MOQ and Vendor */}
                                            <div className="flex items-center justify-between gap-2 bg-gray-50/50 p-1.5 rounded-lg border border-gray-50">
                                                <div className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase">
                                                    <FiTruck className="text-primary-500" size={10} />
                                                    <span>Min. {product.moq || 1} {product.unit || 'pcs'}</span>
                                                </div>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (product.vendorId?._id) {
                                                            navigate(`/b2b/vendor/${product.vendorId._id}`);
                                                        }
                                                    }}
                                                    className="text-[7px] font-black text-primary-400 hover:text-primary-600 truncate max-w-[60px] uppercase cursor-pointer transition-colors"
                                                >
                                                    {product.vendorId?.storeName || 'Vendor'}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 mt-1">
                                                {product.vendorId?.phone ? (
                                                    <>
                                                        <a
                                                            href={`https://wa.me/${product.vendorId.phone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                trackContactClick(product.vendorId?._id, 'whatsapp');
                                                            }}
                                                            className="flex-1 py-1.5 bg-green-50 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-white transition-all border border-green-100 flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                                            title="WhatsApp"
                                                        >
                                                            <FaWhatsapp size={11} />
                                                            <span>WhatsApp</span>
                                                        </a>
                                                        <a
                                                            href={`tel:${product.vendorId?.phone}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                trackContactClick(product.vendorId?._id, 'call');
                                                            }}
                                                            className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                                            title="Call Vendor"
                                                        >
                                                            <FiPhone size={11} />
                                                            <span>Call</span>
                                                        </a>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/b2b/product/${product._id}`);
                                                        }}
                                                        className="w-full py-1.5 bg-primary-50 text-primary-600 rounded-lg font-black text-[9px] uppercase tracking-wider border border-primary-100"
                                                    >
                                                        View Details
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main >

            <AnimatePresence>
                {isMobileFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileFilterOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] lg:hidden"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-[101] lg:hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                        <FiFilter size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-900">Filters</h3>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Refine your search</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <FiX size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
                                {renderFilters()}
                            </div>
                            <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0">
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all active:scale-95"
                                >
                                    Show Results
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <B2BBottomNav />
        </div >
    );
};

export default ProductCatalog;
