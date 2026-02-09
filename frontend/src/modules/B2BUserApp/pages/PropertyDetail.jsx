import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiMapPin, FiMaximize, FiCheckCircle,
    FiShield, FiPhone, FiInfo, FiShare2, FiHome, FiUser
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { properties } from '../../../data/properties';
import toast from 'react-hot-toast';

const PropertyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);

    useEffect(() => {
        // Fetch from hardcoded JSON
        const foundProperty = properties.find(p => p.id === id);
        if (foundProperty) {
            setProperty(foundProperty);
        } else {
            // Check in developers/brokers fallback if needed, but properties.js should have all
            toast.error('Property not found');
        }
        setLoading(false);
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <B2BHeader />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Fetching details...</p>
                </div>
            </div>
        );
    }

    if (!property) return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-20 items-center">
            <h1 className="text-2xl font-bold">Property not found</h1>
            <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-bold">Go Back</button>
        </div>
    );

    const propertyImages = property.images || [property.image];

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <B2BHeader title="Property Details" />

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-xl transition-all text-gray-600 flex items-center gap-2 font-black uppercase text-xs tracking-widest">
                        <FiArrowLeft className="text-lg" /> Back
                    </button>
                    <button className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-gray-500">
                        <FiShare2 />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left: Image Gallery */}
                    <div className="lg:col-span-12 xl:col-span-7">
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative aspect-[16/9] rounded-[2.5rem] overflow-hidden bg-white shadow-2xl border border-gray-100"
                            >
                                <img src={propertyImages[selectedImage]} alt={property.title} className="w-full h-full object-cover" />
                                <div className="absolute top-6 left-6 flex gap-2">
                                    <span className="px-4 py-2 bg-primary-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                        {property.type}
                                    </span>
                                    <span className="px-4 py-2 bg-white/90 backdrop-blur-md text-gray-800 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-gray-100">
                                        {property.status}
                                    </span>
                                </div>
                            </motion.div>

                            {propertyImages.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                    {propertyImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage(idx)}
                                            className={`flex-shrink-0 w-28 h-20 rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-primary-500 shadow-xl scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Info & CTA */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                        <div>
                            <div className="flex items-center gap-2 text-primary-600 mb-2">
                                <FiMapPin />
                                <span className="text-sm font-bold uppercase tracking-widest">{property.location}</span>
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 leading-tight mb-4 uppercase tracking-tight">{property.title}</h1>

                            <div className="flex flex-wrap gap-4 mb-6">
                                <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
                                    <FiMaximize className="text-gray-400" />
                                    <span className="text-xs font-bold text-gray-700">{property.area}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
                                    <FiShield className="text-gray-400" />
                                    <span className="text-xs font-bold text-gray-700">Verified Listing</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 -z-0"></div>

                            <div className="relative z-10">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-2 block">Premium Pricing</span>
                                <div className="flex items-baseline gap-2 mb-8">
                                    <span className="text-5xl font-black text-primary-600">{property.price}</span>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={() => window.open(`https://wa.me/919876543210`, '_blank')}
                                        className="w-full py-5 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#128C7E] flex items-center justify-center gap-3 shadow-xl shadow-green-100 transition-all active:scale-95"
                                    >
                                        <FaWhatsapp size={20} /> Contact on WhatsApp
                                    </button>
                                    <button
                                        onClick={() => window.open(`tel:+919876543210`, '_self')}
                                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 flex items-center justify-center gap-3 shadow-xl shadow-blue-100 transition-all active:scale-95"
                                    >
                                        <FiPhone size={20} /> Direct Call Seller
                                    </button>
                                </div>

                                <p className="text-center mt-6 text-[10px] text-gray-400 font-medium">Safe & Secure Transactions via Dealing India</p>
                            </div>
                        </div>

                        {/* Seller Card */}
                        <div
                            onClick={() => navigate(`/b2b/vendor/${property.sellerId || property.id}`)}
                            className="bg-gray-900 p-8 rounded-[3rem] text-white shadow-2xl relative group cursor-pointer hover:bg-black transition-all overflow-hidden"
                        >
                            <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary-600/20 rounded-full -mb-12 -mr-12 group-hover:scale-150 transition-transform duration-700"></div>

                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-6">Listed By</p>
                                <div className="flex items-center gap-5 mb-6">
                                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl font-black border border-white/10 shadow-lg">
                                        {property.sellerInfo?.name?.charAt(0) || property.sellerName?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">{property.sellerInfo?.name || property.sellerName}</h3>
                                        <div className="flex items-center gap-1 text-primary-400 text-xs font-bold">
                                            <FiCheckCircle size={14} /> Verified Business Partner
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Experience</p>
                                        <p className="text-sm font-bold">{property.sellerInfo?.experience || '10+ Years'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Success Rate</p>
                                        <p className="text-sm font-bold">98.5%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Description & Details */}
                    <div className="lg:col-span-12 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2">
                            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">Project Overview</h2>
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                                    {property.description}
                                </p>
                                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Possession</p>
                                        <p className="font-bold text-gray-800">{property.status}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Landmark</p>
                                        <p className="font-bold text-gray-800">Prime Core Region</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Ownership</p>
                                        <p className="font-bold text-gray-800">Freehold</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Security</p>
                                        <p className="font-bold text-gray-800">Tier-3 Protected</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">Key Features</h2>
                            <div className="space-y-3">
                                {[
                                    { label: 'Air Conditioning', icon: <FiCheckCircle /> },
                                    { label: 'Swimming Pool', icon: <FiCheckCircle /> },
                                    { label: 'Central Heating', icon: <FiCheckCircle /> },
                                    { label: 'Laundry Room', icon: <FiCheckCircle /> },
                                    { label: 'Gym/Fitness Center', icon: <FiCheckCircle /> },
                                    { label: '24/7 Security', icon: <FiCheckCircle /> },
                                    { label: 'Club House', icon: <FiCheckCircle /> }
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group hover:border-primary-100 transition-all">
                                        <span className="text-primary-600 group-hover:scale-125 transition-transform">{feature.icon}</span>
                                        <span className="text-sm font-bold text-gray-700">{feature.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default PropertyDetail;
