import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiArrowRight, FiShoppingBag, FiBriefcase, FiMenu, FiX } from 'react-icons/fi';
import { appLogo } from '../../../data/logos';

const B2BLanding = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 md:h-20 gap-4">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => navigate('/app')}>
                            <div className="h-10 md:h-12">
                                <img
                                    src={appLogo.src}
                                    alt={appLogo.alt}
                                    className="h-full object-contain"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <span className="hidden text-xl font-bold text-blue-600">Dealing India</span>
                            </div>
                        </div>

                        {/* Right Buttons - Centered relative to available space since search is gone */}
                        <div className="hidden md:flex items-center gap-2 lg:gap-3">
                            <button
                                onClick={() => navigate('/app/become-seller')}
                                className="flex items-center gap-2 px-3 lg:px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap text-sm lg:text-base"
                            >
                                <FiBriefcase />
                                <span className="hidden lg:inline">Become a Seller (B2B)</span>
                                <span className="lg:hidden">Seller</span>
                            </button>
                            <button
                                onClick={() => navigate('/app')}
                                className="flex items-center gap-2 px-3 lg:px-5 py-2.5 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold rounded-lg transition-all active:scale-95 whitespace-nowrap text-sm lg:text-base"
                            >
                                <FiShoppingBag />
                                <span className="hidden lg:inline">Become a Buyer (B2C)</span>
                                <span className="lg:hidden">Buyer</span>
                            </button>
                            <button
                                onClick={() => navigate('/b2b/login')}
                                className="px-4 py-2.5 text-gray-700 font-bold hover:text-blue-600 transition-colors whitespace-nowrap hidden xl:block"
                            >
                                Login
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="lg:hidden flex items-center gap-2">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                {isMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:hidden bg-white border-b border-gray-100 px-4 py-6 space-y-4 shadow-xl"
                    >
                        <button
                            onClick={() => { navigate('/app/become-seller'); setIsMenuOpen(false); }}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 text-white font-bold rounded-xl"
                        >
                            <FiBriefcase />
                            Become a Seller (B2B)
                        </button>
                        <button
                            onClick={() => { navigate('/app'); setIsMenuOpen(false); }}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-xl"
                        >
                            <FiShoppingBag />
                            Become a Buyer (B2C)
                        </button>
                    </motion.div>
                )}
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
                {/* Background Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-orange-50 rounded-full blur-3xl opacity-50" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Hero Content */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            className="text-center lg:text-left z-10"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold mb-6 border border-blue-100">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                India's Biggest Wholesale Network
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
                                India’s Trusted <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-700 to-blue-800">
                                    B2B & B2C
                                </span> Marketplace
                            </h1>
                            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                                Connect with verified suppliers and buyers across India. Source products at wholesale prices and grow your business today.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                <button
                                    onClick={() => navigate('/b2b/catalog')}
                                    className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Explore Marketplace
                                    <FiArrowRight />
                                </button>
                                <button
                                    onClick={() => navigate('/app/become-seller')}
                                    className="w-full sm:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xl shadow-orange-100 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Start Selling
                                </button>
                            </div>

                            {/* Trust Indicators */}
                            <div className="mt-12 flex flex-wrap justify-center lg:justify-start items-center gap-8 opacity-70 grayscale hover:grayscale-0 transition-all">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-gray-900 italic">1M+</span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Products</span>
                                </div>
                                <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-gray-900 italic">50K+</span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Suppliers</span>
                                </div>
                                <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-gray-900 italic">India</span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Wide Presence</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Hero Image */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative z-0"
                        >
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                                <img
                                    src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1000&auto=format&fit=crop"
                                    alt="Indian Wholesale Market"
                                    className="w-full h-auto aspect-[4/3] object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent hidden md:block" />

                                {/* Floating Elements */}
                                <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl hidden md:flex items-center gap-4 border border-white/20">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                        <FiBriefcase className="text-xl" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">Verified Manufacturer</p>
                                        <p className="text-xs text-gray-500 font-medium italic">Handloom Textiles from Surat, Gujarat</p>
                                    </div>
                                </div>
                            </div>

                            {/* Saffron & White & Green Accents (Indian Flag Colors subtle) */}
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#FF9933] rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob" />
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#138808] rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-blob animation-delay-2000" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Categories/Features Sneak Peek */}
            <section className="bg-gray-50 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-12 italic">Popular in Bulk Marketplace</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { name: 'Apparel & Fashion', img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200&auto=format&fit=crop' },
                            { name: 'Electronics', img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=200&auto=format&fit=crop' },
                            { name: 'Home & Kitchen', img: 'https://images.unsplash.com/photo-1556911220-e1520444655f?q=80&w=200&auto=format&fit=crop' },
                            { name: 'Industrial Goods', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=200&auto=format&fit=crop' }
                        ].map((cat, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -5 }}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer group"
                                onClick={() => navigate('/b2b/catalog')}
                            >
                                <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-gray-100">
                                    <img src={cat.img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <p className="font-bold text-gray-800 italic">{cat.name}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer minimal */}
            <footer className="bg-white border-t border-gray-100 py-8 text-center text-gray-500 text-sm font-medium">
                <p>© 2026 Dealing India. All Rights Reserved. <span className="text-blue-600 font-bold ml-2 cursor-pointer hover:underline" onClick={() => navigate('/app')}>Retail App</span></p>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .text-shadow-sm {
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
      `}} />
        </div>
    );
};

export default B2BLanding;
