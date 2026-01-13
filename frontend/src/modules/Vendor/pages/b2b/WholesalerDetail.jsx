import { useParams } from "react-router-dom";
import { FiUsers, FiPackage, FiMessageCircle, FiCheckCircle, FiPhone, FiMail, FiMapPin } from "react-icons/fi";
import { motion } from "framer-motion";

const WholesalerDetail = () => {
    const { id } = useParams();

    // Mock wholesaler data
    const wholesaler = {
        companyName: "Global Wholesale Hub",
        rating: 4.8,
        verification: "Level 3 Gold",
        description: "Primary supplier for organic textiles and apparel. Established in 2012, serving over 500 retailers nationwide.",
        email: "contact@globalhub.com",
        phone: "+91 99887-76655",
        address: "Bulk Market Complex, Haryana",
        stats: { vendors: 542, products: 124, years: 12 },
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
            {/* Header Profile Section */}
            <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-8">
                <div className="w-32 h-32 lg:w-48 lg:h-48 bg-slate-100 rounded-3xl flex-shrink-0 flex items-center justify-center border-4 border-slate-50 shadow-inner">
                    <span className="text-4xl lg:text-6xl font-black text-primary-600">G</span>
                </div>
                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-black text-gray-800">{wholesaler.companyName}</h1>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                            <FiCheckCircle /> {wholesaler.verification}
                        </span>
                    </div>
                    <p className="text-gray-600 max-w-2xl leading-relaxed">{wholesaler.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-500">
                        <span className="flex items-center gap-2"><FiPhone className="text-primary-500" /> {wholesaler.phone}</span>
                        <span className="flex items-center gap-2"><FiMail className="text-primary-500" /> {wholesaler.email}</span>
                        <span className="flex items-center gap-2"><FiMapPin className="text-primary-500" /> {wholesaler.address}</span>
                    </div>
                </div>
                <div className="lg:w-64 space-y-3">
                    <button className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-2">
                        <FiMessageCircle className="text-xl" /> Contact Wholesaler
                    </button>
                    <button className="w-full py-3 bg-white text-gray-700 font-bold border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all">
                        Follow Store
                    </button>
                </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Active Vendors", value: wholesaler.stats.vendors, icon: FiUsers },
                    { label: "Product Listings", value: wholesaler.stats.products, icon: FiPackage },
                    { label: "Market Experience", value: `${wholesaler.stats.years} Years`, icon: FiTrendingUp },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <div className="w-10 h-10 bg-slate-50 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <s.icon className="text-xl" />
                        </div>
                        <p className="text-2xl font-black text-gray-800">{s.value}</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Catalog Placeholder */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Product Catalog</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="group">
                            <div className="h-48 bg-slate-100 rounded-2xl mb-3 overflow-hidden">
                                <div className="w-full h-full bg-slate-200 animate-pulse" />
                            </div>
                            <div className="h-4 w-3/4 bg-slate-50 rounded mb-2" />
                            <div className="h-6 w-1/2 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const FiTrendingUp = (props) => (
    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);

export default WholesalerDetail;
