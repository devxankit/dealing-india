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
        {
            q: "How do I get GST invoices for my business?",
            a: "All bulk purchases through Dealing India B2B are GST compliant. You can download your Tax Invoice from the 'Order Details' section once the vendor confirms the dispatch."
        },
        {
            q: "What is Minimum Order Quantity (MOQ) and why is it required?",
            a: "MOQ is the minimum quantity a wholesaler is willing to sell to maintain wholesale pricing. Each vendor sets their own MOQ based on the product category and manufacturing costs."
        },
        {
            q: "How to negotiate bulk pricing with vendors?",
            a: "Direct negotiation is available via WhatsApp or Phone. For large orders, we recommend discussing volume-based discounts directly with the verified wholesaler."
        },
        {
            q: "Can I request samples before placing a large wholesale order?",
            a: "Most vendors allow sample ordering. You can request samples directly via the WhatsApp contact option on the product details page."
        },
        {
            q: "How does Dealing India verify wholesalers?",
            a: "Every vendor on our B2B platform undergo a multi-step verification process, including GSTIN validation, business premises verification, and trade history checks to ensure safe transactions."
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Support & Help" showBack={false} />

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Contact Options */}
                <div className="grid grid-cols-2 gap-4">
                    <motion.a
                        href="tel:+918000000000"
                        whileTap={{ scale: 0.95 }}
                        className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 text-center group hover:border-primary-200 transition-all cursor-pointer"
                    >
                        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            <FiPhoneCall size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">Call B2B Desk</p>
                            <p className="text-[10px] text-gray-400 font-medium">9 AM - 7 PM (Mon-Sat)</p>
                        </div>
                    </motion.a>

                    <motion.a
                        href="mailto:support@dealingindia.com"
                        whileTap={{ scale: 0.95 }}
                        className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 text-center group hover:border-primary-200 transition-all cursor-pointer"
                    >
                        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            <FiMail size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">Email Support</p>
                            <p className="text-[10px] text-gray-400 font-medium">response within 4 hours</p>
                        </div>
                    </motion.a>
                </div>

                {/* WhatsApp Support Banner */}
                <div className="relative bg-gradient-to-r from-green-600 to-green-700 rounded-[2.5rem] p-8 text-white flex items-center justify-between shadow-xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                    <div className="relative z-10">
                        <h3 className="font-extrabold text-xl mb-2 flex items-center gap-2">
                            Need Instant Help?
                        </h3>
                        <p className="text-sm text-green-100/70 font-medium max-w-[200px]">Our B2B specialists are available on WhatsApp for real-time assistance.</p>
                    </div>
                    <a href="https://wa.me/918000000000" target="_blank" rel="noopener noreferrer" className="relative z-10 px-6 py-3 bg-white text-green-700 rounded-2xl font-extrabold text-sm hover:bg-green-50 transition-all shadow-lg active:scale-95">
                        WhatsApp Us
                    </a>
                </div>

                {/* FAQs */}
                <div className="pt-2">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-6 bg-primary-500 rounded-full"></div>
                        <h3 className="font-extrabold text-gray-800 text-xl tracking-tight">Frequently Asked Questions</h3>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <FAQItem key={idx} question={faq.q} answer={faq.a} />
                        ))}
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="bg-gray-100 rounded-2xl p-4 mt-8">
                    <p className="text-[10px] text-gray-500 text-center font-medium leading-relaxed">
                        Authorized Business Hours: Mon-Sat | 09:00 - 19:00 IST<br />
                        For urgent disputes related to bulk orders, please use the WhatsApp Support integration.
                    </p>
                </div>

            </main>
            <B2BBottomNav />
        </div>
    );
};

export default Support;
