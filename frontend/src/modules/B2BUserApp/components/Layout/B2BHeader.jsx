import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiMessageSquare, FiUser, FiArrowLeft, FiGrid, FiLayout } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { appLogo } from '../../../../data/logos';
import { debounce } from '../../../../shared/utils/helpers';
import api from '../../../../shared/utils/api';

const B2BHeader = ({ showBack = false, title = "Bulk Marketplace", sticky = true, searchQuery: propSearchQuery, onSearchChange, onSearchSubmit, hideSearch = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [localSearchQuery, setLocalSearchQuery] = useState(propSearchQuery || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Sync local state when prop changes
    useEffect(() => {
        if (propSearchQuery !== undefined) {
            setLocalSearchQuery(propSearchQuery);
        }
    }, [propSearchQuery]);

    // Create debounced search function
    const debouncedFetchSuggestions = React.useMemo(
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
        setLocalSearchQuery(value);
        if (onSearchChange) {
            onSearchChange(value);
        }

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
        setLocalSearchQuery(query);
        setShowSuggestions(false);

        if (onSearchSubmit) {
            onSearchSubmit(query);
        } else {
            navigate(`/b2b?search=${encodeURIComponent(query)}`);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const query = searchQuery.trim();

        if (onSearchSubmit) {
            // If parent component provides submit handler, use it
            onSearchSubmit(query);
        } else {
            // Otherwise, navigate to product catalog with search query
            if (query) {
                navigate(`/b2b?search=${encodeURIComponent(query)}`);
            } else {
                navigate('/b2b');
            }
        }
    };

    return (
        <header className={`${sticky ? 'sticky top-0' : 'relative'} z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm flex-shrink-0`}>
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {showBack ? (
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <FiArrowLeft className="text-xl text-gray-700" />
                        </button>
                    ) : (
                        title === "Business Dashboard" ? (
                            <Link to="/b2b/landing" className="flex-shrink-0">
                                <img
                                    src={appLogo.src}
                                    alt="Dealing India"
                                    className="h-10 w-auto object-contain"
                                />
                            </Link>
                        ) : title !== "Bulk Marketplace" && (
                            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
                                <FiGrid className="text-white text-xl" />
                            </div>
                        )
                    )}
                    {title === "Bulk Marketplace" ? (
                        <Link to="/b2b/landing" className="flex items-center gap-2">
                            <img
                                src={appLogo.src}
                                alt="Dealing India"
                                className="h-12 w-auto object-contain"
                            />
                        </Link>
                    ) : (
                        <h1 className="text-xl font-bold text-gray-800 truncate">
                            {title === "Business Dashboard" ? "Dashboard" : title}
                        </h1>
                    )}
                </div>

                {!hideSearch && (
                    <div className="flex-1 max-w-md hidden md:block">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="relative"
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onFocus={() => localSearchQuery.trim() && setShowSuggestions(true)}
                        >
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search bulk products, wholesalers..."
                                value={localSearchQuery}
                                onChange={handleSearchChange}
                                className="w-full pl-12 pr-4 py-2 bg-gray-50 border-none rounded-full focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                            />

                            {/* Suggestions Dropdown */}
                            <AnimatePresence>
                                {showSuggestions && (suggestions.length > 0 || isSearching) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 py-2"
                                    >
                                        {isSearching && suggestions.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
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
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 border border-gray-50">
                                                            <img src={suggestion.image} alt={suggestion.text} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-50 text-primary-600">
                                                            <FiSearch className="text-sm" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-gray-800 truncate">
                                                            {suggestion.text}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                            {suggestion.context}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <Link to="/b2b" className="p-2.5 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all" title="Business Dashboard">
                        <FiLayout className="text-xl" />
                    </Link>
                    <Link to="/b2b/inquiries" className="p-2.5 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all relative">
                        <FiMessageSquare className="text-xl" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </Link>
                    <Link to="/b2b/profile" className="p-2.5 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all">
                        <FiUser className="text-xl" />
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default B2BHeader;
