import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBox, FiMessageSquare, FiTrendingUp, FiArrowRight, FiBriefcase, FiHash } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { Link } from 'react-router-dom';

const B2BUserDashboard = () => {
    const stats = [
        { label: 'Active Inquiries', value: '12', icon: FiMessageSquare, color: 'blue' },
        { label: 'Pending Quotes', value: '5', icon: FiBox, color: 'primary' },
        { label: 'Total Orders', value: '28', icon: FiTrendingUp, color: 'green' },
    ];

    const recentInquiries = [
        { id: '1', product: 'Cotton Fabric - Bulk', vendor: 'Surat Textiles', status: 'Responded', date: '2 hours ago' },
        { id: '2', product: 'Wireless Earbuds X10', vendor: 'Gizmo Wholesale', status: 'Pending', date: '5 hours ago' },
        { id: '3', product: 'Leather Bags (50pcs)', vendor: 'Agra Leathers', status: 'Negotiating', date: '1 day ago' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Business Dashboard" />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-${stat.color === 'primary' ? 'primary-50' : stat.color + '-50'} flex items-center justify-center`}>
                                <stat.icon className={`text-2xl text-${stat.color === 'primary' ? 'primary-600' : stat.color + '-600'}`} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{stat.label}</p>
                                <p className="text-3xl font-extrabold text-gray-800">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Inquiries */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-gray-800">Recent Inquiries</h2>
                            <Link to="/b2b/inquiries" className="text-sm font-bold text-primary-600 hover:underline flex items-center gap-1">
                                View All <FiArrowRight />
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {recentInquiries.map((inquiry) => (
                                <div key={inquiry.id} className="group p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-white transition-colors">
                                            <FiHash />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 line-clamp-1">{inquiry.product}</h4>
                                            <p className="text-xs text-gray-500 font-medium">{inquiry.vendor} • {inquiry.date}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${inquiry.status === 'Responded' ? 'bg-green-100 text-green-700' :
                                            inquiry.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                'bg-blue-100 text-blue-700'
                                        }`}>
                                        {inquiry.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Info / Recommendations */}
                    <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-6">
                                    <FiBriefcase className="text-2xl" />
                                </div>
                                <h2 className="text-2xl font-bold mb-3 tracking-tight">Expand Your Bulk Reach</h2>
                                <p className="text-primary-100 font-medium leading-relaxed mb-8">
                                    Connect with verified wholesalers across India. Get custom quotes and better pricing for high-volume orders.
                                </p>
                            </div>
                            <Link
                                to="/b2b/catalog"
                                className="w-full py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg text-center shadow-xl hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                            >
                                Explore Bulk Catalog <FiArrowRight />
                            </Link>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary-400/20 rounded-full blur-2xl"></div>
                    </div>
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default B2BUserDashboard;
