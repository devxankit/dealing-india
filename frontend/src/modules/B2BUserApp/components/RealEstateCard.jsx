import React from 'react';
import { motion } from 'framer-motion';
import { FiMapPin, FiTruck, FiPhone, FiHome, FiMaximize } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const RealEstateCard = ({ property }) => {
    const navigate = useNavigate();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
            onClick={() => navigate(`/b2b/real-estate/property/${property.id}`)}
            className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
        >
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-gray-50 border-b border-gray-50">
                <img
                    src={property.image}
                    alt={property.projectName || property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                    <div className="px-2 py-1 bg-primary-600/90 backdrop-blur-sm rounded-md text-[8px] font-black text-white uppercase tracking-wider shadow-sm w-fit">
                        {property.type}
                    </div>
                    {property.status && (
                        <div className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md text-[8px] font-black text-gray-800 uppercase tracking-wider shadow-sm border border-gray-100 w-fit">
                            {property.status}
                        </div>
                    )}
                </div>

                {/* Price Tag */}
                <div className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 z-10">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-sm font-black text-gray-800">{property.priceRange || property.price}</span>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-3 flex flex-col gap-2.5 flex-1">
                <div className="min-w-0">
                    <h3 className="text-xs font-black text-gray-800 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase leading-tight">
                        {property.projectName || property.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <FiMapPin className="text-primary-600 text-[10px]" />
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                            {property.location}
                        </p>
                    </div>
                </div>

                {/* Info Row: Area and Seller */}
                <div className="grid grid-cols-2 gap-2 bg-gray-50/50 p-2 rounded-lg border border-gray-50">
                    {property.area && (
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase">
                            <FiMaximize className="text-primary-500" size={12} />
                            <span>{property.area}</span>
                        </div>
                    )}
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/b2b/vendor/${property.sellerId || property.id}`);
                        }}
                        className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 hover:text-primary-600 cursor-pointer uppercase overflow-hidden"
                    >
                        <FiHome className="text-primary-500 flex-shrink-0" size={12} />
                        <span className="truncate">{property.sellerName}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-auto">
                    <a
                        href={`https://wa.me/919876543210`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 py-2 bg-green-50 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-white transition-all border border-green-100 flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-wider"
                    >
                        <FaWhatsapp size={12} />
                        <span>WhatsApp</span>
                    </a>
                    <a
                        href={`tel:+919876543210`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-wider"
                    >
                        <FiPhone size={12} />
                        <span>Call</span>
                    </a>
                </div>
            </div>
        </motion.div>
    );
};

export default RealEstateCard;
