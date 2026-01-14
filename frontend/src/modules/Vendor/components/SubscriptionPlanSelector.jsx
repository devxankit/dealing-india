import { motion } from 'framer-motion';
import { FiCheck, FiZap, FiStar, FiAward } from 'react-icons/fi';

const SubscriptionPlanSelector = ({ selected, onSelect }) => {
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
            popular: false
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
            popular: true
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
            popular: false
        }
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiStar className="text-yellow-500" />
                Select Your Subscription Plan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <motion.div
                        key={plan.id}
                        whileHover={{ y: -5 }}
                        onClick={() => onSelect(plan.id)}
                        className={`relative p-6 rounded-3xl border-2 cursor-pointer transition-all ${selected === plan.id
                                ? 'border-primary-600 bg-white shadow-xl ring-4 ring-primary-50'
                                : 'border-gray-100 bg-slate-50 hover:border-gray-200'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                                Most Popular
                            </div>
                        )}

                        <div className="text-center mb-6">
                            <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 ${selected === plan.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-400 border border-gray-100'
                                }`}>
                                <plan.icon className="text-2xl" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-800">{plan.name}</h4>
                            <div className="mt-2">
                                <span className="text-2xl font-extrabold text-gray-900">{plan.price}</span>
                                <span className="text-xs text-gray-500">{plan.period}</span>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            {plan.features.map((feature, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <FiCheck className={`mt-0.5 flex-shrink-0 ${selected === plan.id ? 'text-primary-600' : 'text-gray-400'}`} />
                                    <span className="text-xs text-gray-600 leading-tight">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all ${selected === plan.id
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
                            }`}>
                            {selected === plan.id ? 'Selected' : 'Choose Plan'}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                <FiZap className="text-amber-500 text-xl flex-shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Subscription Required:</strong> B2B vendors are required to have an active subscription to list products and receive inquiries. Your first payment will be processed after registration.
                </p>
            </div>
        </div>
    );
};

export default SubscriptionPlanSelector;
