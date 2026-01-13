import { useState } from "react";
import { FiSearch, FiFilter, FiMessageCircle, FiChevronRight, FiPackage, FiUsers } from "react-icons/fi";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const WholesalerProducts = () => {
    const [searchQuery, setSearchQuery] = useState("");

    const mockProducts = [
        {
            _id: '1',
            title: 'Premium Organic Cotton T-Shirts',
            wholesaler: 'Global Textiles Ltd',
            moq: 100,
            priceRange: '₹120 - ₹180',
            category: 'Apparel',
            image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=200'
        },
        {
            _id: '2',
            title: 'Ergonomic Wireless Earbuds',
            wholesaler: 'TechFlow Electronics',
            moq: 50,
            priceRange: '₹450 - ₹600',
            category: 'Electronics',
            image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=200'
        },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Wholesale Marketplace</h1>
                    <p className="text-gray-500">Browse bulk products from verified wholesalers.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products or wholesalers..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 flex-shrink-0">
                        <FiFilter className="text-xl" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {mockProducts.map((product) => (
                    <div key={product._id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className="relative h-48 bg-slate-100">
                            <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-wider">
                                MOQ: {product.moq} Units
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <Link to={`/vendor/b2b/product/${product._id}`} className="font-bold text-gray-800 line-clamp-2 hover:text-primary-600 transition-colors">
                                    {product.title}
                                </Link>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <FiUsers className="text-primary-500" /> {product.wholesaler}
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">Bulk Price</p>
                                    <p className="text-lg font-black text-primary-600">{product.priceRange}</p>
                                </div>
                                <button className="p-3 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-600 hover:text-white transition-all">
                                    <FiMessageCircle className="text-xl" />
                                </button>
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                                <Link to={`/vendor/b2b/product/${product._id}`} className="flex items-center justify-between text-xs font-bold text-gray-600 group-hover:text-primary-600 transition-colors">
                                    <span>View Details</span>
                                    <FiChevronRight />
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default WholesalerProducts;
