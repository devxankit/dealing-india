import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiZap, FiStar, FiAward, FiInfo, FiCreditCard, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getActiveB2BPlans, getB2BPlanById, getB2BPlanByIdSync, getActiveB2BPlansSync } from '../../../shared/utils/b2bPlanManager';
import PaymentModal from '../components/PaymentModal';
import api from '../../../shared/utils/api';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';

const B2BVendorSubscription = () => {
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const { vendor } = useB2BVendorAuthStore();

    useEffect(() => {
        const loadPlansAndSubscription = async () => {
            try {
                const plans = await getActiveB2BPlans();
                // Filter to show only 3, 6, 12 months plans
                const filteredPlans = plans.filter(plan => 
                    plan.duration === 3 || plan.duration === 6 || plan.duration === 12
                ).sort((a, b) => a.duration - b.duration);
                setAvailablePlans(filteredPlans);
                
                // Load current subscription from API
                if (vendor && vendor._id) {
                    try {
                        const response = await api.get('/vendor/subscriptions/current');
                        if (response.success && response.data) {
                            const sub = response.data.subscription || response.data;
                            // Only show B2B subscriptions (with planId)
                            if (sub && sub.planId) {
                                const planId = sub.planId._id || sub.planId;
                                setCurrentSubscription({
                                    planId: planId,
                                    planName: sub.planId.name,
                                    duration: sub.planId.duration,
                                    price: sub.planId.price,
                                    startDate: sub.startDate,
                                    endDate: sub.endDate,
                                    status: sub.status,
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error loading subscription:', error);
                        // If no subscription found, that's okay - vendor can subscribe
                    }
                }
                
                // If no current subscription, set default selection
                if (!currentSubscription && filteredPlans.length > 0) {
                    const defaultPlan = filteredPlans.find(p => p.duration === 6) || filteredPlans[0];
                    setSelectedPlan(defaultPlan._id || defaultPlan.id);
                }
            } catch (error) {
                console.error('Error loading plans:', error);
                // Fallback to sync method if API fails
                const plans = getActiveB2BPlansSync();
                const filteredPlans = plans.filter(plan => 
                    plan.duration === 3 || plan.duration === 6 || plan.duration === 12
                ).sort((a, b) => a.duration - b.duration);
                setAvailablePlans(filteredPlans);
            }
        };
        loadPlansAndSubscription();
    }, [vendor]);


    const handlePaymentSuccess = (plan) => {
        // Save subscription to localStorage (simulating API call)
        // In production, this would be saved via API after payment verification
        const subscription = {
            planId: plan._id || plan.id,
            planName: plan.name,
            duration: plan.duration,
            price: plan.price,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + plan.duration * 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active'
        };
        
        localStorage.setItem('b2b_vendor_current_subscription', JSON.stringify(subscription));
        setCurrentSubscription(subscription);
        
        // Don't select the current plan in the list
        setSelectedPlan(null);
    };

    const handleSubscribe = () => {
        if (!selectedPlan) {
            toast.error('Please select a plan');
            return;
        }

        // Open payment modal
        setShowPaymentModal(true);
    };

    const getCurrentPlanDetails = () => {
        if (!currentSubscription) return null;
        // Try sync first (from cache), otherwise return null and handle async
        return getB2BPlanByIdSync(currentSubscription.planId);
    };

    const currentPlanDetails = getCurrentPlanDetails();

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">B2B Subscription</h1>
                <p className="text-gray-600">Choose a plan that fits your business scale and reach more buyers.</p>
            </div>

            {/* Current Subscription Card */}
            {currentSubscription && currentPlanDetails && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-8 mb-8 text-white shadow-xl"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <FiCheckCircle className="text-2xl" />
                                <h2 className="text-2xl font-bold">Current Subscription</h2>
                            </div>
                            <p className="text-primary-100 mb-4">{currentPlanDetails.name} - Active</p>
                            <div className="space-y-2">
                                <p className="text-sm">
                                    <span className="font-semibold">Started:</span> {new Date(currentSubscription.startDate).toLocaleDateString()}
                                </p>
                                <p className="text-sm">
                                    <span className="font-semibold">Expires:</span> {new Date(currentSubscription.endDate).toLocaleDateString()}
                                </p>
                                <p className="text-sm">
                                    <span className="font-semibold">Amount Paid:</span> ₹{currentSubscription.price.toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-extrabold mb-2">{currentPlanDetails.duration} Months</div>
                            <div className="px-4 py-2 bg-white/20 rounded-full text-sm font-bold">Active Plan</div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Available Plans */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {currentSubscription ? 'Upgrade or Renew Your Plan' : 'Select a Subscription Plan'}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {availablePlans.map((plan, index) => {
                    const planId = plan._id || plan.id;
                    const isCurrentPlan = currentSubscription?.planId === planId;
                    return (
                        <motion.div
                            key={planId}
                            whileHover={{ y: -10 }}
                            className={`relative bg-white rounded-3xl p-8 shadow-sm border-2 flex flex-col ${selectedPlan === planId
                                    ? 'border-primary-500 ring-4 ring-primary-50'
                                    : isCurrentPlan
                                    ? 'border-green-500 ring-4 ring-green-50'
                                    : 'border-gray-100'
                                }`}
                            onClick={() => !isCurrentPlan && setSelectedPlan(planId)}
                        >
                            {plan.duration === 6 && !isCurrentPlan && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                                    RECOMMENDED
                                </div>
                            )}

                            {isCurrentPlan && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                                    CURRENT PLAN
                                </div>
                            )}

                            <div className="mb-8">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${selectedPlan === planId ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : isCurrentPlan ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-slate-100 text-gray-400'
                                    }`}>
                                    <FiStar className="text-2xl" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{plan.duration} Months Duration</p>
                            </div>

                            <ul className="space-y-4 mb-10 flex-grow">
                                {plan.features && plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-gray-600">
                                        <div className={`mt-1 p-0.5 rounded-full ${selectedPlan === planId || isCurrentPlan ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <FiCheck className="text-xs" />
                                        </div>
                                        <span className="text-sm font-medium">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {isCurrentPlan ? (
                                <button
                                    disabled
                                    className="w-full py-4 rounded-2xl font-bold shadow-lg bg-green-600 text-white cursor-not-allowed"
                                >
                                    Current Plan
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubscribe}
                                    disabled={isLoading}
                                    className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${selectedPlan === planId
                                            ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-200'
                                            : 'bg-slate-100 text-gray-600 hover:bg-slate-200 shadow-slate-100'
                                        }`}
                                >
                                    {isLoading ? 'Processing...' : selectedPlan === planId ? 'Subscribe Now' : 'Choose Plan'}
                                </button>
                            )}
                        </motion.div>
                    );
                })}
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

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                planId={selectedPlan}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    );
};

export default B2BVendorSubscription;
