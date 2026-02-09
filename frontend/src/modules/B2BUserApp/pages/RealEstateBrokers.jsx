import React, { useState, useEffect, useMemo } from 'react';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import RealEstateCard from '../components/RealEstateCard';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSearch, FiX, FiCheck, FiMapPin } from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';

const RealEstateBrokers = () => {
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [appliedPrice, setAppliedPrice] = useState({ min: '', max: '' });
    const [selectedListingType, setSelectedListingType] = useState('All');

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const params = {
                type: 'broker',
                search: searchQuery,
                city: selectedCity === 'All Cities' ? '' : selectedCity,
                minPrice: appliedPrice.min,
                maxPrice: appliedPrice.max,
                listingType: selectedListingType
            };
            const response = await api.get('/property/all', { params });
            if (response?.success) {
                setProperties(response.data);
            }
        } catch (error) {
            console.error('[Fetch Brokers Error]:', error);
            toast.error('Failed to load broker properties');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchProperties();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedCity, appliedPrice, selectedListingType]);

    const cities = useMemo(() => {
        return ['All Cities', 'Indore', 'Bhopal', 'Gurgaon', 'Mumbai', 'Delhi', 'Pune', 'Bangalore'];
    }, []);

    const handleApplyPrice = () => {
        setAppliedPrice(priceRange);
        setIsPriceFilterOpen(false);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedCity('All Cities');
        setSelectedListingType('All');
        setPriceRange({ min: '', max: '' });
        setAppliedPrice({ min: '', max: '' });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Verified Brokers" />

            {/* Premium Unified Filter Bar */}
            <div className="sticky top-[65px] z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all py-4 mb-10 overflow-visible">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                        {/* 1. Search Area */}
                        <div className="flex-1 relative group w-full">
                            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-600 z-10 group-focus-within:scale-110 transition-transform" />
                            <input
                                type="text"
                                placeholder="Search area, property or broker expert..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-[1.5rem] shadow-inner text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary-100 outline-none transition-all placeholder:text-gray-300"
                            />
                        </div>

                        {/* 2. Listing Type Segmented Control (Smaller) */}
                        <div className="flex bg-gray-100/80 p-1 rounded-xl w-full lg:w-auto">
                            {['All', 'Sale', 'Rent', 'Lease'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedListingType(type)}
                                    className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${selectedListingType === type
                                        ? 'bg-white text-primary-600 shadow-sm scale-[1.02]'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* Splitter */}
                        <div className="hidden lg:block w-px h-10 bg-gray-200 mx-1"></div>

                        {/* 3. City Selection */}
                        <div className="w-full lg:w-56 relative group">
                            <FiMapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-500 z-10" />
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full pl-14 pr-10 py-4 bg-gray-50 border-none rounded-[1.5rem] shadow-inner text-sm font-black text-gray-600 appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-primary-100 transition-all hover:bg-gray-100/50"
                            >
                                {cities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                                <FiFilter size={14} />
                            </div>
                        </div>

                        {/* 4. Budget Trigger */}
                        <div className="w-full lg:w-auto relative">
                            <button
                                onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                                className={`w-full lg:w-auto px-8 py-4 rounded-[1.5rem] shadow-sm flex items-center justify-center lg:justify-start gap-3 font-black text-[11px] uppercase tracking-widest transition-all border-2 ${(appliedPrice.min || appliedPrice.max)
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200'
                                    : 'bg-white text-gray-800 border-gray-100 hover:border-primary-100 hover:bg-gray-50 hover:shadow-md'
                                    }`}
                            >
                                <FiFilter className={(appliedPrice.min || appliedPrice.max) ? 'text-white' : 'text-primary-600'} />
                                <span>{(appliedPrice.min || appliedPrice.max) ? 'Budget Set' : 'Budget'}</span>
                            </button>

                            <AnimatePresence>
                                {isPriceFilterOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 15, scale: 0.9 }}
                                        className="absolute right-0 top-full mt-4 w-[320px] bg-white rounded-[2.5rem] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.15)] border border-gray-50 z-[60] p-8"
                                    >
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                                                <FiFilter size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing Range</h4>
                                                <p className="text-sm font-black text-gray-900">Define Budget (In Lakhs)</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5 mb-8">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Minimum</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="20"
                                                        value={priceRange.min}
                                                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                                        className="w-full pl-8 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Maximum</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="100"
                                                        value={priceRange.max}
                                                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                                                        className="w-full pl-8 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setPriceRange({ min: '', max: '' }); setAppliedPrice({ min: '', max: '' }); setIsPriceFilterOpen(false); }}
                                                className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                onClick={handleApplyPrice}
                                                className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary-700 shadow-xl shadow-primary-100 transition-all flex items-center justify-center gap-2"
                                            >
                                                <FiCheck /> Apply Budget
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Active Filter Tags */}
                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-12 h-[2px] bg-primary-600 rounded-full"></span>
                            <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.4em]">Expert Network</span>
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
                            Verified <span className="text-primary-600">Brokers</span>
                        </h2>
                        <div className="flex items-center gap-4 text-gray-400 text-[11px] font-black uppercase tracking-widest">
                            <span>{properties.length} Active Broker Portfolios</span>
                            {selectedCity !== 'All Cities' && <span className="flex items-center gap-2 text-primary-600"><FiMapPin /> {selectedCity}</span>}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <AnimatePresence>
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
                        </AnimatePresence>

                        {(selectedListingType !== 'All' || selectedCity !== 'All Cities' || appliedPrice.min || appliedPrice.max) && (
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-[2rem] h-[480px] shadow-sm animate-pulse flex flex-col overflow-hidden border border-gray-100">
                                <div className="aspect-square bg-gray-50"></div>
                                <div className="p-6 space-y-4">
                                    <div className="h-4 bg-gray-50 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-50 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : properties.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
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
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">No Matching Broker Listings</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto mt-2 uppercase text-[10px] tracking-widest">No properties match your selection in {selectedCity}</p>
                        <button onClick={handleClearFilters} className="mt-6 px-8 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Reset All Filters</button>
                    </div>
                )}
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default RealEstateBrokers;
