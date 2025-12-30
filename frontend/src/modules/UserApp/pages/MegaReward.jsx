import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiCheckCircle, FiGift, FiArrowLeft, FiShare2 } from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/Layout/MobileLayout';
import PageTransition from '../../../shared/components/PageTransition';
import toast from 'react-hot-toast';

const MegaReward = () => {
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [status, setStatus] = useState({ entered: false, instagram: false, facebook: false, whatsapp: false, ticketId: null });
    const [verifying, setVerifying] = useState({ instagram: false, facebook: false, whatsapp: false });

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
            <MobileLayout showBottomNav={false}>
                <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white p-6 pb-24">
                    {/* Header */}
                    <div className="flex items-center mb-8">
                        <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                            <FiArrowLeft className="text-xl" />
                        </button>
                        <h1 className="flex-1 text-center text-xl font-bold tracking-wider">MEGA REWARD</h1>
                        <div className="w-9" />
                    </div>

                    {/* Prize Card */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 text-center border border-white/20 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
                        <div className="w-24 h-24 bg-gradient-to-tr from-yellow-300 to-yellow-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                            <FiGift className="text-5xl text-white drop-shadow-md" />
                        </div>
                        <h2 className="text-3xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">₹50,000</h2>
                        <p className="text-purple-200 uppercase tracking-widest text-sm font-semibold">Monthly Jackpot</p>
                    </motion.div>

                    {/* Countdown */}
                    <div className="mb-10 block">
                        <p className="text-center text-sm text-purple-300 mb-4 font-medium uppercase tracking-widest">Lucky Draw Ends In</p>
                        {timeLeft ? (
                            <div className="flex justify-center gap-3">
                                <TimerBox value={timeLeft.days} label="DAYS" />
                                <TimerBox value={timeLeft.hours} label="HRS" />
                                <TimerBox value={timeLeft.minutes} label="MINS" />
                                <TimerBox value={timeLeft.seconds} label="SECS" />
                            </div>
                        ) : (
                            <div className="text-center text-2xl font-bold text-red-400">DRAW CLOSED</div>
                        )}
                    </div>

                    {/* Interaction Area */}
                    <div className="bg-white rounded-t-3xl text-black p-6 -mx-6 min-h-[40vh]">
                        {status.entered && (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8">
                                <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400 border-dashed rounded-2xl p-6 relative overflow-hidden">
                                    <div className="text-center">
                                        <p className="text-yellow-700 font-bold uppercase tracking-widest text-xs mb-2">Your Ticket Number</p>
                                        <div className="text-3xl font-black font-mono text-gray-900 tracking-wider mb-2">{status.ticketId}</div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                            <FiCheckCircle /> REGISTERED
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            {!status.entered && (
                                <>
                                    <h3 className="font-bold text-lg mb-2">How to Enter</h3>
                                    <p className="text-sm text-gray-500 mb-4">Complete steps by sharing promotional reels. Each share unlocks a step!</p>

                                    <button
                                        onClick={() => navigate('/app/reels?type=promotional')}
                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mb-6"
                                    >
                                        <FiShare2 />
                                        Watch & Share Reels to Enter
                                    </button>
                                    <div className="text-center text-gray-400 text-sm mb-4 font-bold">- PROGRESS -</div>
                                </>
                            )}

                            {status.entered && (
                                <h3 className="font-bold text-lg mb-4">Completed Steps</h3>
                            )}

                            <StepItem
                                icon={<FaInstagram className="text-pink-600" />}
                                label="Share on Instagram"
                                done={status.instagram || status.entered}
                            />
                            <StepItem
                                icon={<FaFacebook className="text-blue-600" />}
                                label="Share on Facebook"
                                done={status.facebook || status.entered}
                            />
                            <StepItem
                                icon={<FaWhatsapp className="text-green-600" />}
                                label="Share on WhatsApp"
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
        <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-lg mb-1">
            <span className="text-xl font-bold font-mono text-white">{String(value).padStart(2, '0')}</span>
        </div>
        <span className="text-[10px] font-bold text-purple-200 tracking-wider bg-black/20 px-2 py-0.5 rounded-full">{label}</span>
    </div>
);

const StepItem = ({ icon, label, done }) => (
    <div className={`flex items-center p-4 rounded-xl border ${done ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'} transition-colors duration-300`}>
        <div className="text-2xl mr-4">{icon}</div>
        <div className="flex-1 font-medium text-gray-800 text-sm">{label}</div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
            {done && <FiCheckCircle className="text-white text-sm" />}
        </div>
    </div>
);

export default MegaReward;
