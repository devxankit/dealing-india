import React, { useState, useEffect, useMemo } from 'react';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import RealEstateCard from '../components/RealEstateCard';
import { brokers } from '../../../data/brokers';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSearch, FiX, FiCheck, FiMapPin } from 'react-icons/fi';

const RealEstateBrokers = () => {
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [appliedPrice, setAppliedPrice] = useState({ min: '', max: '' });

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Get unique cities from brokers
    const cities = useMemo(() => {
        const extracted = brokers.map(b => b.location.split(',')[1]?.trim() || b.location.split(',')[0].trim());
        return ['All Cities', ...new Set(extracted)];
    }, []);

    const filteredBrokers = useMemo(() => {
        return brokers.filter(broker => {
            // City check
            const brokerCity = broker.location.split(',')[1]?.trim() || broker.location.split(',')[0].trim();
            const matchesCity = selectedCity === 'All Cities' || brokerCity === selectedCity;

            // Search logic: Title, Location, or Seller
            const matchesSearch =
                broker.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                broker.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                broker.sellerName.toLowerCase().includes(searchQuery.toLowerCase());

            // Price Filter logic: Inputs are in Lakhs
            const minVal = appliedPrice.min ? parseFloat(appliedPrice.min) * 100000 : 0;
            const maxVal = appliedPrice.max ? parseFloat(appliedPrice.max) * 100000 : Infinity;

            const propertyPrice = broker.priceValue || 0;

            const matchesPrice = propertyPrice >= minVal && propertyPrice <= maxVal;

            return matchesCity && matchesSearch && matchesPrice;
        });
    }, [searchQuery, selectedCity, appliedPrice]);

    const handleApplyPrice = () => {
        setAppliedPrice(priceRange);
        setIsPriceFilterOpen(false);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedCity('All Cities');
        setPriceRange({ min: '', max: '' });
        setAppliedPrice({ min: '', max: '' });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Property Brokers" />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Search and Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-10">
                    {/* Search Input */}
                    <div className="flex-[2] relative group">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search area, property name or broker expert..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary-100 outline-none text-sm font-medium transition-all"
                        />
                    </div>

                    {/* City Selector */}
                    <div className="flex-1 relative group">
                        <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-600 z-10" />
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary-100 outline-none text-sm font-bold text-gray-700 appearance-none cursor-pointer group-hover:bg-gray-50 transition-all"
                        >
                            {cities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>

                    {/* Price Filter Button & Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                            className={`px-6 py-4 rounded-2xl shadow-sm flex items-center gap-2 font-bold transition-all border ${(appliedPrice.min || appliedPrice.max)
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
                                }`}
                        >
                            <FiFilter />
                            <span>{(appliedPrice.min || appliedPrice.max) ? 'Budget Set' : 'Budget'}</span>
                        </button>

                        <AnimatePresence>
                            {isPriceFilterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-4 w-72 bg-white rounded-3xl shadow-2xl border border-gray-50 z-50 p-6"
                                >
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Budget Range (In Lakhs)</h4>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Min (Lakhs)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 20"
                                                value={priceRange.min}
                                                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-100 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Max (Lakhs)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 100"
                                                value={priceRange.max}
                                                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-100 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setPriceRange({ min: '', max: '' }); setAppliedPrice({ min: '', max: '' }); }}
                                            className="flex-1 py-3 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={handleApplyPrice}
                                            className="flex-[2] py-3 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <FiCheck /> Apply
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Header Section */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-none mb-2">Verified <span className="text-primary-600">Broker</span> Listings</h2>
                        <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">
                            {filteredBrokers.length} Properties Found in {selectedCity}
                        </p>
                    </div>
                    {/* Active Filter Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        {selectedCity !== 'All Cities' && (
                            <span className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black uppercase rounded-full border border-primary-100 flex items-center gap-2 shadow-sm">
                                <FiMapPin size={10} /> {selectedCity}
                                <FiX className="cursor-pointer" onClick={() => setSelectedCity('All Cities')} />
                            </span>
                        )}
                        {(appliedPrice.min || appliedPrice.max) && (
                            <span className="px-3 py-1 bg-primary-600 text-white text-[10px] font-black uppercase rounded-full flex items-center gap-2 shadow-lg shadow-primary-100">
                                Budget: ₹ {appliedPrice.min || '0'}L - {appliedPrice.max || '∞'}L
                                <FiX className="cursor-pointer" onClick={() => { setPriceRange({ min: '', max: '' }); setAppliedPrice({ min: '', max: '' }); }} />
                            </span>
                        )}
                    </div>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
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
                ) : filteredBrokers.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {filteredBrokers.map(broker => (
                            <RealEstateCard key={broker.id} property={broker} />
                        ))}
                    </motion.div>
                ) : (
                    <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiSearch className="text-3xl text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">No Results Found</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto mt-2 uppercase text-[10px] tracking-widest">Adjust your selection to find properties in {selectedCity}</p>
                        <button onClick={handleClearFilters} className="mt-6 px-8 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Reset All Search Filters</button>
                    </div>
                )}
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default RealEstateBrokers;
