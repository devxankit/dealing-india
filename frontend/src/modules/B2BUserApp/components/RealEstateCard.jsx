import React from 'react';
import { motion } from 'framer-motion';
import { FiMapPin, FiPhone, FiHome, FiMaximize } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/utils/api';
import { getGoogleMapsUrl } from '../../../shared/utils/helpers';

const RealEstateCard = ({ property }) => {
    const navigate = useNavigate();

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

    // Helper to format price from backend
    const formatPrice = (p) => {
        if (!p) return 'Price on Request';

        const getMultiplier = (unit) => {
            switch (unit) {
                case 'Thousand': return 1000;
                case 'Lakh': return 100000;
                case 'Crore': return 10000000;
                default: return 1;
            }
        };

        const getUnitLabel = (unit) => {
            switch (unit) {
                case 'Thousand': return ' Thousand';
                case 'Lakh': return ' Lakh';
                case 'Crore': return ' Crore';
                default: return '';
            }
        };

        if (p.listingType === 'Sale') {
            if (p.saleDetails?.priceMin) {
                const min = p.saleDetails.priceMin;
                const max = p.saleDetails.priceMax;
                const unit = p.saleDetails.priceUnit || 'Lakh';
                const label = getUnitLabel(unit);
                if (max && max !== min) return `₹${min}-${max}${label}`;
                return `₹${min}${label} onwards`;
            }
        } else if (p.listingType === 'Rent' && p.rentDetails?.monthlyRent) {
            const unit = p.rentDetails.rentUnit || 'Thousand';
            const label = getUnitLabel(unit);
            return `₹${p.rentDetails.monthlyRent}${label}/mo`;
        } else if (p.listingType === 'Lease' && p.leaseDetails?.monthlyLeaseRate) {
            const unit = p.leaseDetails.leaseUnit || 'Lakh';
            const label = getUnitLabel(unit);
            return `₹${p.leaseDetails.monthlyLeaseRate}${label}/mo`;
        }

        if (p.price?.amount) return `₹${(p.price.amount / 100000).toFixed(1)}L`;
        return 'Price on Request';
    };

    const imageUrl = property.media?.[0]?.url || property.images?.[0] || '';
    const displayPrice = formatPrice(property);

    // Use vendor's registration location as requested
    const vendorAddress = property.vendorId?.address || {};
    const displayLocation = `${vendorAddress.area || vendorAddress.market || ''}, ${vendorAddress.city || ''}`.trim().replace(/^,/, '').trim();

    // Prefer specific shopName or shopUnit.name over registration storeName
    const sellerName = property.shopName || property.shopUnit?.name || property.vendorId?.storeName || property.vendorId?.name || '';
    const sellerPhone = property.vendorId?.phone || '';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            onClick={() => navigate(`/b2b/real-estate/property/${property._id}`)}
            className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
        >
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-gray-50 border-b border-gray-50">
                <img
                    src={imageUrl}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                    <div className="flex gap-1">
                        <div className="px-2 py-1 bg-primary-600/90 backdrop-blur-sm rounded-md text-[8px] font-black text-white uppercase tracking-wider shadow-sm w-fit">
                            {property.listingType || 'Sale'}
                        </div>
                        {property.vendorId?.businessType && (
                            <div className={`px-2 py-1 ${property.vendorId.businessType.toLowerCase().includes('developer') ? 'bg-indigo-600/90' : 'bg-emerald-600/90'} backdrop-blur-sm rounded-md text-[8px] font-black text-white uppercase tracking-wider shadow-sm w-fit`}>
                                {property.vendorId.businessType.toLowerCase().includes('developer') ? 'Developer' : 'Broker'}
                            </div>
                        )}
                    </div>
                    {property.status?.propertyStatus && (
                        <div className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md text-[8px] font-black text-gray-800 uppercase tracking-wider shadow-sm border border-gray-100 w-fit">
                            {property.status.propertyStatus}
                        </div>
                    )}
                </div>

                {/* Price Tag */}
                <div className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 z-10">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-sm font-black text-gray-800">{displayPrice}</span>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-3 flex flex-col gap-2.5 flex-1">
                <div className="min-w-0">
                    <h3 className="text-xs font-black text-gray-800 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase leading-tight">
                        {property.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <FiMapPin className="text-primary-600 text-[10px]" />
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                            {displayLocation}
                        </p>
                    </div>
                </div>

                {/* Info Row: Area and Seller */}
                <div className="grid grid-cols-2 gap-2 bg-gray-50/50 p-2 rounded-lg border border-gray-50">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase">
                        <FiMaximize className="text-primary-500" size={12} />
                        <span className="truncate">
                            {property.specifications?.builtUpArea
                                ? `${property.specifications.builtUpArea} ${property.specifications.builtUpAreaUnit === 'Sq. Ft.' ? 'Square Feet' :
                                    property.specifications.builtUpAreaUnit === 'Sq. Mt.' ? 'Square Meters' :
                                        property.specifications.builtUpAreaUnit === 'Sq. Yd.' ? 'Square Yards' :
                                            property.specifications.builtUpAreaUnit || 'Square Feet'
                                }`
                                : property.totalArea || 'N/A'
                            }
                        </span>
                    </div>
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            if (property.vendorId?._id) navigate(`/b2b/vendor/${property.vendorId._id}`);
                        }}
                        className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 hover:text-primary-600 cursor-pointer uppercase overflow-hidden"
                    >
                        <FiHome className="text-primary-500 flex-shrink-0" size={12} />
                        <span className="truncate">{sellerName}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-auto">
                    <a
                        href={`https://wa.me/91${sellerPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            e.stopPropagation();
                            trackContactClick(property.vendorId?._id, 'whatsapp');
                        }}
                        className="flex-1 py-2 bg-green-50 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-white transition-all border border-green-100 flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-wider"
                    >
                        <FaWhatsapp size={12} />
                        <span>WhatsApp</span>
                    </a>
                    <a
                        href={`tel:+91${sellerPhone}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            trackContactClick(property.vendorId?._id, 'call');
                        }}
                        className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-wider"
                    >
                        <FiPhone size={12} />
                        <span>Call</span>
                    </a>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const mapsUrl = getGoogleMapsUrl(property.vendorId);
                            if (mapsUrl) {
                                trackContactClick(property.vendorId?._id, 'map');
                                window.open(mapsUrl, '_blank');
                            }
                        }}
                        className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all border border-orange-100 flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-wider"
                    >
                        <FiMapPin size={12} />
                        <span>Map</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default RealEstateCard;
