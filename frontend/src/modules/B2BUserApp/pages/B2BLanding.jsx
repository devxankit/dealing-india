import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiArrowRight, FiMenu, FiX, FiChevronDown, FiMapPin, FiShoppingBag } from 'react-icons/fi';
import { appLogo } from '../../../data/logos';
import B2BBanner from '../components/B2BBanner';
import api from '../../../shared/utils/api';
import { debounce } from '../../../shared/utils/helpers';

const B2BLanding = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [availableStates, setAvailableStates] = useState([]);
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const cityDropdownRef = useRef(null);
    const headerCityDropdownRef = useRef(null);
    const searchRef = useRef(null);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await api.get('/public/b2b-locations');
                if (response.success && response.data) {
                    setAvailableStates(response.data.states || []);
                }
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };
        fetchLocations();
    }, []);

    // Debounced suggestion fetch
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

    const handleSuggestionClick = (suggestion) => {
        const query = suggestion.text;
        setSearchQuery(query);
        setShowSuggestions(false);
        const params = new URLSearchParams();
        params.append('search', query);
        if (selectedCity !== 'All Cities') params.append('city', selectedCity);
        navigate(`/b2b/catalog?${params.toString()}`);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
                setIsCityDropdownOpen(false);
            }
            if (headerCityDropdownRef.current && !headerCityDropdownRef.current.contains(event.target)) {
                // We'll reuse the same state for both city dropdowns for simplicity or separate if needed
                // For now, let's keep it robust
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const uniqueCities = availableStates
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

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (selectedCity !== 'All Cities') params.append('city', selectedCity);
        navigate(`/b2b/catalog?${params.toString()}`);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* Sticky Header - REFINED */}
            <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center gap-4 md:gap-8">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => navigate('/b2b/landing')}>
                        <div className="h-8 md:h-10">
                            <img
                                src={appLogo.src}
                                alt={appLogo.alt}
                                className="h-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Header City & Search Container */}
                    <div className="flex-1 flex items-center bg-gray-50 rounded-full border border-gray-100 px-2 group focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all max-w-3xl hidden md:flex">
                        {/* City Selector in Header */}
                        <div className="relative" ref={headerCityDropdownRef}>
                            <button
                                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 border-r border-gray-200 hover:text-blue-600 transition-colors whitespace-nowrap"
                            >
                                <FiMapPin className="text-blue-500" />
                                <span className="max-w-[100px] truncate">{selectedCity}</span>
                                <FiChevronDown className={`transition-transform duration-200 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isCityDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60]"
                                    >
                                        <div className="p-3 border-b border-gray-50">
                                            <div className="relative">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Search city..."
                                                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border-none rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-blue-500"
                                                    value={citySearchQuery}
                                                    onChange={(e) => setCitySearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedCity('All Cities'); setIsCityDropdownOpen(false); }}
                                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-blue-50"
                                            >
                                                All Cities
                                            </button>
                                            {filteredCitiesList.map((city, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => { setSelectedCity(city); setIsCityDropdownOpen(false); }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-600 hover:bg-blue-50"
                                                >
                                                    {city}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Search Input in Header */}
                        <div className="flex-1 relative" ref={searchRef}>
                            <form onSubmit={handleSearchSubmit} className="flex items-center">
                                <input
                                    type="text"
                                    placeholder="Search brands, products or wholesalers..."
                                    className="w-full bg-transparent py-2.5 px-4 rounded-full text-sm font-medium outline-none"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                                />
                                <button type="submit" className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all mr-1">
                                    <FiSearch size={16} />
                                </button>
                            </form>

                            {/* Suggestions Dropdown */}
                            <AnimatePresence>
                                {showSuggestions && (suggestions.length > 0 || isSearching) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60] py-2"
                                    >
                                        {isSearching && suggestions.length === 0 ? (
                                            <div className="px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                                                <div className="w-3 h-3 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                                Searching...
                                            </div>
                                        ) : (
                                            suggestions.map((suggestion, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors group"
                                                >
                                                    {suggestion.type === 'product' ? (
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 border border-gray-50 flex-shrink-0">
                                                            <img src={suggestion.image} alt={suggestion.text} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 flex-shrink-0">
                                                            <FiSearch className="text-xs" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-bold text-gray-800 truncate">
                                                            {suggestion.text}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                            {suggestion.context}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Single Action Button */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => navigate('/b2b/catalog')}
                            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white font-black rounded-full shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap text-xs md:text-sm"
                        >
                            <FiShoppingBag className="hidden md:block" />
                            Shop Now
                        </button>

                        <button
                            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Toggle Menu"
                        >
                            {isMenuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Search Bar - ALWAYS VISIBLE ONLY ON MOBILE */}
                <div className="md:hidden border-t border-gray-50 bg-white px-4 py-3 relative">
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products, brands..."
                            className="w-full bg-gray-50 border border-gray-100 py-2.5 pl-11 pr-4 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                        />
                    </form>

                    {/* Mobile Suggestions Dropdown */}
                    <AnimatePresence>
                        {showSuggestions && (suggestions.length > 0 || isSearching) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-4 right-4 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60] py-2"
                            >
                                {isSearching && suggestions.length === 0 ? (
                                    <div className="px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                        Searching...
                                    </div>
                                ) : (
                                    suggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 flex-shrink-0">
                                                <FiSearch className="text-xs" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-gray-800 truncate">
                                                    {suggestion.text}
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                    {suggestion.context}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Mobile Tablet Expanded Menu */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-white border-b border-gray-100 overflow-hidden shadow-xl"
                        >
                            <div className="p-4 space-y-6 bg-gray-50/50">
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Actions</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => { navigate('/b2b/login'); setIsMenuOpen(false); }}
                                            className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-100 text-gray-700 font-bold rounded-2xl text-sm shadow-sm active:scale-95 transition-all"
                                        >
                                            Log In
                                        </button>
                                        <button
                                            onClick={() => { navigate('/b2b/catalog'); setIsMenuOpen(false); }}
                                            className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-blue-100 active:scale-95 transition-all"
                                        >
                                            Browse All
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 pb-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Location</p>
                                    <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                                        <button
                                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                                            className="w-full flex items-center justify-between p-3 text-sm font-bold text-gray-700"
                                        >
                                            <div className="flex items-center gap-3 text-blue-600">
                                                <FiMapPin />
                                                <span>{selectedCity}</span>
                                            </div>
                                            <FiChevronDown className={isCityDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                        </button>

                                        {isCityDropdownOpen && (
                                            <div className="mt-2 border-t border-gray-50 pt-3 max-h-48 overflow-y-auto px-2 custom-scrollbar">
                                                <button
                                                    onClick={() => { setSelectedCity('All Cities'); setIsCityDropdownOpen(false); }}
                                                    className="w-full text-left py-2 px-3 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-lg"
                                                >
                                                    All Cities
                                                </button>
                                                {uniqueCities.map(city => (
                                                    <button
                                                        key={city}
                                                        onClick={() => { setSelectedCity(city); setIsCityDropdownOpen(false); }}
                                                        className="w-full text-left py-2 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
                                                    >
                                                        {city}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Banner Section */}
            <main className="flex-1 bg-gray-50">
                <div className="w-full py-4 md:py-10">
                    <div className="max-w-7xl mx-auto md:px-4">
                        <B2BBanner />
                    </div>
                </div>

                {/* Mobile Features Bar (Responsive Addition) */}
                <div className="md:hidden bg-white border-y border-gray-100 py-6 px-4 mb-4 grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center text-center p-4 bg-blue-50/50 rounded-2xl">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mb-2 shadow-lg shadow-blue-100">
                            <FiShoppingBag className="text-xl" />
                        </div>
                        <p className="text-xs font-black text-gray-800 uppercase tracking-wider">Bulk Pricing</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-indigo-50/50 rounded-2xl">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center mb-2 shadow-lg shadow-indigo-100">
                            <FiMapPin className="text-xl" />
                        </div>
                        <p className="text-xs font-black text-gray-800 uppercase tracking-wider">Local Sourcing</p>
                    </div>
                </div>
            </main>

            {/* Sticky Footer */}
            <footer className="bg-white border-t border-gray-100 py-10 text-center">
                <div className="max-w-7xl mx-auto px-4">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 italic">Dealing India Wholesale Network</p>
                    <p className="text-xs text-gray-400 font-medium italic">© 2026 Dealing India. Connect. Source. Grow.</p>
                </div>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #ddd;
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #ccc;
        }
      `}} />
        </div>
    );
};

export default B2BLanding;
