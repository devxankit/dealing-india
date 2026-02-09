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

            <main className="max-w-5xl mx-auto px-4 py-12">
                <div className="text-center mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-4"
                    >
                        Indian <span className="text-primary-600">Real Estate</span> Marketplace
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 font-bold text-sm md:text-md uppercase tracking-widest"
                    >
                        Choose your path to find the perfect space
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                    {sections.map((section, index) => (
                        <motion.div
                            key={section.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => navigate(section.link)}
                            className="group relative h-[450px] md:h-[500px] rounded-[2.5rem] overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-500"
                        >
                            {/* Background Image */}
                            <img
                                src={section.image}
                                alt={section.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            />

                            {/* Overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90 group-hover:via-black/70 transition-all duration-500`}></div>

                            {/* Content */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                <div className="mb-5 w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 group-hover:bg-primary-600 group-hover:border-primary-500 transition-all duration-500">
                                    {React.cloneElement(section.icon, { size: 28 })}
                                </div>

                                <span className="text-primary-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                                    {section.subtitle}
                                </span>

                                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-tighter mb-4">
                                    {section.title}
                                </h2>

                                <p className="text-gray-300 font-bold text-xs md:text-sm mb-6 max-w-xs line-clamp-3 group-hover:text-white transition-colors">
                                    {section.description}
                                </p>

                                <div className="flex items-center gap-3 text-white font-black uppercase tracking-widest text-[10px] group-hover:gap-5 transition-all">
                                    <span>Enter Marketplace</span>
                                    <FiArrowRight size={16} className="text-primary-500" />
                                </div>
                            </div>

                            {/* Border Glow */}
                            <div className="absolute inset-0 border-0 group-hover:border-[8px] border-white/10 transition-all duration-500 rounded-[2.5rem] pointer-events-none"></div>
                        </motion.div>
                    ))}
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default RealEstate;
