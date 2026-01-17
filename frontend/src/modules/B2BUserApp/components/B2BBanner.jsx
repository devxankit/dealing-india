import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Mock data for approved B2B banners
const mockB2BBanners = [
    {
        id: 'b2b-banner-1',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop',
        title: 'Wholesale Hub - Premium Electronics',
        vendorId: 'v1',
        link: '/b2b/vendor/v1',
    },
    {
        id: 'b2b-banner-2',
        image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&h=400&fit=crop',
        title: 'Industrial Supplies - Heavy Machinery',
        vendorId: 'v2',
        link: '/b2b/vendor/v2',
    },
    {
        id: 'b2b-banner-3',
        image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=1200&h=400&fit=crop',
        title: 'Bulk Electronics - Smart Devices',
        vendorId: 'v3',
        link: '/b2b/vendor/v3',
    },
];

const B2BBanner = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [banners, setBanners] = useState([]);
    const [displayTime, setDisplayTime] = useState(3000);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        // Simulate loading banners from API
        const loadBanners = async () => {
            try {
                // Using mock data
                setTimeout(() => {
                    setBanners(mockB2BBanners);
                    setDisplayTime(3000);
                    setLoading(false);
                }, 500);
            } catch (error) {
                console.error("Failed to load B2B banners:", error);
                setLoading(false);
            }
        };
        loadBanners();
    }, []);

    // Auto-slide functionality
    useEffect(() => {
        if (banners.length <= 1 || isPaused) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % banners.length);
        }, displayTime);

        return () => clearInterval(interval);
    }, [banners.length, displayTime, isPaused]);

    const handleNext = () => {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
    };

    const handlePrev = () => {
        setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
    };

    const handleBannerClick = (banner) => {
        if (banner.vendorId) {
            navigate(`/b2b/vendor/${banner.vendorId}`);
        } else if (banner.link) {
            if (banner.link.startsWith('http')) {
                window.location.href = banner.link;
            } else {
                navigate(banner.link);
            }
        }
    };

    if (loading) {
        return (
            <div className="w-full px-4 mb-6">
                <div className="w-full bg-gray-100 animate-pulse rounded-2xl" style={{ aspectRatio: "3/1" }}></div>
            </div>
        );
    }

    if (banners.length === 0) return null;

    return (
        <div
            className="w-full px-4 mb-6 overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Desktop Layout */}
            <div className="hidden md:block">
                <div
                    ref={containerRef}
                    className="group relative w-full overflow-hidden rounded-2xl shadow-lg"
                    style={{
                        aspectRatio: "3/1",
                    }}>
                    <motion.div
                        className="flex h-full"
                        style={{
                            width: `${banners.length * 100}%`,
                            height: "100%",
                        }}
                        animate={{
                            x: `-${currentSlide * (100 / banners.length)}%`,
                        }}
                        transition={{
                            duration: 0.8,
                            ease: [0.25, 0.46, 0.45, 0.94],
                            type: "tween",
                        }}>
                        {banners.map((banner, index) => (
                            <div
                                key={banner.id}
                                className="flex-shrink-0 cursor-pointer relative"
                                onClick={() => handleBannerClick(banner)}
                                style={{
                                    width: `${100 / banners.length}%`,
                                    height: "100%",
                                }}>
                                <img
                                    src={banner.image}
                                    alt={banner.title || `B2B Banner ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading={index === 0 ? "eager" : "lazy"}
                                />
                                {/* Overlay with title */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end">
                                    <div className="p-6">
                                        <span className="px-3 py-1 bg-primary-600 text-white text-xs font-bold uppercase rounded-full mb-2 inline-block">
                                            B2B Featured
                                        </span>
                                        <h3 className="text-white text-xl font-bold">{banner.title}</h3>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Navigation Arrows */}
                    {banners.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </>
                    )}

                    {/* Indicators */}
                    {banners.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                            {banners.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={(e) => { e.stopPropagation(); setCurrentSlide(index); }}
                                    aria-label={`Go to slide ${index + 1}`}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === index ? "bg-white w-6 shadow-md" : "bg-white/40 w-1.5 hover:bg-white/60"
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden">
                <div
                    className="relative w-full overflow-hidden rounded-xl shadow-md"
                    style={{
                        aspectRatio: "16/9",
                    }}>
                    <motion.div
                        className="flex h-full cursor-grab active:cursor-grabbing"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = offset.x;
                            if (swipe < -50) handleNext();
                            else if (swipe > 50) handlePrev();
                        }}
                        style={{
                            width: `${banners.length * 100}%`,
                            height: "100%",
                        }}
                        animate={{
                            x: `-${currentSlide * (100 / banners.length)}%`,
                        }}
                        transition={{
                            duration: 0.6,
                            ease: "easeInOut",
                        }}>
                        {banners.map((banner, index) => (
                            <div
                                key={banner.id}
                                className="flex-shrink-0 cursor-pointer relative"
                                onClick={() => handleBannerClick(banner)}
                                style={{
                                    width: `${100 / banners.length}%`,
                                    height: "100%",
                                }}>
                                <img
                                    src={banner.image}
                                    alt={banner.title || `B2B Banner ${index + 1}`}
                                    className="w-full h-full object-cover select-none"
                                    draggable="false"
                                />
                                {/* Overlay with title */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end">
                                    <div className="p-4">
                                        <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-bold uppercase rounded-full mb-1 inline-block">
                                            B2B Featured
                                        </span>
                                        <h3 className="text-white text-sm font-bold">{banner.title}</h3>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Mobile Dots */}
                    {banners.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {banners.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-1 rounded-full transition-all duration-300 ${currentSlide === index ? "bg-white w-4" : "bg-white/50 w-1"
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default B2BBanner;
