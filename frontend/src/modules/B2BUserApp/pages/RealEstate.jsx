import React from 'react';
import { motion } from 'framer-motion';
import { FiHome, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';

const RealEstate = () => {
    const navigate = useNavigate();

    const sections = [
        {
            id: 'developers',
            title: 'I want a Project from Developer',
            subtitle: 'DIRECT FROM BUILDER',
            description: 'Explore RERA-approved primary projects, new launches, and under-construction properties directly from India\'s top developers.',
            icon: <FiHome size={40} />,
            image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200',
            link: '/b2b/real-estate/developers',
            color: 'from-blue-600/20 to-indigo-600/20'
        },
        {
            id: 'brokers',
            title: 'I want a Property Broker',
            subtitle: 'COMMUNITY & RESALE',
            description: 'Connect with expert local brokers for secondary sales, commercial leases, industrial land, and verified resale properties.',
            icon: <FiTrendingUp size={40} />,
            image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200',
            link: '/b2b/real-estate/brokers',
            color: 'from-emerald-600/20 to-teal-600/20'
        }
    ];

    return (
        <div className="min-h-screen bg-white pb-20 overflow-x-hidden">
            <B2BHeader title="Real Estate Hub" />

            <main className="max-w-7xl mx-auto px-4 py-12">
                <div className="text-center mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter mb-4"
                    >
                        Indian <span className="text-primary-600">Real Estate</span> Marketplace
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-500 font-medium text-lg uppercase tracking-widest"
                    >
                        Choose your path to find the perfect space
                    </motion.p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
                    {sections.map((section, index) => (
                        <motion.div
                            key={section.id}
                            initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.2 }}
                            onClick={() => navigate(section.link)}
                            className="group relative h-[500px] md:h-[600px] rounded-[3rem] overflow-hidden cursor-pointer shadow-2xl"
                        >
                            {/* Background Image */}
                            <img
                                src={section.image}
                                alt={section.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            />

                            {/* Overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90 group-hover:via-black/60 transition-all duration-500`}></div>

                            {/* Content */}
                            <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                                <div className="mb-6 w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 group-hover:bg-primary-600 transition-colors duration-500">
                                    {section.icon}
                                </div>

                                <span className="text-primary-400 font-black text-xs md:text-sm uppercase tracking-[0.3em] mb-3">
                                    {section.subtitle}
                                </span>

                                <h2 className="text-3xl md:text-5xl font-black text-white leading-tight uppercase tracking-tighter mb-6">
                                    {section.title}
                                </h2>

                                <p className="text-gray-300 font-medium text-base md:text-lg mb-8 max-w-md line-clamp-3 group-hover:text-white transition-colors">
                                    {section.description}
                                </p>

                                <div className="flex items-center gap-4 text-white font-black uppercase tracking-widest text-sm group-hover:gap-6 transition-all">
                                    <span>Enter Marketplace</span>
                                    <FiArrowRight size={20} className="text-primary-500" />
                                </div>
                            </div>

                            {/* Border Glow */}
                            <div className="absolute inset-0 border-0 group-hover:border-[12px] border-white/10 transition-all duration-500 rounded-[3.5rem] pointer-events-none"></div>
                        </motion.div>
                    ))}
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default RealEstate;
