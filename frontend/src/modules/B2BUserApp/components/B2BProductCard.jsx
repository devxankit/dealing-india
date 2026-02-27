import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTruck, FiShield, FiPhone, FiMapPin, FiChevronDown, FiCheck, FiMail } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { getGoogleMapsUrl } from '../../../shared/utils/helpers';
import toast from '../../../shared/utils/toast';

const B2BProductCard = ({ product, viewMode = 'grid', trackContactClick, itemType }) => {
    const navigate = useNavigate();
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // Image logic for Product
    let allImages = [];
    allImages = [
        product.coverImage || product.image,
        ...(Array.isArray(product.images) ? product.images : [])
    ].filter(Boolean);

    const handleNextImage = (e) => {
        e.stopPropagation();
        setActiveImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const handlePrevImage = (e) => {
        e.stopPropagation();
        setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    const vid = product.vendorId?._id ?? product.vendorId?.id ?? product.vendorIdRef ?? product.vendorId;
    const vendorIdStr = vid ? String(vid) : null;
    const vendor = product.vendorId;

    // Prefer specific shopName from backend, fallback to shopUnit.name, then storeName
    const shopDisplayName = product.shopName || product.shopUnit?.name || vendor?.storeName || 'Vendor';

    const moqValue = product.formType === 'shop-listing'
        ? (product.items?.[0]?.moq ?? product.moq ?? product.minimumOrderQuantity)
        : (product.moq ?? product.minimumOrderQuantity);
    const unitDisplay = product.formType === 'shop-listing' && product.items?.length > 0
        ? (product.items[0].unit || product.unit || 'pcs')
        : (product.unit || 'pcs');

    const hasGst = Boolean(vendor?.gstNumber);
    const hasEmail = Boolean(vendor?.email);
    const hasMobile = Boolean(vendor?.phone);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
            onClick={() => navigate(`/b2b/product/${product._id}`)}
            className={`group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 cursor-pointer flex ${viewMode === 'grid' ? 'flex-col h-full' : 'flex-row items-center gap-6 p-4 h-fit'}`}
        >
            {/* Image Container - Interactive Gallery */}
            <div
                className={`relative ${viewMode === 'grid' ? 'aspect-square w-full' : 'w-48 h-48 flex-shrink-0 rounded-xl'} overflow-hidden bg-gray-50 border-b border-gray-50 group/image`}
            >
                {/* Images */}
                {allImages.length > 0 ? (
                    allImages.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt={`${product.name} - ${idx + 1}`}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${activeImageIndex === idx ? 'opacity-100 scale-105' : 'opacity-0'
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

                {/* Navigation Buttons & Indicators (Only if multiple images) */}
                {allImages.length > 1 && (
                    <>
                        {/* Prev / Next Arrows - always visible */}
                        <button
                            onClick={handlePrevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm transition-all z-30"
                        >
                            <FiChevronDown className="rotate-90 text-sm" />
                        </button>
                        <button
                            onClick={handleNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm transition-all z-30"
                        >
                            <FiChevronDown className="-rotate-90 text-sm" />
                        </button>

                        {/* Image Indicators (Dots/Lines) */}
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20 px-2">
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

                        {/* Image Counter Badge */}
                        <div className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md text-[8px] font-black text-white uppercase tracking-wider z-30">
                            {activeImageIndex + 1} / {allImages.length}
                        </div>
                    </>
                )}

                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary-600/90 backdrop-blur-sm rounded-md text-[7px] font-black text-white uppercase tracking-wider shadow-sm z-20 pointer-events-none">Bulk</div>
                <div className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 z-20 pointer-events-none">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-[8px] font-black text-primary-600">₹</span>
                        <span className="text-sm font-black text-gray-800">{product.price}</span>
                    </div>
                </div>
            </div>

            {/* Content Body - Ultra Compact */}
            <div className={`p-2.5 flex flex-col gap-2 ${viewMode === 'list' ? 'flex-1 justify-center' : 'flex-1'}`}>
                <div className="min-w-0">
                    <h3 className="text-[11px] font-black text-gray-800 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase leading-tight">
                        {product.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                            {product.subcategory || product.attributes?.find(a => a.name === 'subcategory')?.value || 'General'}
                        </p>
                        {vendor?.address?.city && (
                            <span className="text-[8px] text-gray-500 font-bold">• {vendor.address.city}</span>
                        )}
                    </div>
                </div>

                {/* Info Row: Unit and Vendor (no min order on catalog cards) */}
                <div className="flex items-center justify-between gap-2 bg-gray-50/50 p-1.5 rounded-lg border border-gray-50">
                    <div className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase">
                        <FiTruck className="text-primary-500" size={10} />
                        <span>{moqValue ? `MOQ ${moqValue} ${unitDisplay}` : unitDisplay}</span>
                    </div>
                    {vendorIdStr ? (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                const vendorUrl = itemType ? `/b2b/vendor/${vendorIdStr}?itemType=${itemType}` : `/b2b/vendor/${vendorIdStr}`;
                                navigate(vendorUrl);
                            }}
                            className="text-[7px] font-black text-primary-400 hover:text-primary-600 truncate max-w-[60px] uppercase cursor-pointer transition-colors select-none block"
                        >
                            {shopDisplayName}
                        </div>
                    ) : (
                        <span className="text-[7px] font-black text-gray-400 truncate max-w-[60px] uppercase">
                            {shopDisplayName}
                        </span>
                    )}
                </div>

                {/* Vendor Status Row: GST / Email / Mobile */}
                <div className="mt-1 px-1">
                    {/* Mobile: text + right check, like desktop but compact */}
                    <div className="md:hidden flex flex-wrap items-center gap-2">
                        <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full whitespace-nowrap shrink-0">
                            <span className="text-[8px] font-black text-gray-600 uppercase">GST</span>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={8} />
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full whitespace-nowrap shrink-0">
                            <span className="text-[8px] font-black text-gray-600 uppercase">Email</span>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={8} />
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full whitespace-nowrap shrink-0">
                            <span className="text-[8px] font-black text-gray-600 uppercase">Mobile</span>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={8} />
                            </span>
                        </div>
                    </div>
                    {/* Desktop: text + check badges */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-gray-500 uppercase">GST</span>
                            <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={10} />
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-gray-500 uppercase">Email</span>
                            <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={10} />
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-gray-500 uppercase">Mobile</span>
                            <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={10} />
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {vendor?.phone ? (
                        <>
                            <a
                                href={`https://wa.me/${vendor.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (trackContactClick && vendorIdStr) trackContactClick(vendorIdStr, 'whatsapp');
                                }}
                                className="flex-1 min-w-[30%] py-1.5 bg-green-50 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-white transition-all border border-green-100 flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                title="WhatsApp"
                            >
                                <FaWhatsapp size={11} />
                                <span className="hidden md:inline">WhatsApp</span>
                            </a>
                            <a
                                href={`tel:${vendor.phone}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (trackContactClick && vendorIdStr) trackContactClick(vendorIdStr, 'call');
                                }}
                                className="flex-1 min-w-[30%] py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                title="Call Vendor"
                            >
                                <FiPhone size={11} />
                                <span className="hidden md:inline">Call</span>
                            </a>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const mapsUrl = getGoogleMapsUrl(vendor);
                                    if (mapsUrl) {
                                        if (trackContactClick && vendorIdStr) trackContactClick(vendorIdStr, 'map');
                                        window.open(mapsUrl, '_blank');
                                    } else {
                                        toast.error('Location details not provided');
                                    }
                                }}
                                className="flex-1 min-w-[30%] py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all border border-orange-100 flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-wider"
                                title="Shop Location"
                            >
                                <FiMapPin size={11} />
                                <span className="hidden md:inline">Map</span>
                            </button>
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
    );
};

export default B2BProductCard;
