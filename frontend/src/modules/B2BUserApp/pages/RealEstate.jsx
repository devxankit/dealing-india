import React, { useState, useEffect, useMemo } from 'react';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import RealEstateCard from '../components/RealEstateCard';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { useB2BLocationStore } from '../../../shared/store/b2bLocationStore';
import { FiFilter, FiSearch, FiX, FiCheck, FiMapPin, FiChevronDown, FiBriefcase, FiDollarSign, FiHome } from 'react-icons/fi';

const RealEstate = () => {
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [selectedBusinessType, setSelectedBusinessType] = useState('All');
    const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [appliedPrice, setAppliedPrice] = useState({ min: '', max: '' });
    const [sizeRange, setSizeRange] = useState({ min: '', max: '' });
    const [appliedSize, setAppliedSize] = useState({ min: '', max: '' });
    const [selectedPriceUnit, setSelectedPriceUnit] = useState('All');
    const [selectedAreaUnit, setSelectedAreaUnit] = useState('Sq. Ft.');
    const [selectedListingType, setSelectedListingType] = useState('All');
    const [selectedArea, setSelectedArea] = useState('All Areas');
    const [selectedMarket, setSelectedMarket] = useState('All Markets');
    const [availableMarkets, setAvailableMarkets] = useState([]);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    const { states: availableStates, areas: availableAreas, markets: availableMarketsFromStore, initialize: fetchLocations } = useB2BLocationStore();
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [areaSearchQuery, setAreaSearchQuery] = useState('');
    const [marketSearchQuery, setMarketSearchQuery] = useState('');
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
    const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);

    const [openSections, setOpenSections] = useState({
        listingType: false,
        businessType: false,
        city: false,
        area: false,
        market: false,
        budget: false,
        size: false
    });

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const params = {
                type: selectedBusinessType === 'All' ? '' : selectedBusinessType.toLowerCase(),
                search: searchQuery,
                city: selectedCity === 'All Cities' ? '' : selectedCity,
                area: selectedArea === 'All Areas' ? '' : selectedArea,
                market: selectedMarket === 'All Markets' ? '' : selectedMarket,
                minPrice: appliedPrice.min,
                maxPrice: appliedPrice.max,
                minSize: appliedSize.min,
                maxSize: appliedSize.max,
                areaUnit: selectedAreaUnit,
                priceUnit: selectedPriceUnit === 'All' ? '' : selectedPriceUnit,
                listingType: selectedListingType
            };
            const response = await api.get('/property/all', { params });
            if (response?.success) {
                setProperties(response.data);

                // Extract unique markets from properties (vendor address.market) - fallback if store markets not available
                if (!availableMarketsFromStore || availableMarketsFromStore.length === 0) {
                    const marketsSet = new Set();
                    if (Array.isArray(response.data)) {
                        response.data.forEach(property => {
                            if (property.vendorId?.address?.market && property.vendorId.address.market.trim()) {
                                marketsSet.add(property.vendorId.address.market.trim());
                            }
                        });
                    }
                    setAvailableMarkets(Array.from(marketsSet).sort());
                }
            }
        } catch (error) {
            console.error('[Fetch Properties Error]:', error);
            toast.error('Failed to load properties');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchProperties();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedCity, selectedArea, selectedMarket, appliedPrice, appliedSize, selectedAreaUnit, selectedPriceUnit, selectedListingType, selectedBusinessType]);

    useEffect(() => {
        fetchLocations(false, {
            businessTypeFilter: 'include',
            businessTypes: ['Developer', 'Property Broker']
        });
    }, [fetchLocations]);

    // Update availableMarkets from store when it changes
    useEffect(() => {
        if (availableMarketsFromStore && availableMarketsFromStore.length > 0) {
            setAvailableMarkets(availableMarketsFromStore);
        }
    }, [availableMarketsFromStore]);

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
            const cityDropdown = document.querySelector('[data-city-dropdown]');
            const areaDropdown = document.querySelector('[data-area-dropdown]');
            const marketDropdown = document.querySelector('[data-market-dropdown]');

            if (cityDropdown && !cityDropdown.contains(target)) {
                setIsCityDropdownOpen(false);
            }
            if (areaDropdown && !areaDropdown.contains(target)) {
                setIsAreaDropdownOpen(false);
            }
            if (marketDropdown && !marketDropdown.contains(target)) {
                setIsMarketDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const cities = useMemo(() => {
        const cityList = availableStates?.flatMap(state => state.cities || []) || [];
        return ['All Cities', ...cityList.filter((city, index, self) => self.indexOf(city) === index).sort()];
    }, [availableStates]);

    const filteredCities = useMemo(() => {
        if (!citySearchQuery) return cities;
        return cities.filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()));
    }, [cities, citySearchQuery]);

    const filteredAreas = useMemo(() => {
        if (!areaSearchQuery) return availableAreas;
        return availableAreas.filter(area => area.toLowerCase().includes(areaSearchQuery.toLowerCase()));
    }, [availableAreas, areaSearchQuery]);

    const filteredMarkets = useMemo(() => {
        const markets = availableMarketsFromStore || availableMarkets;
        if (!marketSearchQuery) return markets;
        return markets.filter(market => market.toLowerCase().includes(marketSearchQuery.toLowerCase()));
    }, [availableMarketsFromStore, availableMarkets, marketSearchQuery]);

    const handleApplyPrice = () => {
        setAppliedPrice(priceRange);
        setIsPriceFilterOpen(false);
        setIsMobileFilterOpen(false);
    };

    const handleApplySize = () => {
        setAppliedSize(sizeRange);
        setIsMobileFilterOpen(false);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedCity('All Cities');
        setSelectedArea('All Areas');
        setSelectedListingType('All');
        setSelectedBusinessType('All');
        setSelectedPriceUnit('All');
        setSelectedAreaUnit('Sq. Ft.');
        setPriceRange({ min: '', max: '' });
        setAppliedPrice({ min: '', max: '' });
        setSizeRange({ min: '', max: '' });
        setAppliedSize({ min: '', max: '' });
    };

    const renderFilters = (showCity = true) => (
        <div className="space-y-6">
            {/* Listing Type Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('listingType')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Listing Type</h3>
                    <FiChevronDown className={`text-gray-400 transition-transform ${openSections.listingType ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {openSections.listingType && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 space-y-2">
                                {['All', 'Sale', 'Rent', 'Lease'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedListingType(type)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${selectedListingType === type
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                                            : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Business Type Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('businessType')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Property By</h3>
                    <FiChevronDown className={`text-gray-400 transition-transform ${openSections.businessType ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {openSections.businessType && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 space-y-2">
                                {['All', 'Developer', 'Broker'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedBusinessType(type)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${selectedBusinessType === type
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                                            : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {type === 'All' ? 'All Providers' : type}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* City Filter */}
            {showCity && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                        onClick={() => toggleSection('city')}
                        className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">City</h3>
                        <div className="flex items-center gap-2">
                            {selectedCity !== 'All Cities' && (
                                <span className="text-[10px] font-bold text-primary-600">{selectedCity}</span>
                            )}
                            <FiChevronDown className={`text-gray-400 transition-transform ${openSections.city ? 'rotate-180' : ''}`} />
                        </div>
                    </button>
                    <AnimatePresence>
                        {openSections.city && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 border-b border-gray-50">
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                        <input
                                            type="text"
                                            placeholder="Search city..."
                                            className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                            value={citySearchQuery}
                                            onChange={(e) => setCitySearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    <button
                                        onClick={() => {
                                            setSelectedCity('All Cities');
                                            setCitySearchQuery('');
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedCity === 'All Cities' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                    >
                                        All Cities
                                    </button>
                                    {filteredCities.map(city => (
                                        <button
                                            key={city}
                                            onClick={() => {
                                                setSelectedCity(city);
                                                setCitySearchQuery('');
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedCity === city ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                        >
                                            {city}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Area Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('area')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Area</h3>
                    <div className="flex items-center gap-2">
                        {selectedArea !== 'All Areas' && (
                            <span className="text-[10px] font-bold text-primary-600">{selectedArea}</span>
                        )}
                        <FiChevronDown className={`text-gray-400 transition-transform ${openSections.area ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                <AnimatePresence>
                    {openSections.area && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 border-b border-gray-50">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                    <input
                                        type="text"
                                        placeholder="Search area..."
                                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                        value={areaSearchQuery}
                                        onChange={(e) => setAreaSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => {
                                        setSelectedArea('All Areas');
                                        setAreaSearchQuery('');
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedArea === 'All Areas' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                >
                                    All Areas
                                </button>
                                {filteredAreas.map(area => (
                                    <button
                                        key={area}
                                        onClick={() => {
                                            setSelectedArea(area);
                                            setAreaSearchQuery('');
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedArea === area ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                    >
                                        {area}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Market Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('market')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Market</h3>
                    <div className="flex items-center gap-2">
                        {selectedMarket !== 'All Markets' && (
                            <span className="text-[10px] font-bold text-primary-600">{selectedMarket}</span>
                        )}
                        <FiChevronDown className={`text-gray-400 transition-transform ${openSections.market ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                <AnimatePresence>
                    {openSections.market && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 border-b border-gray-50">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                    <input
                                        type="text"
                                        placeholder="Search market..."
                                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                        value={marketSearchQuery}
                                        onChange={(e) => setMarketSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => {
                                        setSelectedMarket('All Markets');
                                        setMarketSearchQuery('');
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedMarket === 'All Markets' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                >
                                    All Markets
                                </button>
                                {filteredMarkets.length > 0 ? (
                                    filteredMarkets.map(market => (
                                        <button
                                            key={market}
                                            onClick={() => {
                                                setSelectedMarket(market);
                                                setMarketSearchQuery('');
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedMarket === market ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                        >
                                            {market}
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-4 py-6 text-center text-[10px] text-gray-400 font-bold">
                                        {marketSearchQuery ? 'No markets found' : 'No markets available'}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Budget Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('budget')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Budget Range</h3>
                    <FiChevronDown className={`text-gray-400 transition-transform ${openSections.budget ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {openSections.budget && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-tighter">Denomination</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['All', 'Thousand', 'Lakh', 'Crore'].map(unit => (
                                            <button
                                                key={unit}
                                                onClick={() => setSelectedPriceUnit(unit)}
                                                className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all ${selectedPriceUnit === unit
                                                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                                                    : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-100'}`}
                                            >
                                                {unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Value {selectedPriceUnit !== 'All' ? `(${selectedPriceUnit}s)` : '(Lakhs)'}</p>
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={priceRange.min}
                                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={priceRange.max}
                                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                    />
                                    <button
                                        onClick={handleApplyPrice}
                                        className="w-full py-3 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all mt-2"
                                    >
                                        Apply Budget
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Size Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('size')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Area ({selectedAreaUnit})</h3>
                    <FiChevronDown className={`text-gray-400 transition-transform ${openSections.size ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {openSections.size && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-tighter">Unit</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'].map(unit => (
                                            <button
                                                key={unit}
                                                onClick={() => setSelectedAreaUnit(unit)}
                                                className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all ${selectedAreaUnit === unit
                                                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                                                    : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-100'}`}
                                            >
                                                {unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Value ({selectedAreaUnit})</p>
                                    <input
                                        type="number"
                                        placeholder={`Min ${selectedAreaUnit}`}
                                        value={sizeRange.min}
                                        onChange={(e) => setSizeRange({ ...sizeRange, min: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder={`Max ${selectedAreaUnit}`}
                                        value={sizeRange.max}
                                        onChange={(e) => setSizeRange({ ...sizeRange, max: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                    />
                                    <button
                                        onClick={handleApplySize}
                                        className="w-full py-3 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all"
                                    >
                                        Apply Size
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Real Estate Hub" />

            {/* Premium Sticky Filter Bar */}
            <div className="sticky top-[65px] z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all py-3 md:py-4 mb-6 md:mb-10">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-3">
                        {/* Search Area */}
                        <div className="flex-1 relative group">
                            <FiSearch className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-primary-600 z-10 group-focus-within:scale-110 transition-transform" />
                            <input
                                type="text"
                                placeholder="Search by property title, area or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 md:pl-14 pr-6 py-3.5 md:py-4 bg-gray-50 border-none rounded-2xl md:rounded-[1.5rem] shadow-inner text-xs md:text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary-100 outline-none transition-all placeholder:text-gray-300"
                            />
                        </div>

                        {/* Mobile Filter Toggle */}
                        <button
                            onClick={() => setIsMobileFilterOpen(true)}
                            className="lg:hidden w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-primary-600 shadow-sm relative"
                        >
                            <FiFilter size={20} />
                            {(selectedListingType !== 'All' || selectedCity !== 'All Cities' || selectedArea !== 'All Areas' || selectedMarket !== 'All Markets' || selectedBusinessType !== 'All' || appliedPrice.min || appliedPrice.max) && (
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Filter Drawer */}
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
                                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-900 leading-none mb-1">Filter Properties</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Refine Hub Results</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <FiX size={20} className="text-gray-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                {renderFilters()}
                            </div>
                            <div className="p-6 border-t border-gray-100">
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary-700 shadow-xl shadow-primary-100"
                                >
                                    Show Results
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Location Filters - Replaces Sidebar City Filter */}
                <div className="hidden lg:flex flex-col md:flex-row gap-4 items-stretch md:items-center mb-6">
                    {/* City Searchable Dropdown */}
                    <div className="relative w-full md:w-64" data-city-dropdown>
                        <button
                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
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

                                        {filteredCities.filter(c => c !== 'All Cities').length > 0 ? (
                                            filteredCities.filter(c => c !== 'All Cities').map((city, index) => (
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
                        {cities.filter(c => c !== 'All Cities').slice(0, 15).map((city, index) => (
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

                {/* layout container */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filter Sidebar */}
                    <aside className="hidden lg:block w-72 flex-shrink-0 space-y-6">
                        {renderFilters(false)}
                    </aside>

                    {/* Listing Area */}
                    <div className="flex-1">
                        {/* Active Filter Tags */}
                        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="w-12 h-[2px] bg-primary-600 rounded-full"></span>
                                    <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.4em]">Integrated Marketplace</span>
                                </div>
                                <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
                                    Indian <span className="text-primary-600">Real Estate</span> Hub
                                </h2>
                                <div className="flex items-center gap-4 text-gray-400 text-[11px] font-black uppercase tracking-widest">
                                    <span>{properties.length} Verified Records Found</span>
                                    {selectedCity !== 'All Cities' && <span className="flex items-center gap-2 text-primary-600"><FiMapPin /> {selectedCity}</span>}
                                    {selectedArea !== 'All Areas' && <span className="flex items-center gap-2 text-primary-600"><FiHome /> {selectedArea}</span>}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <AnimatePresence>
                                    {selectedBusinessType !== 'All' && (
                                        <motion.span
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="px-4 py-2 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                        >
                                            {selectedBusinessType}
                                            <FiX className="cursor-pointer hover:text-white/80 transition-colors" onClick={() => setSelectedBusinessType('All')} />
                                        </motion.span>
                                    )}
                                    {selectedListingType !== 'All' && (
                                        <motion.span
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                        >
                                            {selectedListingType}
                                            <FiX className="cursor-pointer hover:text-primary-400 transition-colors" onClick={() => setSelectedListingType('All')} />
                                        </motion.span>
                                    )}
                                    {selectedArea !== 'All Areas' && (
                                        <motion.span
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                        >
                                            {selectedArea}
                                            <FiX className="cursor-pointer hover:text-white/80 transition-colors" onClick={() => setSelectedArea('All Areas')} />
                                        </motion.span>
                                    )}
                                    {(appliedPrice.min || appliedPrice.max) && (
                                        <motion.span
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="px-4 py-2 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg shadow-primary-100"
                                        >
                                            ₹ {appliedPrice.min || '0'}L - {appliedPrice.max || '∞'}L
                                            <FiX className="cursor-pointer" onClick={() => { setPriceRange({ min: '', max: '' }); setAppliedPrice({ min: '', max: '' }); }} />
                                        </motion.span>
                                    )}
                                    {selectedPriceUnit !== 'All' && (
                                        <motion.span
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="px-4 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                        >
                                            {selectedPriceUnit}s
                                            <FiX className="cursor-pointer hover:text-white/80 transition-colors" onClick={() => setSelectedPriceUnit('All')} />
                                        </motion.span>
                                    )}
                                    {(appliedSize.min || appliedSize.max) && (
                                        <motion.span
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                        >
                                            {appliedSize.min || '0'} - {appliedSize.max || '∞'} {selectedAreaUnit}
                                            <FiX className="cursor-pointer" onClick={() => { setSizeRange({ min: '', max: '' }); setAppliedSize({ min: '', max: '' }); }} />
                                        </motion.span>
                                    )}
                                </AnimatePresence>

                                {(selectedListingType !== 'All' || selectedCity !== 'All Cities' || selectedArea !== 'All Areas' || selectedBusinessType !== 'All' || appliedPrice.min || appliedPrice.max || appliedSize.min || appliedSize.max || selectedPriceUnit !== 'All') && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-[10px] font-black text-gray-400 hover:text-primary-600 uppercase tracking-widest border-b-2 border-transparent hover:border-primary-600 pb-1 transition-all"
                                    >
                                        Reset All
                                    </button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="bg-white rounded-[2rem] h-[480px] shadow-sm animate-pulse flex flex-col overflow-hidden border border-gray-100">
                                        <div className="aspect-square bg-gray-50"></div>
                                        <div className="p-6 space-y-4">
                                            <div className="h-4 bg-gray-50 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-50 rounded w-1/2"></div>
                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                <div className="h-8 bg-gray-50 rounded-xl"></div>
                                                <div className="h-8 bg-gray-50 rounded-xl"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : properties.length > 0 ? (
                            <motion.div
                                layout
                                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                            >
                                {properties.map(property => (
                                    <RealEstateCard key={property._id} property={property} />
                                ))}
                            </motion.div>
                        ) : (
                            <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiSearch className="text-3xl text-gray-300" />
                                </div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">No Matching Properties</h3>
                                <p className="text-gray-400 font-medium max-w-xs mx-auto mt-2 uppercase text-[10px] tracking-widest">No properties match your current filters in {selectedCity}</p>
                                <button onClick={handleClearFilters} className="mt-6 px-8 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Reset All Filters</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default RealEstate;
