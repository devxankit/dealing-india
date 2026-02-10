import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiMessageSquare, FiUser, FiArrowLeft, FiGrid, FiLayout, FiTrendingUp, FiHome } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { appLogo } from '../../../../data/logos';
import { debounce } from '../../../../shared/utils/helpers';
import api from '../../../../shared/utils/api';
import { useAuthStore } from '../../../../shared/store/authStore';

const B2BHeader = ({ showBack = false, title = "Bulk Marketplace", sticky = true, searchQuery: propSearchQuery, onSearchChange, onSearchSubmit, hideSearch = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuthStore();
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
            navigate(`/b2b/catalog?search=${encodeURIComponent(query)}`);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const query = localSearchQuery.trim();

        if (onSearchSubmit) {
            // If parent component provides submit handler, use it
            onSearchSubmit(query);
        } else {
            // Otherwise, navigate to product catalog with search query
            if (query) {
                navigate(`/b2b/catalog?search=${encodeURIComponent(query)}`);
            } else {
                navigate('/b2b/catalog');
            }
        }
    };

    return (
        <header className={`${sticky ? 'sticky top-0' : 'relative'} z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm flex-shrink-0`}>
            <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-2 md:gap-4">
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                    {showBack && (
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <FiArrowLeft className="text-lg md:text-xl text-gray-700" />
                        </button>
                    )}

                    {(title === "Business Dashboard" ||
                        title === "Real Estate Hub" ||
                        title === "Real Estate Developers" ||
                        title === "Developer Properties" ||
                        title === "Verified Brokers" ||
                        title === "Become a Seller" ||
                        location.pathname.includes('/real-estate/property/')) && (
                            <Link to="/b2b/catalog" className="flex-shrink-0">
                                <img
                                    src={appLogo.src}
                                    alt="Dealing India"
                                    className="h-10 md:h-20 w-auto object-contain"
                                />
                            </Link>
                        )}

                    {title === "Bulk Marketplace" ||
                        title === "My Business Account" ||
                        title === "Company Profile" ||
                        title === "Personal Profile" ||
                        title === "Support & Help" ||
                        title === "Notifications" ? (
                        <Link
                            to={location.pathname === '/b2b/catalog' ? '/b2b/landing' : '/b2b/catalog'}
                            className="flex items-center gap-2"
                        >
                            <img
                                src={appLogo.src}
                                alt="Dealing India"
                                className="h-10 md:h-20 w-auto object-contain"
                            />
                        </Link>
                    ) : (
                        // Don't show text title for pages that already show logo
                        title !== "Business Dashboard" &&
                        title !== "Real Estate Hub" &&
                        title !== "Real Estate Developers" &&
                        title !== "Developer Properties" &&
                        title !== "Verified Brokers" &&
                        title !== "Become a Seller" &&
                        !location.pathname.includes('/real-estate/property/') && (
                            <h1 className="text-sm md:text-xl font-black text-gray-900 truncate uppercase tracking-tight">
                                {title}
                            </h1>
                        )
                    )}

                    {/* Desktop Extra Links Next to Logo */}
                    <div className="hidden xl:flex items-center gap-2 ml-2 md:ml-4">
                        <Link
                            to="/b2b/catalog?itemType=lotslot"
                            className="px-3 py-2 text-xs md:text-sm font-black text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap uppercase tracking-widest"
                        >
                            <FiTrendingUp size={16} /> Lot / SOT
                        </Link>
                        <Link
                            to="/b2b/real-estate"
                            className="px-3 py-2 text-xs md:text-sm font-black text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap uppercase tracking-widest"
                        >
                            <FiHome size={16} /> Real Estate
                        </Link>
                    </div>
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
                                placeholder="Search bulk products..."
                                value={localSearchQuery}
                                onChange={handleSearchChange}
                                className="w-full pl-12 pr-4 py-2 bg-gray-50 border-none rounded-full focus:ring-2 focus:ring-primary-500 transition-all text-sm font-medium"
                            />

                            <AnimatePresence>
                                {showSuggestions && (suggestions.length > 0 || isSearching) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
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
                                                    key={index} type="button"
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
                                                        <p className="text-sm font-bold text-gray-800 truncate">{suggestion.text}</p>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{suggestion.context}</p>
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

                <div className="flex items-center gap-2 md:gap-3">
                    {/* Become Seller */}
                    <Link
                        to="/b2b-vendor/register"
                        className="hidden lg:flex bg-black text-white px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors whitespace-nowrap"
                    >
                        Become Seller
                    </Link>

                    {/* Desktop Divider */}
                    <div className="h-6 w-px bg-gray-200 hidden lg:block mx-1"></div>

                    {/* Profile / Login */}
                    {isAuthenticated ? (
                        <Link to="/b2b/profile" className="flex items-center gap-2 hover:bg-gray-50 p-1 md:p-1.5 rounded-full transition-colors">
                            <div className="w-8 h-8 md:w-9 md:h-9 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 border border-primary-100 shadow-sm">
                                <FiUser size={16} className="md:size-[18px]" />
                            </div>
                            <span className="text-xs font-black text-gray-700 hidden md:block uppercase tracking-wider">Profile</span>
                        </Link>
                    ) : (
                        <Link
                            to="/b2b/login"
                            className="flex items-center gap-2 bg-primary-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default B2BHeader;
