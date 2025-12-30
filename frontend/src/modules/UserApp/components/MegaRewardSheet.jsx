import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiX, FiGift } from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';

const MegaRewardSheet = ({ isOpen, onClose, reel }) => {
    const [status, setStatus] = useState({ entered: false, instagram: false, facebook: false, whatsapp: false, ticketId: null });
    const [verifying, setVerifying] = useState({ instagram: false, facebook: false, whatsapp: false });

    // Load existing status
    useEffect(() => {
        if (isOpen) {
            const lastEntryStr = localStorage.getItem('mega_reward_last_entry');
            const storedTicketId = localStorage.getItem('mega_reward_ticket_id');

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
                }
            }
        }
    }, [isOpen]);

    // Check for Ticket Generation
    useEffect(() => {
        if (!status.entered && status.instagram && status.facebook && status.whatsapp) {
            handleGenerateTicket();
        }
    }, [status]);

    const handleGenerateTicket = () => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 7).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const ticketId = `MR-${dateStr}-${randomStr}`;

        localStorage.setItem('mega_reward_last_entry', now.toISOString());
        localStorage.setItem('mega_reward_ticket_id', ticketId);

        setStatus(prev => ({
            ...prev,
            entered: true,
            ticketId
        }));

        toast.success("Congratulations! Ticket Generated!");
    };

    const handleVerifyWithShare = async (platform, url) => {
        setVerifying(prev => ({ ...prev, [platform]: true }));

        // Open URL
        window.open(url, '_blank');

        // Simulate verification delay
        setTimeout(() => {
            setVerifying(prev => ({ ...prev, [platform]: false }));
            setStatus(prev => ({ ...prev, [platform]: true }));
            toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} Verified!`);
        }, 5000); // 5 seconds wait for realism
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] overflow-hidden max-h-[85vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">WIN ₹50,000</h3>
                                <p className="text-xs text-gray-500">Complete steps to enter the draw</p>
                            </div>
                            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                <FiX className="text-gray-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto">
                            {/* Prize Visual */}
                            {!status.entered && (
                                <div className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-center text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                    <FiGift className="text-4xl mx-auto mb-2" />
                                    <h2 className="text-2xl font-bold">Monthly Jackpot</h2>
                                    <p className="text-white/80 text-sm">Follow steps to win big!</p>
                                </div>
                            )}

                            {status.entered ? (
                                <div className="text-center py-8">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                        <FiCheckCircle className="text-4xl text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">You're Registered!</h3>
                                    <p className="text-gray-500 mb-6">Here is your participaton ticket</p>

                                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 relative">
                                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-r border-gray-300" />
                                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-l border-gray-300" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">TICKET ID</p>
                                        <p className="text-3xl font-mono font-black text-gray-800">{status.ticketId}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <StepItem
                                        icon={<FaInstagram className="text-pink-600" />}
                                        label="Share on Instagram Story"
                                        subIcon={<span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded">Story</span>}
                                        done={status.instagram}
                                        loading={verifying.instagram}
                                        onAction={() => handleVerifyWithShare('instagram', 'https://www.instagram.com/')}
                                    />
                                    <StepItem
                                        icon={<FaFacebook className="text-blue-600" />}
                                        label="Share on Facebook Story"
                                        subIcon={<span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Story</span>}
                                        done={status.facebook}
                                        loading={verifying.facebook}
                                        onAction={() => handleVerifyWithShare('facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}
                                    />
                                    <StepItem
                                        icon={<FaWhatsapp className="text-green-600" />}
                                        label="Share to 5 Friends"
                                        subIcon={<span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded">Chat</span>}
                                        done={status.whatsapp}
                                        loading={verifying.whatsapp}
                                        onAction={() => handleVerifyWithShare('whatsapp', `https://wa.me/?text=${encodeURIComponent(`Check out this Mega Reward! Win ₹50,000! ${window.location.href}`)}`)}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const StepItem = ({ icon, label, subIcon, done, loading, onAction }) => (
    <div className={`flex items-center p-4 rounded-xl border transition-colors ${done ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
        <div className="text-2xl mr-4">{icon}</div>
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-gray-800 text-sm">{label}</span>
                {subIcon}
            </div>
            <p className="text-xs text-gray-500">{done ? 'Completed' : 'Required'}</p>
        </div>
        {done ? (
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheckCircle className="text-lg text-green-600" />
            </div>
        ) : (
            <button
                onClick={onAction}
                disabled={loading}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${loading
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-black text-white active:scale-95 shadow-lg shadow-gray-200'
                    }`}
            >
                {loading ? 'Verifying...' : 'Share'}
            </button>
        )}
    </div>
);

export default MegaRewardSheet;
