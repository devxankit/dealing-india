import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
    FiArrowLeft,
    FiShoppingBag,
    FiCheckCircle,
    FiFilter,
    FiGrid,
    FiList,
    FiLoader,
    FiChevronDown,
    FiMapPin,
    FiShield
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import B2BProductCard from "../components/B2BProductCard";
import api from "../../../shared/utils/api";
import { useAuthStore } from "../../../shared/store/authStore";
import { getGoogleMapsUrl } from "../../../shared/utils/helpers";
import RealEstateCard from "../components/RealEstateCard";
import toast from "../../../shared/utils/toast";

const B2BVendorStore = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const itemType = searchParams.get('itemType') || 'product';
    const { isAuthenticated } = useAuthStore();

    const [vendor, setVendor] = useState(null);
    const [products, setProducts] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("grid");
    const [sortBy, setSortBy] = useState("popular");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch vendor details and products
    useEffect(() => {
        const fetchVendorData = async () => {
            setLoading(true);
            try {

                // OPTIMIZED: Fetch vendor, products, and properties in parallel
                const [vendorRes, productsRes, propertiesRes] = await Promise.all([
                    api.get(`/vendors/${id}`, { silent: true }),
                    api.get(`/products`, {
                        params: {
                            vendorId: id,
                            vendorType: 'b2b',
                            itemType: itemType,
                            limit: 100,
                        },
                        silent: true
                    }),
                    api.get(`/property/all`, {
                        params: { vendorId: id },
                        silent: true
                    })
                ]);

                // Process vendor response
                if (vendorRes?.success) {
                    setVendor(vendorRes.data.vendor);
                }

                // Process products response
                if (productsRes?.success) {
                    const productsList = Array.isArray(productsRes.data)
                        ? productsRes.data
                        : (productsRes.data.products || []);
                    setProducts(productsList);
                }

                // Process properties response
                if (propertiesRes?.success) {
                    setProperties(propertiesRes.data);
                }
            } catch (error) {
                console.error("Error fetching vendor store data:", error);
                toast.error("Failed to load store details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchVendorData();
        }
    }, [id, itemType]);

    // Find shop listing for specific UI details - merged with vendor.shopUnit if available
    const shopListing = useMemo(() => {
        const productListing = products.find(p => p.formType === 'shop-listing');
        if (vendor?.shopUnit) {
            return {
                ...productListing,
                name: vendor.shopUnit.name || productListing?.name,
                description: vendor.shopUnit.description || productListing?.description,
                minPrice: vendor.shopUnit.minPrice ?? productListing?.minPrice,
                maxPrice: vendor.shopUnit.maxPrice ?? productListing?.maxPrice,
                details: vendor.shopUnit.details || [],
                images: (vendor.shopUnit.images && vendor.shopUnit.images.length > 0) ? vendor.shopUnit.images : productListing?.images,
                image: (vendor.shopUnit.images && vendor.shopUnit.images[0]) || productListing?.image
            };
        }
        return productListing;
    }, [products, vendor]);

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let filtered = [...products];

        if (searchQuery) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(p => {
                const nameStarts = (p.name || '').toLowerCase().startsWith(q);
                const itemStarts = Array.isArray(p.items)
                    ? p.items.some(it => (it.itemName || '').toLowerCase().startsWith(q))
                    : false;
                return nameStarts || itemStarts;
            });
        }

        switch (sortBy) {
            case "price-low":
                filtered.sort((a, b) => a.price - b.price);
                break;
            case "price-high":
                filtered.sort((a, b) => b.price - a.price);
                break;
            case "newest":
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            default:
            // popular/default
        }

        return filtered;
    }, [products, searchQuery, sortBy]);

    // Filter properties within this vendor store
    const filteredProperties = useMemo(() => {
        let filtered = [...properties];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                (p.title || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q) ||
                (p.propertyType || '').toLowerCase().includes(q) ||
                (p.location?.city || '').toLowerCase().includes(q) ||
                (p.location?.market || '').toLowerCase().includes(q) ||
                (p.location?.area || '').toLowerCase().includes(q)
            );
        }
        return filtered;
    }, [properties, searchQuery]);

    // Track vendor contact clicks
    const trackContactClick = async (vendorId, clickType) => {
        try {
            if (!vendorId) return;
            await api.post('/vendor/analytics/track-click', {
                vendorId,
                clickType
            });
        } catch (error) {
            console.error('Error tracking click:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <B2BHeader />
                <div className="flex flex-col items-center justify-center py-32">
                    <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-bold mt-8 text-lg tracking-wide uppercase">Opening Store Gates...</p>
                </div>
                <B2BBottomNav />
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="min-h-screen bg-gray-50">
                <B2BHeader />
                <div className="max-w-7xl mx-auto px-4 py-32 text-center">
                    <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-gray-800 mb-4">Store Not Found</h2>
                    <button onClick={() => navigate("/b2b/catalog")} className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-200">
                        Back to Catalog
                    </button>
                </div>
                <B2BBottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <B2BHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={setSearchQuery}
                suggestionEndpoint={`/products/b2b-suggestions?vendorId=${id}`}
                hideSearch={true}
            />

            <main className="max-w-7xl mx-auto px-4 py-6 md:py-12">
                {/* Back Link */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors mb-6 md:mb-10 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em]"
                >
                    <FiArrowLeft className="text-sm md:text-base" />
                    Back to Selection
                </button>

                {/* Vendor Premium Profile Card */}
                <div className="relative mb-8 md:mb-16">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-primary-600/5 rounded-[2rem] md:rounded-[4rem] blur-3xl opacity-50"></div>
                    <div className="relative bg-white rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-12 border border-white/50 shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
                        <div className="relative group">
                            {(vendor.gstNumber || vendor.gst) && (
                                <div className="mb-4 flex justify-center md:justify-start">
                                    <span className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        GSTIN: <span className="text-gray-900">{vendor.gstNumber || vendor.gst}</span>
                                    </span>
                                </div>
                            )}
                            <div className="relative">
                                <div className="relative w-28 h-28 md:w-44 md:h-44 bg-gray-50 rounded-[1.5rem] md:rounded-[2.5rem] p-4 border-2 md:border-4 border-white shadow-xl flex-shrink-0 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105">
                                    {vendor.storeLogo || shopListing?.image || shopListing?.images?.[0] ? (
                                        <img
                                            src={vendor.storeLogo || shopListing?.image || shopListing?.images?.[0]}
                                            alt={vendor.storeName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary-50">
                                            <FiShoppingBag className="text-3xl md:text-5xl text-primary-600" />
                                        </div>
                                    )}
                                </div>
                                {vendor.isVerified && (
                                    <div className="absolute -bottom-2 -right-2 md:bottom-2 md:right-2 bg-primary-600 text-white p-1.5 md:p-2.5 rounded-2xl shadow-xl border-2 md:border-4 border-white animate-bounce-subtle z-10">
                                        <FiCheckCircle className="text-sm md:text-xl" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Container */}
                        <div className="flex-1 text-center md:text-left space-y-4 md:space-y-6">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    <span className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-primary-100/50">
                                        {vendor.businessType ? `Official ${vendor.businessType}` : 'Platinum Vendor'}
                                    </span>
                                </div>
                                <h1 className="text-2xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                                    {shopListing?.name || vendor.storeName}
                                </h1>

                                <div className="space-y-1.5 mt-4">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] md:text-sm font-black text-primary-600 uppercase tracking-[0.1em]">MFD: <span className="text-gray-900">{vendor.businessType || 'N/A'}</span></p>
                                        <p className="text-[10px] md:text-sm font-black text-primary-600 uppercase tracking-[0.1em]">MFG: <span className="text-gray-900">{vendor.mfgOfWork || vendor.mfg || 'N/A'}</span></p>
                                    </div>
                                    <div className="flex items-start gap-1.5 pt-1">
                                        <FiMapPin className="text-gray-400 mt-0.5 flex-shrink-0" size={14} />
                                        <p className="text-[10px] md:text-[13px] font-bold text-gray-500 uppercase tracking-tight leading-relaxed max-w-xl">
                                            {[
                                                vendor.address?.street,
                                                vendor.address?.market,
                                                vendor.address?.landmark,
                                                vendor.address?.area,
                                                vendor.address?.city,
                                                vendor.address?.state,
                                                vendor.address?.country,
                                                vendor.address?.pincode
                                            ].filter(part => part && String(part).trim()).join(', ')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8 pt-4">
                                <div className="flex flex-col">
                                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Active Catalog</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-600/10 rounded-xl flex items-center justify-center text-primary-600 font-black text-xs md:text-sm">
                                            {products.length + properties.length}
                                        </div>
                                        <span className="text-[10px] md:text-xs font-black text-gray-800 uppercase tracking-wider">Units Listed</span>
                                    </div>
                                </div>

                                {shopListing?.minPrice && shopListing?.maxPrice && (
                                    <div className="flex flex-col border-l border-gray-100 pl-4 md:pl-8">
                                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Price Range</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-600/10 rounded-xl flex items-center justify-center text-primary-600 font-black text-xs md:text-sm">
                                                ₹
                                            </div>
                                            <span className="text-[10px] md:text-xs font-black text-gray-800 uppercase tracking-wider">₹{shopListing.minPrice} - ₹{shopListing.maxPrice}</span>
                                        </div>
                                    </div>
                                )}

                                {vendor.address?.city && (
                                    <div className="flex flex-col border-l border-gray-100 pl-4 md:pl-8">
                                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Operating Zone</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                                <FiShield size={14} />
                                            </div>
                                            <span className="text-[10px] md:text-xs font-black text-gray-800 uppercase tracking-wider">{vendor.address.city}, {vendor.address.state}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[240px] pt-4 md:pt-0">
                            {vendor.phone && (
                                <p className="text-[12px] md:text-sm font-black text-gray-900 uppercase tracking-widest text-center md:text-right px-4 mb-1">
                                    PH: +91 {vendor.phone}
                                </p>
                            )}
                            {vendor.phone && (
                                <a
                                    href={(() => {
                                        const cleanedPhone = (vendor.phone || '').replace(/\D/g, '');
                                        const formattedPhone = cleanedPhone.startsWith('91') ? cleanedPhone : '91' + cleanedPhone;
                                        const message = encodeURIComponent(
                                            `👋 *I'm interested in your business services!*\n\n` +
                                            `🏢 *Business:* ${shopListing?.name || vendor.storeName || 'Verified Vendor'}\n` +
                                            `📍 *City:* ${vendor?.address?.city || 'N/A'}\n\n` +
                                            `🔗 *View Store:* ${window.location.href}`
                                        );
                                        return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${message}`;
                                    })()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => trackContactClick(vendor._id || vendor.id, 'whatsapp')}
                                    className="w-full px-8 py-5 md:py-6 bg-[#25D366] text-white rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-[#128C7E] transition-all shadow-xl shadow-green-100/50 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <FaWhatsapp size={20} />
                                    WhatsApp Inquiry
                                </a>
                            )}
                            {vendor.phone && (
                                <button
                                    onClick={() => {
                                        const mapsUrl = getGoogleMapsUrl(vendor);
                                        if (mapsUrl) window.open(mapsUrl, '_blank');
                                        else toast.error('Location details not provided');
                                    }}
                                    className="w-full px-8 py-5 md:py-6 bg-orange-600 text-white rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-100/50 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <FiMapPin size={20} />
                                    View Shop Location
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Shop Presentation Gallery - For Shop Listings */}
                {shopListing && ((shopListing.image && shopListing.images?.length > 0) || shopListing.images?.length > 0) && (
                    <div className="mb-12 md:mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <span className="h-[2px] w-12 bg-primary-600"></span>
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Shop Presentation</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {[...new Set([shopListing.image, ...(shopListing.images || [])])].filter(Boolean).map((img, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.02 }}
                                    className="aspect-square rounded-3xl overflow-hidden border border-gray-100 shadow-sm"
                                >
                                    <img src={img} alt={`Shop ${idx + 1}`} className="w-full h-full object-cover" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Team / Contact Persons Section */}
                {shopListing?.details?.length > 0 && (
                    <div className="mb-12 md:mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <span className="h-[2px] w-12 bg-primary-600"></span>
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Key Contacts / Staff</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {shopListing.details.map((contact, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 group hover:shadow-lg hover:border-primary-100 transition-all font-sans"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-2xl flex items-center justify-center text-primary-600 font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                        {contact.name?.charAt(0) || 'C'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{contact.name || 'N/A'}</h4>
                                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-2 opacity-70">{contact.post || 'Staff'}</p>
                                        {contact.mobile && (
                                            <p className="text-[11px] font-bold text-gray-500">+91 {contact.mobile}</p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filter & View Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4 w-full">
                        <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase">
                            Current <span className="text-primary-600">Inventory</span>
                        </h2>
                        <div className="relative flex-1 max-w-md sm:max-w-xs ml-auto">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search this shop inventory..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 outline-none focus:border-primary-200 transition-all"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85Zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
                        <div className="relative group">
                            <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary-600 transition-colors" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="pl-10 pr-6 py-3 bg-white border border-gray-100 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 outline-none focus:border-primary-200 transition-all appearance-none"
                            >
                                <option value="popular">Most Relevant</option>
                                <option value="newest">Newest Stock</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                            </select>
                        </div>

                        <div className="flex items-center p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-primary-600 text-white shadow-lg shadow-primary-100" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <FiGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-primary-600 text-white shadow-lg shadow-primary-100" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <FiList size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Products & Properties Display */}
                {products.length === 0 && properties.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                        <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-gray-800">No products match your criteria</h3>
                        <p className="text-gray-400 mt-2">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className={viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                        : "space-y-6"
                    }>
                        {filteredProducts.map((product) => (
                            <B2BProductCard
                                key={product._id}
                                product={product}
                                viewMode={viewMode}
                                trackContactClick={trackContactClick}
                            />
                        ))}
                        {filteredProperties.map((property) => (
                            <RealEstateCard key={property._id} property={property} />
                        ))}
                    </div>
                )}
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default B2BVendorStore;
