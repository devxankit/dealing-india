import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiMapPin, FiMaximize, FiCheckCircle,
    FiShield, FiPhone, FiInfo, FiShare2, FiHome, FiCheck, FiFileText,
    FiLayers, FiBriefcase, FiGrid, FiActivity, FiTag, FiClock, FiBox,
    FiTrendingUp, FiSettings, FiHardDrive, FiUnlock, FiAward
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';

const PropertyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);

    useEffect(() => {
        const fetchPropertyDetails = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/property/public/details/${id}`);
                if (response?.success) {
                    setProperty(response.data);
                } else {
                    toast.error('Property not found');
                }
            } catch (error) {
                console.error('[Fetch Property Detail Error]:', error);
                toast.error('Failed to load property details');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchPropertyDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <B2BHeader title="Loading Asset..." />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-6"></div>
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">Syncing Database Records...</p>
                </div>
            </div>
        );
    }

    if (!property) return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-20 items-center">
            <h1 className="text-2xl font-black uppercase tracking-tight">Property not found</h1>
            <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-black uppercase text-xs tracking-widest border-b-2 border-primary-600">Go Back</button>
        </div>
    );

    const propertyImages = [
        ...(property.media?.map(m => m.url) || []),
        ...(property.images || [])
    ];
    if (propertyImages.length === 0) propertyImages.push('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200');

    const formatPrice = (p) => {
        if (!p) return 'Request Price';

        const getMultiplier = (unit) => {
            switch (unit) {
                case 'Thousand': return 1000;
                case 'Lakh': return 100000;
                case 'Crore': return 10000000;
                default: return 1;
            }
        };

        if (p.listingType === 'Sale') {
            if (p.saleDetails?.priceMin) {
                const multiplier = getMultiplier(p.saleDetails.priceUnit);
                const min = p.saleDetails.priceMin * multiplier;
                const max = p.saleDetails.priceMax * multiplier;

                if (max && max !== min) {
                    if (multiplier >= 100000) {
                        return `₹${p.saleDetails.priceMin}-${p.saleDetails.priceMax} ${p.saleDetails.priceUnit}`;
                    }
                    return `₹${min.toLocaleString('en-IN')}-${max.toLocaleString('en-IN')}`;
                }

                if (multiplier >= 100000) {
                    return `₹${p.saleDetails.priceMin} ${p.saleDetails.priceUnit}`;
                }
                return `₹${min.toLocaleString('en-IN')}`;
            }
        } else if (p.listingType === 'Rent') {
            if (p.rentDetails?.monthlyRent) {
                const multiplier = getMultiplier(p.rentDetails.rentUnit);
                const amount = p.rentDetails.monthlyRent * multiplier;
                return `₹${amount.toLocaleString('en-IN')}/mo`;
            }
        } else if (p.listingType === 'Lease') {
            if (p.leaseDetails?.monthlyLeaseRate) {
                const multiplier = getMultiplier(p.leaseDetails.leaseUnit);
                const amount = p.leaseDetails.monthlyLeaseRate * multiplier;
                return `₹${amount.toLocaleString('en-IN')}/mo`;
            }
        }
        return p.price?.amount ? `₹${p.price.amount.toLocaleString('en-IN')}` : 'Request Price';
    };

    const sellerName = property.vendorId?.storeName || 'Verified Developer';
    const sellerPhone = property.vendorId?.phone || '9876543210';

    return (
        <div className="min-h-screen bg-[#FDFDFF] pb-24">
            <B2BHeader title={property.title} />

            <main className="max-w-[1440px] mx-auto px-6 py-8">
                {/* Navigation & Actions */}
                <div className="flex items-center justify-between mb-10">
                    <button onClick={() => navigate(-1)} className="group flex items-center gap-3 px-6 py-3 bg-white hover:bg-gray-900 hover:text-white rounded-2xl shadow-sm transition-all duration-300 border border-gray-100 font-black uppercase text-[10px] tracking-widest">
                        <FiArrowLeft className="text-base group-hover:-translate-x-1 transition-transform" /> Back To Listings
                    </button>
                    <div className="flex gap-3">
                        <button className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all text-gray-400 border border-gray-100 hover:text-primary-600" onClick={() => toast.success('Link copied!')}>
                            <FiShare2 />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    {/* Left Side: Media & Core Description */}
                    <div className="lg:col-span-8 space-y-8 md:space-y-12">
                        {/* Hero Image Container */}
                        <div className="relative group">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="aspect-[16/9] rounded-3xl md:rounded-[3.5rem] overflow-hidden bg-gray-50 shadow-xl border border-gray-100"
                            >
                                <img src={propertyImages[selectedImage]} alt={property.title} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" />

                                {/* Status Overlays */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                                <div className="absolute top-4 left-4 md:top-10 md:left-10 flex gap-2 md:gap-4 flex-wrap">
                                    <div className="px-4 md:px-8 py-2 md:py-3 bg-primary-600 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-md">
                                        {property.listingType}
                                    </div>
                                    <div className="px-4 md:px-8 py-2 md:py-3 bg-white/90 text-gray-900 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl border border-gray-100">
                                        {property.status?.propertyStatus}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Image Selection Toolbar */}
                            {propertyImages.length > 1 && (
                                <div className="flex gap-3 mt-4 md:mt-8 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                                    {propertyImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage(idx)}
                                            className={`flex-shrink-0 w-24 h-16 md:w-36 md:h-24 rounded-2xl md:rounded-[2rem] overflow-hidden border-2 md:border-4 transition-all duration-300 ${selectedImage === idx ? 'border-primary-500 shadow-xl scale-105' : 'border-white hover:border-primary-100'}`}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description & Overview */}
                        <section>
                            <div className="flex items-center gap-4 mb-6 md:mb-8">
                                <span className="h-[2px] w-8 md:w-12 bg-primary-600"></span>
                                <h2 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Property Details</h2>
                            </div>
                            <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-[3.5rem] border border-gray-100 shadow-sm">
                                <p className="text-gray-500 text-base md:text-xl font-medium leading-[1.8] italic mb-8 md:mb-10">
                                    "{property.description}"
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 pt-8 md:pt-10 border-t border-gray-50">
                                    <div>
                                        <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Asset ID</span>
                                        <p className="text-[10px] md:text-sm font-black text-gray-900 uppercase">#PRO-{property._id.slice(-6)}</p>
                                    </div>
                                    <div>
                                        <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Property Type</span>
                                        <p className="text-[10px] md:text-sm font-black text-gray-900 uppercase">{property.propertyType}</p>
                                    </div>
                                    <div>
                                        <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Listing Type</span>
                                        <p className="text-[10px] md:text-sm font-black text-gray-900 uppercase">{property.listingType}</p>
                                    </div>
                                    <div>
                                        <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Reg. Date</span>
                                        <p className="text-[10px] md:text-sm font-black text-gray-900 uppercase">{new Date(property.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Technical Specifications */}
                        <section>
                            <div className="flex items-center gap-4 mb-6 md:mb-8">
                                <span className="h-[2px] w-8 md:w-12 bg-primary-600"></span>
                                <h2 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Specifications</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                {[
                                    { label: 'Built up Area', val: property.specifications?.builtUpArea, icon: <FiMaximize /> },
                                    { label: 'Carpet Area', val: property.specifications?.carpetArea, icon: <FiMaximize /> },
                                    { label: 'Total Area', val: property.totalArea, icon: <FiMaximize /> },
                                    { label: 'Floor Level', val: property.specifications?.floorNumber, icon: <FiLayers /> },
                                    { label: 'Total Floors', val: property.specifications?.totalFloors, icon: <FiGrid /> },
                                    { label: 'Ceiling Height', val: property.specifications?.ceilingHeight, icon: <FiMaximize /> },
                                    { label: 'Entrance Width', val: property.specifications?.entranceWidth, icon: <FiTrendingUp /> },
                                    { label: 'Road Facing', val: property.roadFacing, icon: <FiMapPin /> },
                                    { label: 'Furnishing', val: property.status?.furnishing, icon: <FiBox /> },
                                    { label: 'Built Status', val: property.status?.propertyStatus, icon: <FiSettings /> },
                                    { label: 'Age of Prop.', val: property.status?.propertyCondition, icon: <FiClock /> },
                                    { label: 'Possession', val: property.status?.propertyPosition, icon: <FiAward /> }
                                ].map((spec, i) => spec.val && (
                                    <div key={i} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex items-start gap-4 md:gap-5">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-50 text-primary-600 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                            {spec.icon}
                                        </div>
                                        <div>
                                            <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">{spec.label}</span>
                                            <p className="text-xs md:text-[15px] font-black text-gray-900 uppercase">{spec.val}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Infrastructure & Facilities */}
                        <section>
                            <div className="flex items-center gap-4 mb-6 md:mb-8">
                                <span className="h-[2px] w-8 md:w-12 bg-primary-600"></span>
                                <h2 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Site Infrastructure</h2>
                            </div>
                            <div className="bg-white rounded-3xl md:rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
                                {property.facilities && [
                                    { label: 'Parking Space', val: property.facilities.parking?.join(', ') || property.facilities.parking, icon: <FiBox /> },
                                    { label: 'Power Backup', val: property.facilities.powerBackup, icon: <FiActivity /> },
                                    { label: 'Water Supply', val: property.facilities.waterSupply, icon: <FiActivity /> },
                                    { label: 'Lift Access', val: property.facilities.lift, icon: <FiLayers /> },
                                    { label: 'Passenger Lift', val: property.facilities.liftPassenger, icon: <FiLayers /> },
                                    { label: 'Loading Lift', val: property.facilities.liftLoading, icon: <FiHardDrive /> },
                                    { label: 'Washroom Type', val: property.facilities.washroom, icon: <FiUnlock /> },
                                    { label: 'Fire Safety', val: property.facilities.fireSafety, icon: <FiShield /> }
                                ].map((fac, i) => fac.val && (
                                    <div key={i} className="flex items-center justify-between p-6 md:p-8 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4 md:gap-6">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 rounded-lg md:rounded-xl flex items-center justify-center text-gray-400">{fac.icon}</div>
                                            <span className="text-[10px] md:text-xs font-black text-gray-700 uppercase tracking-widest">{fac.label}</span>
                                        </div>
                                        <div className={`px-3 md:px-5 py-1.5 md:py-2 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-sm ${fac.val === 'Yes' || fac.val === 'Private' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            {fac.val}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Side: Sticky Pricing & Vendor Info */}
                    <div className="lg:col-span-4 space-y-8 md:space-y-10">
                        {/* Transaction Box */}
                        <div className="sticky top-20 lg:top-10 space-y-8 md:space-y-10">
                            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border border-gray-100 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>

                                <span className="text-[9px] md:text-[11px] text-gray-400 font-black uppercase tracking-[0.3em] mb-4 block">Official Listing Price</span>
                                <div className="text-primary-600 font-black text-4xl md:text-6xl leading-tight mb-6 md:mb-8 tracking-tighter">
                                    {formatPrice(property)}
                                </div>

                                <div className="space-y-4 md:space-y-6 pt-6 border-t border-gray-50">
                                    {/* Financial Breakdown */}
                                    {property.listingType === 'Sale' && property.saleDetails && (
                                        <div className="space-y-3 md:space-y-4">
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Booking / Deposit</span>
                                                <span className="text-gray-900">₹{property.saleDetails.depositAmount} {property.saleDetails.depositUnit}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Maintenance</span>
                                                <span className={`${property.saleDetails.maintenance === 'Included' ? 'text-green-600' : 'text-primary-600'}`}>{property.saleDetails.maintenance}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Vera Bill</span>
                                                <span className="text-gray-900">{property.saleDetails.veraBill}</span>
                                            </div>
                                        </div>
                                    )}

                                    {property.listingType === 'Rent' && property.rentDetails && (
                                        <div className="space-y-3 md:space-y-4">
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Security Deposit</span>
                                                <span className="text-gray-900">₹{property.rentDetails.depositAmount} {property.rentDetails.depositUnit}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Maintenance</span>
                                                <span className={`${property.rentDetails.maintenance === 'Included' ? 'text-green-600' : 'text-primary-600'}`}>{property.rentDetails.maintenance}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Utility / Vera</span>
                                                <span className="text-gray-900">{property.rentDetails.veraBill}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 md:mt-10 space-y-3 md:space-y-4">
                                    <button
                                        onClick={() => window.open(`https://wa.me/91${sellerPhone}`, '_blank')}
                                        className="w-full py-4 md:py-6 bg-[#25D366] text-white rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-[#128C7E] transition-all flex items-center justify-center gap-3"
                                    >
                                        <FaWhatsapp size={20} /> Negotiate Offer
                                    </button>
                                    <button
                                        onClick={() => window.open(`tel:+91${sellerPhone}`, '_self')}
                                        className="w-full py-4 md:py-6 bg-gray-900 text-white rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                                    >
                                        <FiPhone size={20} /> Connect Instant
                                    </button>
                                </div>
                            </div>

                            {/* Geographical Context */}
                            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border border-gray-100 shadow-sm">
                                <h3 className="text-[11px] md:text-sm font-black uppercase tracking-widest text-gray-900 mb-6 md:mb-8 flex items-center gap-3">
                                    <FiMapPin className="text-primary-600" /> Geographical Context
                                </h3>
                                <div className="space-y-5 md:space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-[10px]"><FiGrid /></div>
                                        <div>
                                            <span className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase block tracking-widest">City Zone</span>
                                            <p className="text-xs md:text-sm font-black text-gray-900 uppercase">{property.location.city}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-[10px]"><FiBriefcase /></div>
                                        <div>
                                            <span className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase block tracking-widest">Market / Hub</span>
                                            <p className="text-xs md:text-sm font-black text-gray-900 uppercase">{property.location.market}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-[10px]"><FiHome /></div>
                                        <div>
                                            <span className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase block tracking-widest">Exact Address</span>
                                            <p className="text-[10px] md:text-sm font-bold text-gray-500 uppercase leading-relaxed">{property.location.address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vendor Information */}
                            <div
                                onClick={() => property.vendorId?._id && navigate(`/b2b/vendor/${property.vendorId._id}`)}
                                className="bg-primary-600 p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] text-white shadow-2xl relative group cursor-pointer overflow-hidden border-2 md:border-4 border-primary-500/50"
                            >
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8">
                                        <div className="w-14 h-14 md:w-20 md:h-20 bg-white/20 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-3xl font-black border border-white/30 shadow-2xl overflow-hidden">
                                            {property.vendorId?.storeLogo ? (
                                                <img src={property.vendorId.storeLogo} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                sellerName?.[0]
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-base md:text-xl font-black text-white leading-tight uppercase tracking-tight">{sellerName}</h3>
                                            <div className="flex items-center gap-2 text-primary-100 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] mt-2">
                                                <FiAward size={12} className="text-white" /> Platinum Store
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[9px] md:text-[11px] font-bold text-primary-50 line-clamp-2 uppercase leading-relaxed opacity-90 mb-6 md:mb-8">
                                        {property.vendorId?.storeDescription || 'A trusted strategic partner providing premium real estate assets across India.'}
                                    </p>
                                    <div className="flex items-center justify-between text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl">
                                        <span>View Portfolio</span>
                                        <FiArrowLeft className="rotate-180" />
                                    </div>
                                </div>
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
