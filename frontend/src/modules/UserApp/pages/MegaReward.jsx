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

    // DEV MODE: Reset Status Shortcut (Sequence: t, e, s, t)
    useEffect(() => {
        let keySequence = '';
        const handleKeyDown = (e) => {
            // Append key to sequence
            keySequence += e.key.toLowerCase();
            // Keep only the last 4 characters
            if (keySequence.length > 4) {
                keySequence = keySequence.slice(-4);
            }

            // Check for 'test' sequence
            if (keySequence === 'test') {
                localStorage.removeItem('mega_reward_last_entry');
                localStorage.removeItem('mega_reward_ticket_id');
                setStatus({ entered: false, instagram: false, facebook: false, whatsapp: false, ticketId: null });
                toast.success('DEV: Mega Reward Entry Reset!', { icon: '🔧' });
                keySequence = ''; // Reset sequence
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Calculate Time Left for Lucky Draw (End of Current Month)
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
        const timer = setInterval(calculateTimeLeft, 1000); // Update every second
        return () => clearInterval(timer);
    }, []);

    // Check Local Storage for Status
    useEffect(() => {
        const lastEntryStr = localStorage.getItem('mega_reward_last_entry');
        const storedTicketId = localStorage.getItem('mega_reward_ticket_id');

        if (lastEntryStr) {
            const lastEntry = new Date(lastEntryStr);
            const now = new Date();
            if (lastEntry.getMonth() === now.getMonth() && lastEntry.getFullYear() === now.getFullYear()) {

                let finalTicketId = storedTicketId;
                // Self-healing: Generate ticket if missing for existing entry
                if (!finalTicketId) {
                    const dateStr = now.toISOString().slice(0, 7).replace(/-/g, ''); // YYYYMM
                    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
                    finalTicketId = `MR-${dateStr}-${randomStr}`;
                    localStorage.setItem('mega_reward_ticket_id', finalTicketId);
                }

                setStatus({
                    entered: true,
                    instagram: true,
                    facebook: true,
                    whatsapp: true,
                    ticketId: finalTicketId
                });
            }
        }
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
                        <div className="w-9" /> {/* Spacer */}
                    </div>

                    {/* Main Prize Card */}
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

                    {/* Countdown Timer */}
                    <div className="mb-10">
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

                    {/* Steps & Ticket */}
                    <div className="bg-white rounded-t-3xl text-black p-6 -mx-6 min-h-[40vh]">

                        {status.entered ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="mb-8"
                            >
                                <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400 border-dashed rounded-2xl p-6 relative overflow-hidden">
                                    {/* Decorative Circles */}
                                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full border-r-2 border-yellow-400" />
                                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full border-l-2 border-yellow-400" />

                                    <div className="text-center">
                                        <p className="text-yellow-700 font-bold uppercase tracking-widest text-xs mb-2">Your Ticket Number</p>
                                        <div className="text-3xl font-black font-mono text-gray-900 tracking-wider mb-2">
                                            {status.ticketId}
                                        </div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                            <FiCheckCircle />
                                            REGISTERED
                                        </div>
                                    </div>
                                </div>
                                <p className="text-center text-gray-500 text-xs mt-4">
                                    Keep this ticket handy. Winners will be announced via this Ticket ID.
                                </p>
                            </motion.div>
                        ) : (
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                Steps to Participate
                            </h3>
                        )}

                        <div className="space-y-4">
                            <StepItem
                                icon={<FaInstagram className="text-pink-600" />}
                                label="Share on Instagram Story"
                                done={status.instagram}
                            />
                            <StepItem
                                icon={<FaFacebook className="text-blue-600" />}
                                label="Share on Facebook Story"
                                done={status.facebook}
                            />
                            <StepItem
                                icon={<FaWhatsapp className="text-green-600" />}
                                label="Share to 5 Friends on WhatsApp"
                                done={status.whatsapp}
                            />
                        </div>

                        {!status.entered ? (
                            <button
                                onClick={() => navigate('/app/reels')}
                                className="w-full mt-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                                <FiShare2 />
                                Go to Reels to Participate
                            </button>
                        ) : null}
                    </div>

                </div>
            </MobileLayout>
        </PageTransition>
    );
};

const TimerBox = ({ value, label }) => {
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg mb-2 overflow-hidden transform-gpu">
                {/* Simplified Infinite Sheen - Opacity only to save GPU */}
                <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                    className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 will-change-transform"
                />

                {/* Number Animation - No Blur, Transform Only */}
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                        key={value}
                        initial={{ y: '100%' }}
                        animate={{ y: '0%' }}
                        exit={{ y: '-100%' }}
                        transition={{ duration: 0.3, ease: "backOut" }}
                        className="text-2xl font-bold font-mono text-white absolute will-change-transform"
                    >
                        {String(value).padStart(2, '0')}
                    </motion.span>
                </AnimatePresence>
            </div>
            <span className="text-[10px] font-bold text-purple-200 tracking-wider bg-black/20 px-2 py-0.5 rounded-full border border-white/5">{label}</span>
        </div>
    );
};

const StepItem = ({ icon, label, done }) => (
    <div className={`flex items-center p-4 rounded-xl border ${done ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'} will-change-transform`}>
        <div className="text-2xl mr-4">{icon}</div>
        <div className="flex-1 font-medium text-gray-800">{label}</div>
        {done ? (
            <FiCheckCircle className="text-xl text-green-500" />
        ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
        )}
    </div>
);

export default MegaReward;
