import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiMessageSquare, FiUser, FiArrowLeft, FiGrid, FiLayout } from 'react-icons/fi';
import { motion } from 'framer-motion';

const B2BHeader = ({ showBack = false, title = "Bulk Marketplace", sticky = true }) => {
    const navigate = useNavigate();

    return (
        <header className={`${sticky ? 'sticky top-0' : 'relative'} z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm flex-shrink-0`}>
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {showBack ? (
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <FiArrowLeft className="text-xl text-gray-700" />
                        </button>
                    ) : (
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
                            <FiGrid className="text-white text-xl" />
                        </div>
                    )}
                    <h1 className="text-xl font-bold text-gray-800 truncate">{title}</h1>
                </div>

                <div className="flex-1 max-w-md hidden md:block">
                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search bulk products, wholesalers..."
                            className="w-full pl-12 pr-4 py-2 bg-gray-50 border-none rounded-full focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link to="/b2b" className="p-2.5 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all" title="Business Dashboard">
                        <FiLayout className="text-xl" />
                    </Link>
                    <Link to="/b2b/inquiries" className="p-2.5 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all relative">
                        <FiMessageSquare className="text-xl" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </Link>
                    <Link to="/b2b/profile" className="p-2.5 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all">
                        <FiUser className="text-xl" />
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default B2BHeader;
