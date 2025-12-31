import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { FiClock, FiCheckCircle, FiGift, FiArrowLeft, FiShare2 } from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';
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
    const coinControls = useAnimation();
    const shadowControls = useAnimation();
    const boxControls = useAnimation();
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [status, setStatus] = useState({ entered: false, instagram: false, facebook: false, whatsapp: false, ticketId: null });
    const [verifying, setVerifying] = useState({ instagram: false, facebook: false, whatsapp: false });

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

    // Calculate Time Left
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const difference = endOfMonth - now;

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
    }, []);

    // Check Local Storage and Ticket Generation
    // Check Local Storage on Mount
    useEffect(() => {
        const checkStatus = () => {
            const lastEntryStr = localStorage.getItem('mega_reward_last_entry');
            const storedTicketId = localStorage.getItem('mega_reward_ticket_id');
            const sharesCount = parseInt(localStorage.getItem('mega_reward_shares') || '0');

            if (lastEntryStr) {
                const lastEntry = new Date(lastEntryStr);
                const now = new Date();
                if (lastEntry.getMonth() === now.getMonth() && lastEntry.getFullYear() === now.getFullYear()) {
                    setStatus({
                        entered: true,
                        instagram: true,
                        facebook: true,
                        whatsapp: true,
                        ticketId: storedTicketId || 'PENDING'
                    });
                    return;
                }
            }

            // Sync shares count to status
            // 1 share = 1 step, 2 shares = 2 steps, etc.
            setStatus(prev => ({
                ...prev,
                instagram: sharesCount >= 1,
                facebook: sharesCount >= 2,
                whatsapp: sharesCount >= 3,
            }));
        };
        checkStatus();
    }, []);

    // Auto-generate ticket if conditions met
    useEffect(() => {
        if (!status.entered && status.instagram && status.facebook && status.whatsapp) {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 7).replace(/-/g, '');
            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            const ticketId = `MR-${dateStr}-${randomStr}`;

            localStorage.setItem('mega_reward_last_entry', now.toISOString());
            localStorage.setItem('mega_reward_ticket_id', ticketId);

            setStatus(prev => ({ ...prev, entered: true, ticketId }));
            toast.success("Ticket Generated!");
        }
    }, [status]);

    // Dev Mode: Reset State on typing 'TEST'
    useEffect(() => {
        let buffer = "";
        const handleKeyDown = (e) => {
            buffer += e.key.toUpperCase();
            if (buffer.length > 4) {
                buffer = buffer.slice(-4);
            }
            if (buffer === "TEST") {
                localStorage.removeItem("mega_reward_last_entry");
                localStorage.removeItem("mega_reward_ticket_id");
                localStorage.removeItem("mega_reward_shares");
                setStatus({
                    entered: false,
                    instagram: false,
                    facebook: false,
                    whatsapp: false,
                    ticketId: null
                });
                toast.success("DEV MODE: Reward State Reset 🛠️");
                buffer = ""; // Reset buffer
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

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

                    {/* Prize Card */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] rounded-[2.5rem] p-10 mb-8 text-center border border-yellow-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
                    >
                        <ParticleAnimation density={30} speed={1.5} spread={250} />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                        <div className="relative z-10">
                            <div className="relative mb-12 perspective-1000 flex flex-col items-center">
                                {/* The "Box" or Slot */}
                                <motion.div
                                    animate={boxControls}
                                    className="absolute bottom-0 w-32 h-12 bg-gradient-to-b from-[#2A2A2A] to-[#111111] rounded-full border-b-4 border-black/40 shadow-2xl flex items-center justify-center overflow-hidden"
                                >
                                    {/* Slot opening effect */}
                                    <div className="w-24 h-4 bg-black/60 rounded-full blur-[2px] shadow-inner" />
                                    <div className="absolute top-0 w-full h-1 bg-white/5" />
                                </motion.div>

                                {/* The Coin */}
                                <motion.div
                                    animate={coinControls}
                                    style={{ transformStyle: 'preserve-3d' }}
                                    className="w-28 h-28 bg-gradient-to-tr from-yellow-300 via-yellow-600 to-yellow-800 rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(234,179,8,0.5)] border-4 border-yellow-200/30 relative z-10"
                                >
                                    {/* Realistic Metal Texture & Shine */}
                                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4)_0%,transparent_70%)]" />
                                    <div className="absolute inset-[2px] border-b-4 border-r-4 border-black/20 rounded-full" />
                                    <div className="absolute inset-[2px] border-t-2 border-l-2 border-white/40 rounded-full" />
                                    
                                    {/* Inner Ring */}
                                    <div className="absolute inset-3 border border-yellow-400/50 rounded-full flex items-center justify-center">
                                        <div className="absolute inset-1 bg-yellow-500/10 rounded-full blur-[1px]" />
                                        <FiGift className="text-5xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                                    </div>

                                    {/* Edge Thickness Simulation (3D Effect) */}
                                    <div className="absolute -inset-[1px] rounded-full border-4 border-yellow-700/50 blur-[0.5px] pointer-events-none" />
                                </motion.div>

                                {/* Shadow animation */}
                                <motion.div
                                    animate={shadowControls}
                                    initial={{ scale: 1, opacity: 0.3 }}
                                    className="w-24 h-4 bg-black/40 blur-xl rounded-full mt-2"
                                />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-4xl font-black mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-yellow-600">₹50,000</h2>
                                <p className="text-yellow-500/80 uppercase tracking-[0.3em] text-[10px] font-black">Grand Monthly Jackpot</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Countdown */}
                    <div className="mb-12">
                        <p className="text-center text-[10px] text-gray-500 mb-6 font-black uppercase tracking-[0.4em]">Time Remaining</p>
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
                        {status.entered && (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-10">
                                <div className="bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-400/30 border-dashed rounded-[2rem] p-8 relative overflow-hidden">
                                    <div className="text-center">
                                        <p className="text-yellow-600 font-black uppercase tracking-[0.2em] text-[10px] mb-3">Participation Ticket</p>
                                        <div className="text-4xl font-black font-mono text-gray-900 tracking-widest mb-4">{status.ticketId}</div>
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black text-white rounded-full text-[10px] font-black tracking-widest uppercase">
                                            <FiCheckCircle className="text-yellow-400" /> Confirmed
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div className="space-y-5">
                            {!status.entered && (
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
                                        Watch & Share Reels
                                    </button>
                                    <div className="text-center text-gray-400 text-[10px] mb-6 font-black tracking-[0.5em] uppercase">Entry Progress</div>
                                </>
                            )}

                            {status.entered && (
                                <h3 className="font-black text-xl mb-6 tracking-tight">Verified Actions</h3>
                            )}

                            <StepItem
                                icon={<FaInstagram className="text-pink-600" />}
                                label="Instagram Feed Share"
                                done={status.instagram || status.entered}
                            />
                            <StepItem
                                icon={<FaFacebook className="text-blue-600" />}
                                label="Facebook Post Share"
                                done={status.facebook || status.entered}
                            />
                            <StepItem
                                icon={<FaWhatsapp className="text-green-600" />}
                                label="WhatsApp Status Share"
                                done={status.whatsapp || status.entered}
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

const StepItem = ({ icon, label, done }) => (
    <div className={`flex items-center p-5 rounded-2xl border ${done ? 'border-green-100 bg-green-50/50' : 'border-gray-100 bg-gray-50/50'} transition-all duration-500`}>
        <div className="text-2xl mr-4 drop-shadow-sm">{icon}</div>
        <div className={`flex-1 font-bold text-sm tracking-tight ${done ? 'text-gray-900' : 'text-gray-500'}`}>{label}</div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${done ? 'bg-black border-black scale-110 shadow-lg' : 'border-gray-200'}`}>
            {done && <FiCheckCircle className="text-yellow-400 text-xs" />}
        </div>
    </div>
);

export default MegaReward;
