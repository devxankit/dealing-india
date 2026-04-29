import React from 'react';
import { motion } from 'framer-motion';
import { FiHelpCircle, FiPhoneCall, FiMail, FiMessageSquare, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { getSupportConfig } from '../../../shared/services/supportService';

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
    const [config, setConfig] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await getSupportConfig();
                if (res.success) {
                    setConfig(res.data);
                }
            } catch (error) {
                console.error('Error fetching support config:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const {
        heroTitle = 'Support & Help',
        heroSubtitle = 'We are here to help you with your B2B queries',
        phone = '+918000000000',
        phoneTitle = 'Call B2B Desk',
        email = 'support@dealingindia.com',
        emailTitle = 'Email Support',
        whatsapp = '918000000000',
        whatsappTitle = 'Instant WhatsApp',
        whatsappDesc = 'Chat with us for real-time help',
        whatsappButtonText = 'WhatsApp Us',
        faqTitle = 'Frequently Asked Questions',
        callHours = '9 AM - 7 PM (Mon-Sat)',
        emailResponse = 'response within 4 hours',
        faqs = []
    } = config || {};

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title={heroTitle} showBack={false} />

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">

                {/* Hero Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{heroTitle}</h1>
                    <p className="text-gray-500 font-medium">{heroSubtitle}</p>
                </div>

                {/* Contact Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <a
                        href={`tel:${phone}`}
                        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 text-center group hover:border-primary-200 transition-all cursor-pointer"
                    >
                        <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors shadow-inner">
                            <FiPhoneCall size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-lg leading-tight mb-1">{phoneTitle}</p>
                            <p className="text-sm font-black text-primary-600 mb-1">{phone}</p>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{callHours}</p>
                        </div>
                    </a>

                    <a
                        href={`mailto:${email}`}
                        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 text-center group hover:border-primary-200 transition-all cursor-pointer"
                    >
                        <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors shadow-inner">
                            <FiMail size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-lg leading-tight mb-1">{emailTitle}</p>
                            <p className="text-sm font-black text-primary-600 mb-1">{email}</p>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{emailResponse}</p>
                        </div>
                    </a>

                    <a
                        href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 text-center group hover:border-green-200 transition-all cursor-pointer"
                    >
                        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors shadow-inner">
                            <FiMessageSquare size={28} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-lg leading-tight mb-1">{whatsappTitle}</p>
                            <p className="text-sm font-black text-green-600 mb-1">+{whatsapp}</p>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{whatsappDesc}</p>
                        </div>
                    </a>
                </div>

                {/* FAQs */}
                <div className="pt-4 max-w-2xl mx-auto w-full">
                    <div className="flex items-center gap-2 mb-8 justify-center">
                        <div className="w-2 h-8 bg-primary-500 rounded-full"></div>
                        <h3 className="font-black text-gray-900 text-2xl tracking-tight">{faqTitle}</h3>
                        <div className="w-2 h-8 bg-primary-500 rounded-full"></div>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <FAQItem key={idx} question={faq.question} answer={faq.answer} />
                        ))}
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="bg-gray-100 rounded-2xl p-4 mt-8">
                    <p className="text-[10px] text-gray-500 text-center font-medium leading-relaxed">
                        Authorized Business Hours: {callHours}<br />
                        For urgent disputes related to bulk orders, please use the WhatsApp Support integration.
                    </p>
                </div>

            </main>
            <B2BBottomNav />
        </div>
    );
};

export default Support;
