import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiMapPin, FiPhone, FiTruck, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { getGoogleMapsUrl } from '../../../shared/utils/helpers';
import toast from '../../../shared/utils/toast';

const B2BVendorCard = ({ vendor, viewMode = 'grid', trackContactClick, itemType, compact = false }) => {
    const navigate = useNavigate();
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const vendorIdStr = vendor._id || vendor.id;
    const isRealEstate = (vendor.businessType || '').toLowerCase().includes('developer') ||
        (vendor.businessType || '').toLowerCase().includes('broker') ||
        vendor.isRealEstate;
    const vendorLabel = isRealEstate ? 'Office' : 'Store';

    // Gallery logic matching Product Card
    const allImages = [
        vendor.storeLogo,
        ...(Array.isArray(vendor.shopUnit?.images) ? vendor.shopUnit.images.filter(img => img !== vendor.storeLogo) : [])
    ].filter(Boolean);

    const handleNextImage = (e) => {
        e.stopPropagation();
        setActiveImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const handlePrevImage = (e) => {
        e.stopPropagation();
        setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    const handleVendorClick = () => {
        const vendorUrl = itemType ? `/b2b/vendor/${vendorIdStr}?itemType=${itemType}` : `/b2b/vendor/${vendorIdStr}`;
        navigate(vendorUrl);
    };

    // Prefer shop name from ShopUnit or manual shopName field, fallback to registration storeName
    const displayStoreName = vendor.shopUnit?.name || vendor.shopName || vendor.storeName || vendor.name;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
            onClick={handleVendorClick}
            className={`group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 cursor-pointer flex ${viewMode === 'grid' ? (compact ? 'flex-col h-auto md:h-[260px]' : 'flex-col h-auto md:h-[320px]') : 'flex-row items-center gap-6 p-4 h-fit'}`}
        >
            {/* Image Container - Interactive Gallery matching Product Card */}
            <div
                className={`relative ${viewMode === 'grid' ? (compact ? 'w-full aspect-[4/3] md:h-[50%]' : 'w-full aspect-[4/3] md:h-[55%]') : 'w-48 h-48 flex-shrink-0 rounded-xl'} overflow-hidden bg-gray-50 border-b border-gray-50 group/image`}
            >
                {/* Images */}
                {allImages.length > 0 ? (
                    allImages.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt={`${displayStoreName} - ${idx + 1}`}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${activeImageIndex === idx ? 'opacity-100 scale-105' : 'opacity-0'
                                }`}
                        />
                    ))
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-primary-200">
                        <FiShoppingBag className="text-4xl" />
                        <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-primary-100">Verified</span>
                    </div>
                )}

                {/* Navigation Buttons (Only if multiple images) */}
                {allImages.length > 1 && (
                    <>
                        <button
                            onClick={handlePrevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm opacity-0 group-hover/image:opacity-100 transition-all z-30"
                        >
                            <FiChevronDown className="rotate-90 text-sm" />
                        </button>
                        <button
                            onClick={handleNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm opacity-0 group-hover/image:opacity-100 transition-all z-30"
                        >
                            <FiChevronDown className="-rotate-90 text-sm" />
                        </button>
                    </>
                )}

                {/* Indicator Dots */}
                {allImages.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20 opacity-0 group-hover/image:opacity-100 transition-opacity px-2">
                        {allImages.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1 rounded-full transition-all duration-300 shadow-sm ${activeImageIndex === idx
                                    ? 'w-4 bg-white'
                                    : 'w-1 bg-white/50'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary-600/90 backdrop-blur-sm rounded-md text-[7px] font-black text-white uppercase tracking-wider shadow-sm z-20 pointer-events-none">
                    Verified {vendorLabel}
                </div>

                {(vendor.shopUnit?.minPrice || vendor.shopUnit?.maxPrice || vendor.minPrice || vendor.maxPrice) && (
                    <div className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 z-20 pointer-events-none">
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-[8px] font-black text-primary-600">₹</span>
                            <span className={`font-black text-gray-800 ${compact ? 'text-[10px]' : 'text-sm'}`}>
                                {vendor.shopUnit?.minPrice || vendor.minPrice}{vendor.shopUnit?.maxPrice || vendor.maxPrice ? `-${vendor.shopUnit?.maxPrice || vendor.maxPrice}` : '+'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Body - Matching Product Card Style */}
            <div className={`${compact ? 'p-2' : 'p-2.5'} flex flex-col ${compact ? 'gap-1' : 'gap-2'} ${viewMode === 'list' ? 'flex-1 justify-center' : 'flex-1'}`}>
                <div className="min-w-0">
                    <h3 className="text-[11px] font-black text-gray-800 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase leading-tight">
                        {displayStoreName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                            {vendor.businessType || ''}
                        </p>
                        {vendor.address?.city && (
                            <span className="text-[8px] text-gray-500 font-bold">• {vendor.address.city}</span>
                        )}
                    </div>
                    <p className="text-[9px] text-gray-600 font-medium line-clamp-2 mt-1 leading-tight">
                        {vendor.shopUnit?.description || vendor.storeDescription || ''}
                    </p>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between gap-2 bg-gray-50/50 p-1.5 rounded-lg border border-gray-50">
                    <div className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase">
                        <FiTruck className="text-primary-500" size={10} />
                        <span>{vendor.totalProducts || 0} {isRealEstate || itemType === 'realestate' ? 'Properties' : 'Products'}</span>
                    </div>
                    <div className="text-[7px] font-black text-primary-400 uppercase tracking-widest flex items-center gap-0.5">
                        Visit {vendorLabel} <FiChevronRight size={8} />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {vendor.phone ? (
                        <>
                            <a
                                href={`https://wa.me/${vendor.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (trackContactClick) trackContactClick(vendorIdStr, 'whatsapp');
                                }}
                                className="flex-1 min-w-[30%] py-1.5 bg-green-50 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-white transition-all border border-green-100 flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                            >
                                <FaWhatsapp size={12} />
                                {!compact && <span className="hidden md:inline">WhatsApp</span>}
                            </a>
                            <a
                                href={`tel:${vendor.phone}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (trackContactClick) trackContactClick(vendorIdStr, 'call');
                                }}
                                className="flex-1 min-w-[30%] py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                            >
                                <FiPhone size={12} />
                                {!compact && <span className="hidden md:inline">Call</span>}
                            </a>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const mapsUrl = getGoogleMapsUrl(vendor);
                                    if (mapsUrl) {
                                        if (trackContactClick) trackContactClick(vendorIdStr, 'map');
                                        window.open(mapsUrl, '_blank');
                                    } else {
                                        toast.error('Location details not provided');
                                    }
                                }}
                                className="flex-1 min-w-[30%] py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all border border-orange-100 flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                            >
                                <FiMapPin size={12} />
                                {!compact && <span className="hidden md:inline">Map</span>}
                            </button>
                        </>
                    ) : (
                        <button className="w-full py-1.5 bg-primary-50 text-primary-600 rounded-lg font-black text-[9px] uppercase tracking-wider border border-primary-100">
                            Visit {vendorLabel} Profile
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorCard;
