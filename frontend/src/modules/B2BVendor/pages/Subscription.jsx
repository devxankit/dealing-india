import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiZap, FiStar, FiAward, FiInfo, FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';

const B2BVendorSubscription = () => {
    const [selectedPlan, setSelectedPlan] = useState('premium');
    const [isLoading, setIsLoading] = useState(false);

    const plans = [
        {
            id: 'basic',
            name: 'Basic B2B',
            price: '₹1,999',
            period: '/mo',
            features: [
                'Up to 50 Product Listings',
                'Inquiry Management',
                'Basic Chat Support',
                'Standard Visibility'
            ],
            icon: FiZap,
            popular: false,
            color: 'blue'
        },
        {
            id: 'premium',
            name: 'Premium B2B',
            price: '₹4,999',
            period: '/mo',
            features: [
                'Unlimited Product Listings',
                'Priority Inquiry Display',
                'Advanced Analytics',
                'Featured Store Badge',
                '24/7 Dedicated Support'
            ],
            icon: FiStar,
            popular: true,
            color: 'primary'
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            features: [
                'Everything in Premium',
                'Custom API Integration',
                'Bulk Import/Export',
                'Personal Account Manager',
                'Verified VIP Status'
            ],
            icon: FiAward,
            popular: false,
            color: 'purple'
        }
    ];

    const handleSubscribe = () => {
        setIsLoading(true);
        setTimeout(() => {
            toast.success('Wait! Payment gateway integration coming soon. For now, we have marked your request.');
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">B2B Subscription</h1>
                <p className="text-gray-600">Choose a plan that fits your business scale and reach more buyers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <motion.div
                        key={plan.id}
                        whileHover={{ y: -10 }}
                        className={`relative bg-white rounded-3xl p-8 shadow-sm border-2 flex flex-col ${selectedPlan === plan.id
                                ? 'border-primary-500 ring-4 ring-primary-50'
                                : 'border-gray-100'
                            }`}
                        onClick={() => setSelectedPlan(plan.id)}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                                RECOMMENDED
                            </div>
                        )}

                        <div className="mb-8">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${selectedPlan === plan.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-slate-100 text-gray-400'
                                }`}>
                                <plan.icon className="text-2xl" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                                <span className="text-gray-500 font-medium">{plan.period}</span>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-10 flex-grow">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-gray-600">
                                    <div className={`mt-1 p-0.5 rounded-full ${selectedPlan === plan.id ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <FiCheck className="text-xs" />
                                    </div>
                                    <span className="text-sm font-medium">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={handleSubscribe}
                            disabled={isLoading}
                            className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${selectedPlan === plan.id
                                    ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-200'
                                    : 'bg-slate-100 text-gray-600 hover:bg-slate-200 shadow-slate-100'
                                }`}
                        >
                            {isLoading ? 'Processing...' : selectedPlan === plan.id ? 'Subscribe Now' : 'Choose Plan'}
                        </button>
                    </motion.div>
                ))}
            </div>

            <div className="mt-12 bg-blue-50 border border-blue-100 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl flex-shrink-0 shadow-lg shadow-blue-200">
                    <FiInfo />
                </div>
                <div>
                    <h4 className="text-xl font-bold text-blue-900 mb-2">Important Notice for B2B Vendors</h4>
                    <p className="text-blue-800 leading-relaxed">
                        B2B subscriptions are mandatory for listing products in the bulk marketplace.
                        Your store profile will be visible to retailers once your subscription is active and documents are verified by our team.
                    </p>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <button className="px-8 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap border border-blue-200">
                        View Billing History
                    </button>
                    <button className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md whitespace-nowrap">
                        <FiCreditCard className="inline mr-2" /> Add Card
                    </button>
                </div>
            </div>
        </div>
    );
};

export default B2BVendorSubscription;
