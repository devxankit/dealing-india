import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSearch, FiMessageSquare, FiTruck, FiShield, FiX, FiSend, FiChevronDown } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import B2BBanner from '../components/B2BBanner';
import api from '../../../shared/utils/api';
import chatService from '../../../shared/services/chatService';
import { useAuthStore } from '../../../shared/store/authStore';
import { debounce } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';

const ProductCatalog = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuthenticated } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const [b2bVendors, setB2bVendors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const categoryDropdownRefs = useRef({}); // Refs for each category dropdown
    const [selectedState, setSelectedState] = useState('All States');
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [availableStates, setAvailableStates] = useState([]);
    const [availableCities, setAvailableCities] = useState([]);
    const [locationsLoading, setLocationsLoading] = useState(false);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const cityDropdownRef = useRef(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
    const [selectedPriceRange, setSelectedPriceRange] = useState(null);
    const [customPriceRange, setCustomPriceRange] = useState({ min: '', max: '' });
    const [businessCredentials, setBusinessCredentials] = useState({ gst: false, turnover: false });
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [selectedFabric, setSelectedFabric] = useState(null);
    const [openFilters, setOpenFilters] = useState({
        price: true,
        pattern: false, // Default closed to save space
        fabric: false
    });

    const toggleFilter = (section) => {
        setOpenFilters(prev => ({ ...prev, [section]: !prev[section] }));
    };


    // Define functions before useEffect hooks that use them
    const fetchAvailableLocations = async () => {
        setLocationsLoading(true);
        try {
            const response = await api.get('/public/b2b-locations');
            if (response.success && response.data) {
                const states = (response.data.states || []).map(state => ({
                    ...state,
                    name: (state.name || '').trim() // Ensure state names are trimmed
                }));
                console.log('📍 Frontend - Received states:', states.length);
                states.forEach(state => {
                    console.log(`  State: "${state.name}" - Cities: ${state.cities?.length || 0}`, state.cities?.slice(0, 3));
                });
                setAvailableStates(states);
            } else {
                console.warn('⚠️ No states data received');
                setAvailableStates([]);
            }
        } catch (error) {
            console.error('❌ Error fetching locations:', error);
            setAvailableStates([]);
        } finally {
            setLocationsLoading(false);
        }
    };

    const handleStateChange = (selectedValue) => {
        // Backend already returns clean state names, so use directly
        console.log('🔄 handleStateChange called with:', selectedValue);
        console.log('📋 Available states count:', availableStates.length);
        console.log('📋 Available states:', availableStates.map(s => `"${(s.name || '').trim()}"`));

        setSelectedCity('All Cities');

        if (selectedValue === 'All States' || !selectedValue || selectedValue.trim() === '') {
            console.log('✅ Setting to All States');
            setSelectedState('All States');
            setAvailableCities([]);
            return;
        }

        // Find state by exact match (trimmed) - backend already returns clean names
        const trimmedSelected = (selectedValue || '').trim();
        console.log('🔍 Looking for state:', `"${trimmedSelected}"`);

        const stateData = availableStates.find(s => {
            const stateName = (s.name || '').trim();
            const matches = stateName === trimmedSelected;
            if (matches) {
                console.log('✅ Found match:', stateName);
            }
            return matches;
        });

        if (!stateData) {
            console.error('❌ State not found!');
            console.error('  Searched for:', `"${trimmedSelected}"`);
            console.error('  Available states:', availableStates.map(s => `"${(s.name || '').trim()}"`));
            // Don't set an invalid state - keep current or reset to All States
            setSelectedState('All States');
            setAvailableCities([]);
            return;
        }

        // Set selected state - use the exact name from stateData to ensure matching
        const exactStateName = (stateData.name || '').trim();
        console.log('✅ Setting selectedState to:', `"${exactStateName}"`);
        console.log('📊 Cities in state data:', stateData.cities?.length || 0);

        setSelectedState(exactStateName);

        // Process cities - backend already returns clean cities, but do final cleanup
        console.log('🔍 Processing cities for state:', exactStateName);
        console.log('🔍 Raw cities data:', stateData.cities);
        console.log('🔍 Cities is array?', Array.isArray(stateData.cities));
        console.log('🔍 Cities length:', stateData.cities?.length || 0);

        if (stateData.cities && Array.isArray(stateData.cities) && stateData.cities.length > 0) {
            const stateName = exactStateName;

            // Final cleanup of cities - remove any remaining state names or pincodes
            // BUT be less aggressive - only filter obvious issues
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

            console.log('🏙️ Cities after processing:', cleanedCities.length);
            console.log('🏙️ First 10 cities:', cleanedCities.slice(0, 10));

            if (cleanedCities.length > 0) {
                setAvailableCities(cleanedCities);
                console.log('✅ Cities set successfully!');
            } else {
                console.warn('⚠️ All cities were filtered out! Using original cities.');
                // If all cities were filtered, use original cities (less filtered)
                const fallbackCities = stateData.cities
                    .filter(city => city && typeof city === 'string' && city.trim().length > 0 && !/^\d+$/.test(city.trim()))
                    .map(city => city.trim());
                console.log('🔄 Fallback cities:', fallbackCities.length, fallbackCities.slice(0, 5));
                setAvailableCities(fallbackCities);
            }
        } else {
            console.warn('⚠️ No cities found for state:', exactStateName);
            console.warn('  stateData:', stateData);
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

    // Read search query and city from URL on mount
    useEffect(() => {
        const urlSearch = searchParams.get('search');
        const urlCity = searchParams.get('city');

        if (urlSearch) {
            setSearchQuery(urlSearch);
        }
        if (urlCity) {
            setSelectedCity(urlCity);
        }
    }, [searchParams]);

    useEffect(() => {
        const init = async () => {
            await fetchAvailableLocations();
            await fetchB2BVendors();
            await fetchB2BProducts();
        };
        init();
    }, []);

    // Close city dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
                setIsCityDropdownOpen(false);
            }
        };

        if (isCityDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCityDropdownOpen]);

    // Update categories when products change
    useEffect(() => {
        if (products.length > 0) {
            fetchB2BCategories();
        }
    }, [products]);

    // Recheck inquiries when modal closes (in case inquiry was just sent)


    // Refetch products when location filters change
    useEffect(() => {
        fetchB2BProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedState, selectedCity]);

    // Debug: Log state and cities changes
    useEffect(() => {
        console.log('🔍 useEffect - selectedState changed to:', `"${selectedState}"`);
        console.log('🔍 useEffect - availableCities count:', availableCities.length);
        console.log('🔍 useEffect - availableCities:', availableCities.slice(0, 5));
        console.log('🔍 useEffect - locationsLoading:', locationsLoading);
        console.log('🔍 useEffect - City dropdown should be:',
            selectedState === 'All States' || availableCities.length === 0 || locationsLoading ? 'DISABLED' : 'ENABLED'
        );

        // If state is selected but cities are empty, try to find cities again
        if (selectedState !== 'All States' && availableCities.length === 0 && !locationsLoading && availableStates.length > 0) {
            console.warn('⚠️ State selected but no cities! Trying to find cities again...');
            const stateData = availableStates.find(s => (s.name || '').trim() === selectedState);
            if (stateData && stateData.cities && stateData.cities.length > 0) {
                console.log('✅ Found cities in stateData, setting them:', stateData.cities.length);
                // Use cities directly without heavy filtering
                const directCities = stateData.cities
                    .filter(city => city && typeof city === 'string' && city.trim().length > 0)
                    .map(city => city.trim());
                if (directCities.length > 0) {
                    setAvailableCities(directCities);
                }
            }
        }

        // Validate that selectedState matches an available option
        if (selectedState !== 'All States' && availableStates.length > 0) {
            const isValidState = availableStates.some(s => (s.name || '').trim() === selectedState);
            if (!isValidState) {
                console.error('❌ INVALID STATE! selectedState does not match any available option!');
                console.error('  selectedState:', `"${selectedState}"`);
                console.error('  Available states:', availableStates.map(s => `"${(s.name || '').trim()}"`));
                // Reset to All States if invalid
                setSelectedState('All States');
                setAvailableCities([]);
            }
        }
    }, [selectedState, availableCities, locationsLoading, availableStates]);

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

                // Build subcategories list - show all subcategories from backend, don't filter by products
                // This ensures dropdown always shows all available subcategories
                const categoriesWithFilteredSubcategories = categoriesToShow.map(cat => {
                    // Always show all subcategories from the category definition
                    // Don't filter by products - let the product filtering happen when subcategory is selected
                    const subcategoriesToShow = cat.subcategories || [];

                    console.log(`Category: ${cat.name}, Subcategories:`, subcategoriesToShow);

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
    };

    const handleSubcategoryClick = (subcategoryName, categoryName) => {
        setSelectedCategory(categoryName);
        setSelectedSubcategory(subcategoryName);
        // Keep expandedCategory as categoryName so the card stays open for further filtering
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

        let matchesCategory = false;
        if (selectedCategory === 'All') {
            matchesCategory = true;
        } else {
            // Get category from attributes array (B2B products store category/subcategory in attributes)
            const categoryAttr = product.attributes?.find(attr =>
                (attr.name?.toLowerCase() === 'category' || attr.attributeName?.toLowerCase() === 'category')
            );
            const productCategory = (categoryAttr?.value || product.categoryId?.name || product.category || '').toString().trim();
            const targetCategory = selectedCategory.toString().trim();

            // Basic category match - must be exact (case-insensitive)
            const categoryMatch = productCategory.toLowerCase() === targetCategory.toLowerCase();

            if (selectedSubcategory) {
                const subcategoryAttr = product.attributes?.find(attr =>
                    (attr.name?.toLowerCase() === 'subcategory' || attr.attributeName?.toLowerCase() === 'subcategory')
                );
                const productSubcategory = (subcategoryAttr?.value || '').toString().trim();
                const targetSubcategory = selectedSubcategory.toString().trim();

                matchesCategory = categoryMatch && (productSubcategory.toLowerCase() === targetSubcategory.toLowerCase());
            } else {
                matchesCategory = categoryMatch;
            }
        }

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

        // Attribute Filters (Pattern, Fabric, Color)
        const pAttrs = getProductAttributes(product);

        if (selectedPattern && !pAttrs.some(a => a.name === 'Pattern' && a.value === selectedPattern)) return false;
        if (selectedFabric && !pAttrs.some(a => a.name === 'Fabric' && a.value === selectedFabric)) return false;

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

            {/* B2B Banner Carousel removed */}

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Search & Filter Bar */}
                <div className="space-y-6 mb-10">
                    {/* Location Filters */}
                    <div className="flex gap-4 items-center">
                        {/* City Searchable Dropdown */}
                        <div className="relative flex-shrink-0 min-w-[200px]" ref={cityDropdownRef}>
                            <button
                                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                                disabled={locationsLoading}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium text-sm shadow-sm transition-all outline-none flex items-center justify-between gap-2"
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
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-[100] overflow-hidden"
                                    >
                                        <div className="p-3 border-b border-gray-50">
                                            <div className="relative">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Search city..."
                                                    className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
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
                                                className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-primary-50 ${selectedCity === 'All Cities' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
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
                                                        className={`w-full px-4 py-2.5 text-left text-xs font-medium transition-colors hover:bg-primary-50 ${selectedCity === city ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
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

                        {/* Horizontal Scrollable Cities List */}
                        <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            <button
                                onClick={() => setSelectedCity('All Cities')}
                                className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border ${selectedCity === 'All Cities'
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600 hover:shadow-md'
                                    }`}
                            >
                                All Cities
                            </button>
                            {uniqueCities.map((city, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedCity(city)}
                                    className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border ${selectedCity === city
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600 hover:shadow-md'
                                        }`}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar w-full">
                            <button
                                onClick={() => {
                                    setSelectedCategory('All');
                                    setExpandedCategory(null);
                                    setSelectedSubcategory(null);
                                }}
                                className={`px-6 py-2.5 rounded-xl whitespace-nowrap text-xs font-bold transition-all duration-300 ${selectedCategory === 'All' && !selectedSubcategory
                                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                                    : 'bg-white text-gray-500 border border-gray-100 hover:border-primary-100'
                                    }`}
                            >
                                All Products
                            </button>
                            {categories.filter(cat => cat.name !== 'All').map((cat) => {
                                const hasSubcategories = cat.subcategories && cat.subcategories.length > 0;
                                const isExpanded = expandedCategory === cat.name;
                                const isSelected = selectedCategory === cat.name;

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={(e) => handleCategoryClick(cat.name, e)}
                                        className={`px-6 py-2.5 rounded-xl whitespace-nowrap text-xs font-bold transition-all duration-300 flex items-center gap-2 ${isSelected
                                            ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                                            : 'bg-white text-gray-500 border border-gray-100 hover:border-primary-100'
                                            }`}
                                    >
                                        {cat.name}
                                        {hasSubcategories && (
                                            <FiChevronDown className={`text-xs transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
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
                    <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
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
                                                value={customPriceRange.min}
                                                onChange={(e) => {
                                                    setCustomPriceRange(prev => ({ ...prev, min: e.target.value }));
                                                    setSelectedPriceRange(null);
                                                }}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                placeholder="₹ max"
                                                value={customPriceRange.max}
                                                onChange={(e) => {
                                                    setCustomPriceRange(prev => ({ ...prev, max: e.target.value }));
                                                    setSelectedPriceRange(null);
                                                }}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                        <button className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
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
                                                            onChange={() => setSelectedPattern(pattern)}
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
                                                            onChange={() => setSelectedFabric(fabric)}
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
                                        {/* Image Container - More defined */}
                                        <div className="relative aspect-square overflow-hidden bg-gray-50 border-b border-gray-50">
                                            <img
                                                src={(Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : product.image || 'https://via.placeholder.com/400x300'}
                                                alt={product.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary-600/90 backdrop-blur-sm rounded-md text-[7px] font-black text-white uppercase tracking-wider shadow-sm">
                                                Bulk
                                            </div>
                                            <div className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100">
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
                                                        {product.attributes?.find(a => a.name === 'subcategory')?.value || 'General'}
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
                                                    <span>Min. {product.moq || 1}</span>
                                                </div>
                                                <div className="text-[7px] font-black text-gray-300 truncate max-w-[60px] uppercase">
                                                    {product.vendorId?.storeName || 'Vendor'}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 mt-1">
                                                {product.vendorId?.phone && (
                                                    <a
                                                        href={`https://wa.me/${product.vendorId.phone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex-1 py-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-green-50 hover:text-[#25D366] transition-all border border-gray-100 flex items-center justify-center gap-2 font-black text-[8px] uppercase tracking-widest"
                                                        title="WhatsApp"
                                                    >
                                                        <FaWhatsapp size={12} />
                                                        <span>Contact Vendor</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default ProductCatalog;
