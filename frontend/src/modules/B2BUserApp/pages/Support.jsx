import React from 'react';
import { motion } from 'framer-motion';
import { FiHelpCircle, FiPhoneCall, FiMail, FiMessageSquare, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <span className="font-bold text-gray-800 text-sm">{question}</span>
                {isOpen ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
            </button>
            {isOpen && (
                <div className="px-4 pb-4">
                    <p className="text-xs text-gray-500 leading-relaxed">{answer}</p>
                </div>
            )}
        </div>
    );
};

const Support = () => {
    const faqs = [
        { q: "How do I place a bulk order?", a: "To place a bulk order, navigate to the product page, enter the quantity (minimum wholesale quantity applies), and request a quote or pay directly if instant buying is available." },
        { q: "What are the payment terms?", a: "We accept payments via Net Banking, Credit/Debit Cards, and sometimes offer delayed payment terms for verified businesses." },
        { q: "How can I track my shipment?", a: "Go to the 'Orders' tab in your account dashboard. You will find real-time tracking details for all dispatched orders." },
        { q: "Can I cancel a wholesale order?", a: "Orders can only be canceled before the vendor accepts them or starts processing. Once confirmed, cancellation may incur a fee depending on the vendor's policy." }
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Support & Help" showBack={true} />

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Contact Options */}
                <div className="grid grid-cols-2 gap-4">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 text-center group hover:border-primary-200 transition-all"
                    >
                        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            <FiPhoneCall size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">Call Us</p>
                            <p className="text-[10px] text-gray-400 font-medium">Mon-Sat, 9am-6pm</p>
                        </div>
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 text-center group hover:border-primary-200 transition-all"
                    >
                        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            <FiMail size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">Email Support</p>
                            <p className="text-[10px] text-gray-400 font-medium">Response in 24hrs</p>
                        </div>
                    </motion.button>
                </div>

                {/* Live Chat Banner */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 text-white flex items-center justify-between shadow-lg">
                    <div>
                        <h3 className="font-bold text-lg mb-1">Need instant help?</h3>
                        <p className="text-xs text-gray-400">Chat with our support team now.</p>
                    </div>
                    <button className="px-5 py-2.5 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">
                        Start Chat
                    </button>
                </div>

                {/* FAQs */}
                <div>
                    <h3 className="font-bold text-gray-800 mb-4 text-lg">Frequently Asked Questions</h3>
                    <div className="space-y-3">
                        {faqs.map((faq, idx) => (
                            <FAQItem key={idx} question={faq.q} answer={faq.a} />
                        ))}
                    </div>
                </div>

            </main>
            <B2BBottomNav />
        </div>
    );
};

export default Support;
