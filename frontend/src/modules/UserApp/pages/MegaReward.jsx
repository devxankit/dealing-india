import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { FiClock, FiCheckCircle, FiGift, FiArrowLeft, FiShare2, FiLoader } from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';

const ParticleAnimation = ({ density = 20, speed = 2, colors = ['#fbbf24', '#f59e0b', '#ffffff'], spread = 200 }) => {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const createParticle = () => {
            const id = Math.random().toString(36).substr(2, 9);
            const angle = Math.random() * Math.PI * 2;
            const velocity = (Math.random() * speed + 1) * 0.5;
            const size = Math.random() * 3 + 1;
            const color = colors[Math.floor(Math.random() * colors.length)];

            return {
                id,
                x: 0,
                y: 0,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size,
                color,
                opacity: 1,
                life: 1
            };
        };

        const interval = setInterval(() => {
            setParticles(prev => {
                if (prev.length < density) {
                    return [...prev, createParticle()];
                }
                return prev;
            });
        }, 200);

        let animationFrame;
        const update = () => {
            setParticles(prev =>
                prev
                    .map(p => ({
                        ...p,
                        x: p.x + p.vx,
                        y: p.y + p.vy,
                        opacity: p.life,
                        life: p.life - 0.005
                    }))
                    .filter(p => p.life > 0 && Math.sqrt(p.x * p.x + p.y * p.y) < spread)
            );
            animationFrame = requestAnimationFrame(update);
        };
        animationFrame = requestAnimationFrame(update);

        return () => {
            clearInterval(interval);
            cancelAnimationFrame(animationFrame);
        };
    }, [density, speed, colors, spread]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        opacity: p.opacity,
                        transform: `translate(${p.x}px, ${p.y}px)`,
                        boxShadow: `0 0 ${p.size * 2}px ${p.color}`
                    }}
                />
            ))}
        </div>
    );
};

const MegaReward = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const ticketRef = useRef(null);
    const coinControls = useAnimation();
    const shadowControls = useAnimation();
    const boxControls = useAnimation();

    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [campaign, setCampaign] = useState(null);
    const [entry, setEntry] = useState(null);
    const [eligibility, setEligibility] = useState(null);
    const [reels, setReels] = useState([]);

    // Speed Presets
    const SPEED_PRESETS = useMemo(() => ({
        fast: { rotationDuration: 3 }
    }), []);

    const [currentPreset] = useState('fast');

    // Smooth In-Place Spin Logic
    const startCoinAnimation = useCallback(async () => {
        const preset = SPEED_PRESETS[currentPreset];

        // Initial setup for shadow and box
        shadowControls.set({ scale: 1, opacity: 0.3 });
        boxControls.set({ scale: 1 });

        // Continuous smooth rotation
        coinControls.start({
            rotateY: [0, 360],
            transition: {
                duration: preset.rotationDuration,
                repeat: Infinity,
                ease: "linear"
            }
        });
    }, [coinControls, shadowControls, boxControls, currentPreset, SPEED_PRESETS]);

    useEffect(() => {
        startCoinAnimation();
    }, [startCoinAnimation]);

    // Fetch campaign data
    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await api.get('/user/mega-reward/my-status');
            if (response.success && response.data) {
                const data = response.data;

                if (data.hasActiveCampaign && data.campaign) {
                    setCampaign(data.campaign);
                    setEntry(data.entry);
                    setEligibility(data.eligibility);
                    setReels(data.reels || []);
                }
            }
        } catch (error) {
            console.error('Failed to fetch mega reward status:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Time Left
    useEffect(() => {
        if (!campaign?.endDate) return;

        const calculateTimeLeft = () => {
            const now = new Date();
            const end = new Date(campaign.endDate);
            const difference = end - now;

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft({ days, hours, minutes, seconds });
            } else {
                setTimeLeft(null);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [campaign?.endDate]);

    useEffect(() => {
        if (location.state?.scrollToTicket && entry && ticketRef.current) {
            setTimeout(() => {
                ticketRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [location.state, entry]);

    if (loading) {
        return (
            <PageTransition>
                <MobileLayout showBottomNav={false} showCartBar={false}>
                    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
                        <FiLoader className="animate-spin text-4xl text-yellow-500" />
                    </div>
                </MobileLayout>
            </PageTransition>
        );
    }

    if (!campaign) {
        return (
            <PageTransition>
                <MobileLayout showBottomNav={false} showCartBar={false}>
                    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
                        <div className="flex items-center mb-8">
                            <button onClick={() => navigate(-1)} className="p-2 bg-white/5 border border-white/10 rounded-full">
                                <FiArrowLeft className="text-xl" />
                            </button>
                            <h1 className="flex-1 text-center text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200">MEGA REWARD</h1>
                            <div className="w-9" />
                        </div>
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">🎁</div>
                            <h2 className="text-xl font-bold mb-2">No Active Campaign</h2>
                            <p className="text-gray-500">Check back soon for exciting rewards!</p>
                        </div>
                    </div>
                </MobileLayout>
            </PageTransition>
        );
    }

    const prizes = campaign.prizes || [];
    const hasEntry = !!entry;
    const allEligible = eligibility?.eligibility?.allMet || false;

    return (
        <PageTransition>
            <MobileLayout showBottomNav={false} showCartBar={false}>
                <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
                    {/* Header */}
                    <div className="flex items-center mb-8">
                        <button onClick={() => navigate(-1)} className="p-2 bg-white/5 border border-white/10 rounded-full">
                            <FiArrowLeft className="text-xl" />
                        </button>
                        <h1 className="flex-1 text-center text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200">MEGA REWARD</h1>
                        <div className="w-9" />
                    </div>

                    {/* Prize Podium Card */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] rounded-[2.5rem] p-6 mb-8 border border-yellow-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
                    >
                        <ParticleAnimation density={30} speed={1.5} spread={250} />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                        <div className="relative z-10 text-center mb-6">
                            <h2 className="text-sm font-black text-yellow-500 uppercase tracking-[0.3em]">{campaign.prizeTitle}</h2>
                        </div>

                        <div className="relative z-10 grid grid-cols-3 gap-2 items-end mt-4">
                            {/* 2nd Prize */}
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-gray-400/20 rounded-full flex items-center justify-center text-2xl mb-2 border border-gray-400/30">🥈</div>
                                <div className="w-full bg-gradient-to-t from-gray-500/20 to-gray-500/40 rounded-t-xl p-2 h-20 flex flex-col justify-end">
                                    <p className="text-[10px] font-black text-gray-300 uppercase">2nd</p>
                                    <p className="text-xs font-black text-white">₹{prizes[1]?.amount?.toLocaleString() || 0}</p>
                                </div>
                            </div>

                            {/* 1st Prize */}
                            <div className="flex flex-col items-center">
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center text-4xl mb-2 border border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                                >
                                    🏆
                                </motion.div>
                                <div className="w-full bg-gradient-to-t from-yellow-600/30 to-yellow-600/50 rounded-t-xl p-2 h-28 flex flex-col justify-end border-x border-t border-yellow-500/30">
                                    <p className="text-xs font-black text-yellow-400 uppercase">1st Prize</p>
                                    <p className="text-lg font-black text-white leading-none mb-1">₹{prizes[0]?.amount?.toLocaleString() || 0}</p>
                                </div>
                            </div>

                            {/* 3rd Prize */}
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 bg-orange-700/20 rounded-full flex items-center justify-center text-xl mb-2 border border-orange-700/30">🥉</div>
                                <div className="w-full bg-gradient-to-t from-orange-800/20 to-orange-800/40 rounded-t-xl p-2 h-16 flex flex-col justify-end">
                                    <p className="text-[10px] font-black text-orange-400 uppercase">3rd</p>
                                    <p className="text-xs font-black text-white">₹{prizes[2]?.amount?.toLocaleString() || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Prize Descriptions */}
                        <div className="relative z-10 mt-6 space-y-2 bg-black/40 rounded-2xl p-4 border border-white/5">
                            {prizes.map((prize, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">{prize.rank}</span>
                                        {prize.winnerCount > 1 && (
                                            <span className="text-[8px] text-purple-400 font-black uppercase italic">For {prize.winnerCount} Lucky Winners</span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-yellow-500 font-black text-xs">₹{prize.amount?.toLocaleString()}</div>
                                        <div className="text-[8px] text-gray-500 font-medium">{prize.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Countdown */}
                    <div className="mb-12">
                        <p className="text-center text-[10px] text-gray-500 mb-6 font-black uppercase tracking-[0.4em]">
                            Time Remaining
                        </p>
                        {timeLeft ? (
                            <div className="flex justify-center gap-4">
                                <TimerBox value={timeLeft.days} label="DAYS" />
                                <TimerBox value={timeLeft.hours} label="HRS" />
                                <TimerBox value={timeLeft.minutes} label="MINS" />
                                <TimerBox value={timeLeft.seconds} label="SECS" />
                            </div>
                        ) : (
                            <div className="text-center text-2xl font-black text-red-500 tracking-widest">DRAW CLOSED</div>
                        )}
                    </div>

                    {/* Interaction Area */}
                    <div className="bg-white rounded-t-[3rem] text-black p-8 -mx-6 -mb-6 min-h-[50vh] shadow-[0_-20px_40px_rgba(0,0,0,0.3)]">
                        {hasEntry && (
                            <motion.div
                                ref={ticketRef}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="mb-10"
                            >
                                <div className="bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-400/30 border-dashed rounded-[2rem] p-8 relative overflow-hidden">
                                    <div className="text-center">
                                        <p className="text-yellow-600 font-black uppercase tracking-[0.2em] text-[10px] mb-3">Participation Ticket</p>
                                        <div className="text-4xl font-black font-mono text-gray-900 tracking-widest mb-4">{entry.ticketId}</div>
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black text-white rounded-full text-[10px] font-black tracking-widest uppercase">
                                            <FiCheckCircle className="text-yellow-400" />
                                            {entry.status === 'winner' ? '🏆 Winner!' : 'Confirmed'}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div className="space-y-5">
                            {!hasEntry && (
                                <>
                                    <div className="mb-8">
                                        <h3 className="font-black text-2xl mb-2 tracking-tight">How to Enter</h3>
                                        <p className="text-sm text-gray-400 font-medium">Complete all shares to secure your entry into the lucky draw.</p>
                                    </div>

                                    <button
                                        onClick={() => navigate('/app/reels?type=promotional')}
                                        className="w-full bg-black text-white font-black py-5 rounded-2xl shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 mb-8 tracking-widest uppercase text-sm"
                                    >
                                        <FiShare2 className="text-yellow-400" />
                                        Share Reels to Enter
                                    </button>
                                    <div className="text-center text-gray-400 text-[10px] mb-6 font-black tracking-[0.5em] uppercase">Entry Progress</div>
                                </>
                            )}

                            {hasEntry && (
                                <h3 className="font-black text-xl mb-6 tracking-tight">Verified Actions</h3>
                            )}

                            <StepItem
                                icon={<FaInstagram className="text-pink-600" />}
                                label="Instagram Share"
                                subLabel={`${eligibility?.stats?.instagram?.clicks || 0}/${eligibility?.stats?.instagram?.required || 1} unique opens`}
                                done={eligibility?.eligibility?.instagram || hasEntry}
                            />
                            <StepItem
                                icon={<FaFacebook className="text-blue-600" />}
                                label="Facebook Share"
                                subLabel={`${eligibility?.stats?.facebook?.clicks || 0}/${eligibility?.stats?.facebook?.required || 1} unique opens`}
                                done={eligibility?.eligibility?.facebook || hasEntry}
                            />
                            <StepItem
                                icon={<FaWhatsapp className="text-green-600" />}
                                label="WhatsApp Share"
                                subLabel={`${eligibility?.stats?.whatsapp?.clicks || 0}/${eligibility?.stats?.whatsapp?.required || 5} unique opens`}
                                done={eligibility?.eligibility?.whatsapp || hasEntry}
                            />
                        </div>
                    </div>
                </div>
            </MobileLayout>
        </PageTransition>
    );
};

const TimerBox = ({ value, label }) => (
    <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner mb-2">
            <span className="text-2xl font-black font-mono text-white tracking-tighter">{String(value).padStart(2, '0')}</span>
        </div>
        <span className="text-[9px] font-black text-gray-500 tracking-[0.2em]">{label}</span>
    </div>
);

const StepItem = ({ icon, label, subLabel, done }) => (
    <div className={`flex items-center p-5 rounded-2xl border ${done ? 'border-green-100 bg-green-50/50' : 'border-gray-100 bg-gray-50/50'} transition-all duration-500`}>
        <div className="text-2xl mr-4 drop-shadow-sm">{icon}</div>
        <div className="flex-1">
            <div className={`font-bold text-sm tracking-tight ${done ? 'text-gray-900' : 'text-gray-500'}`}>{label}</div>
            <div className="text-[10px] text-gray-400">{subLabel}</div>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${done ? 'bg-black border-black scale-110 shadow-lg' : 'border-gray-200'}`}>
            {done && <FiCheckCircle className="text-yellow-400 text-xs" />}
        </div>
    </div>
);

export default MegaReward;
