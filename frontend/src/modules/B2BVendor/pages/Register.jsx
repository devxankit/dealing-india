import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiMapPin, FiBriefcase, FiUpload, FiFile, FiX, FiCheck, FiZap, FiStar, FiAward, FiPlus, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { getActiveB2BPlans } from '../../../shared/utils/b2bPlanManager';

const B2BVendorRegister = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [localLoading, setLocalLoading] = useState(false);
    const [isUploadingDocs, setIsUploadingDocs] = useState(false);
    const [subscriptionPlan, setSubscriptionPlan] = useState('');
    const [availablePlans, setAvailablePlans] = useState([]);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [newBusinessType, setNewBusinessType] = useState("");
    const [paidPlanId, setPaidPlanId] = useState(null); // Track which plan was paid for
    const [paymentData, setPaymentData] = useState(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Get pre-filled data from navigation state (e.g. from "Become a Seller" button)
    const preFilledData = location.state?.userData || {};
    const isUpgrade = location.state?.isUpgrade || false;

    const [formData, setFormData] = useState({
        name: preFilledData.name || '',
        email: preFilledData.email || '',
        phone: preFilledData.phone || '',
        password: '',
        confirmPassword: '',
        companyName: '',
        gstNumber: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'India',
        },
    });

    useEffect(() => {
        if (isUpgrade && preFilledData.name) {
            toast.success(`Welcome ${preFilledData.name.split(' ')[0]}! Complete these details to start your B2B business.`);
        }
    }, [isUpgrade, preFilledData.name]);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [businessLicense, setBusinessLicense] = useState(null);
    const [panCard, setPanCard] = useState(null);

    // Load payment data from localStorage on mount and verify with database
    useEffect(() => {
        const loadAndVerifyPaymentData = async () => {
            const savedPaymentData = localStorage.getItem('b2b_payment_data');
            const savedPaidPlanId = localStorage.getItem('b2b_paid_plan_id');
            const savedSubscriptionId = localStorage.getItem('b2b_subscription_id');
            const savedEmail = localStorage.getItem('b2b_payment_email');
            const savedPhone = localStorage.getItem('b2b_payment_phone');

            if (savedPaymentData && savedPaidPlanId) {
                try {
                    const paymentData = JSON.parse(savedPaymentData);

                    // Validate payment data has required fields
                    if (!paymentData.razorpayPaymentId) {
                        console.warn('Invalid payment data - missing payment ID, clearing...');
                        localStorage.removeItem('b2b_payment_data');
                        localStorage.removeItem('b2b_paid_plan_id');
                        localStorage.removeItem('b2b_subscription_id');
                        localStorage.removeItem('b2b_payment_email');
                        localStorage.removeItem('b2b_payment_phone');
                        return;
                    }

                    // If subscription ID exists, verify it in database
                    if (savedSubscriptionId) {
                        try {
                            console.log('🔍 Verifying subscription in database:', savedSubscriptionId);
                            const verifyResponse = await api.get(`/auth/vendor/b2b-vendor/verify-subscription/${savedSubscriptionId}`);

                            if (verifyResponse.success && verifyResponse.data?.subscription) {
                                // Subscription exists in database - restore data
                                console.log('✅ Subscription verified in database, restoring payment data');
                                setPaymentData(paymentData);
                                setPaidPlanId(savedPaidPlanId);
                                setSubscriptionPlan(savedPaidPlanId);

                                // Restore email and phone if available
                                if (savedEmail) {
                                    setFormData(prev => ({ ...prev, email: savedEmail }));
                                }
                                if (savedPhone) {
                                    setFormData(prev => ({ ...prev, phone: savedPhone }));
                                }

                                console.log('✅ Restored payment data from localStorage:', {
                                    planId: savedPaidPlanId,
                                    subscriptionId: savedSubscriptionId,
                                    hasPaymentId: !!paymentData.razorpayPaymentId,
                                    email: savedEmail,
                                });
                            } else {
                                // Subscription not found in database - clear localStorage
                                console.warn('⚠️ Subscription not found in database, clearing localStorage');
                                localStorage.removeItem('b2b_payment_data');
                                localStorage.removeItem('b2b_paid_plan_id');
                                localStorage.removeItem('b2b_subscription_id');
                                localStorage.removeItem('b2b_payment_email');
                                localStorage.removeItem('b2b_payment_phone');
                                toast.error('Payment data not found. Please make payment again.');
                            }
                        } catch (verifyError) {
                            console.error('Error verifying subscription:', verifyError);
                            // If verification fails (404 or other error), clear localStorage
                            console.warn('⚠️ Subscription verification failed, clearing localStorage');
                            localStorage.removeItem('b2b_payment_data');
                            localStorage.removeItem('b2b_paid_plan_id');
                            localStorage.removeItem('b2b_subscription_id');
                            localStorage.removeItem('b2b_payment_email');
                            localStorage.removeItem('b2b_payment_phone');

                            // Only show error if it's not a 404 (subscription not found)
                            if (verifyError.response?.status !== 404) {
                                toast.error('Failed to verify payment. Please make payment again.');
                            }
                        }
                    } else {
                        // No subscription ID - might be old data, clear it
                        console.warn('⚠️ No subscription ID found, clearing old payment data');
                        localStorage.removeItem('b2b_payment_data');
                        localStorage.removeItem('b2b_paid_plan_id');
                        localStorage.removeItem('b2b_subscription_id');
                        localStorage.removeItem('b2b_payment_email');
                        localStorage.removeItem('b2b_payment_phone');
                    }
                } catch (error) {
                    console.error('Error parsing saved payment data:', error);
                    // Clear invalid data
                    localStorage.removeItem('b2b_payment_data');
                    localStorage.removeItem('b2b_paid_plan_id');
                    localStorage.removeItem('b2b_subscription_id');
                    localStorage.removeItem('b2b_payment_email');
                    localStorage.removeItem('b2b_payment_phone');
                }
            }
        };

        loadAndVerifyPaymentData();
    }, []);

    // Fetch plans and load Razorpay
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const plans = await getActiveB2BPlans();
                const formattedPlans = plans.map(p => ({
                    id: p._id || p.id,
                    name: p.name,
                    price: `₹${p.price.toLocaleString('en-IN')}`,
                    period: `/ ${p.duration} mos`,
                    features: p.features || [],
                    icon: p.duration === 12 ? FiAward : (p.duration === 6 ? FiStar : FiZap),
                    popular: p.duration === 6
                }));
                setAvailablePlans(formattedPlans);

                // Only set default plan if no payment has been made
                if (!paidPlanId && formattedPlans.length > 0) {
                    const defaultPlan = formattedPlans.find(p => p.popular) || formattedPlans[0];
                    setSubscriptionPlan(defaultPlan.id);
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
            }
        };

        const loadScript = () => {
            if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.async = true;
                document.body.appendChild(script);
            }
        };

        fetchPlans();
        loadScript();
    }, [paidPlanId]);

    const addBusinessType = () => {
        if (newBusinessType.trim() && !businessTypes.includes(newBusinessType.trim())) {
            setBusinessTypes([...businessTypes, newBusinessType.trim()]);
            setNewBusinessType("");
        }
    };

    const removeBusinessType = (type) => {
        setBusinessTypes(businessTypes.filter(t => t !== type));
    };

    const handleDocumentUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingDocs(true);
        const isValid = file.type === 'application/pdf' || file.type.startsWith('image/');
        if (!isValid) {
            toast.error('Invalid file type. Please upload PDF or Image.');
            setIsUploadingDocs(false);
            return;
        }

        try {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            if (type === 'license') {
                setBusinessLicense({ name: file.name, data: base64, type: file.type });
            } else {
                setPanCard({ name: file.name, data: base64, type: file.type });
            }
            toast.success(`${type === 'license' ? 'Business License' : 'PAN Card'} uploaded`);
        } catch (error) {
            toast.error('Failed to read file');
        } finally {
            setIsUploadingDocs(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('address.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                address: { ...prev.address, [field]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Handle Payment - Separate function for payment processing
    const handlePayment = async () => {
        // Basic validations before payment
        if (!formData.name || !formData.email || !formData.phone) {
            toast.error('Please fill in your contact details before proceeding to payment');
            return;
        }

        if (!subscriptionPlan) {
            toast.error('Please select a subscription plan');
            return;
        }

        if (!window.Razorpay) {
            toast.error('Razorpay SDK failed to load. Please check your connection.');
            return;
        }

        setIsProcessingPayment(true);
        try {
            // 1. Initialize Payment
            const initResponse = await api.post('/auth/vendor/b2b-vendor/initialize-payment', {
                subscriptionPlan: subscriptionPlan
            });

            if (!initResponse.success) {
                throw new Error(initResponse.message || 'Payment initialization failed');
            }

            const { razorpay, razorpayKeyId } = initResponse.data;

            // 2. Configure Razorpay Options
            const options = {
                key: razorpayKeyId,
                amount: razorpay.amount,
                currency: razorpay.currency,
                name: "Dealing India",
                description: `${availablePlans.find(p => p.id === subscriptionPlan)?.name} B2B Subscription`,
                order_id: razorpay.orderId,
                handler: async (paymentResponse) => {
                    try {
                        setIsProcessingPayment(true);

                        // Prepare payment data
                        const paymentData = {
                            razorpayOrderId: paymentResponse.razorpay_order_id,
                            razorpayPaymentId: paymentResponse.razorpay_payment_id,
                            razorpaySignature: paymentResponse.razorpay_signature,
                        };

                        // Store payment data in state
                        const paymentDataToStore = {
                            ...paymentData,
                            planId: subscriptionPlan
                        };
                        setPaymentData(paymentDataToStore);
                        setPaidPlanId(subscriptionPlan);

                        // Store payment data in localStorage for persistence across page refreshes
                        localStorage.setItem('b2b_payment_data', JSON.stringify(paymentDataToStore));
                        localStorage.setItem('b2b_paid_plan_id', subscriptionPlan);
                        localStorage.setItem('b2b_payment_email', formData.email);
                        localStorage.setItem('b2b_payment_phone', formData.phone);

                        // Create subscription immediately in database after payment success
                        console.log('💳 Payment successful, creating subscription in database...');
                        try {
                            const subscriptionResponse = await api.post('/auth/vendor/b2b-vendor/create-subscription-after-payment', {
                                subscriptionPlan: subscriptionPlan,
                                paymentData: paymentData,
                                email: formData.email,
                                phone: formData.phone
                            });

                            if (subscriptionResponse.success) {
                                const subscriptionId = subscriptionResponse.data.subscription._id;
                                console.log('✅ Subscription created in database:', subscriptionId);

                                // Store subscription ID in localStorage
                                localStorage.setItem('b2b_subscription_id', subscriptionId);

                                toast.success('Payment successful! Subscription created. Please complete your registration below.');
                            } else {
                                throw new Error(subscriptionResponse.message || 'Failed to create subscription');
                            }
                        } catch (subscriptionError) {
                            console.error('Error creating subscription after payment:', subscriptionError);
                            toast.error('Payment successful but subscription creation failed. Please contact support.');
                            // Still allow registration to proceed - subscription will be created during registration
                        }
                    } catch (err) {
                        console.error('Payment handler error:', err);
                        toast.error(err.message || 'Failed to process payment');
                    } finally {
                        setIsProcessingPayment(false);
                    }
                },
                prefill: {
                    name: formData.name || '',
                    email: formData.email || '',
                    contact: formData.phone || ''
                },
                theme: {
                    color: "#F59E0B"
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessingPayment(false);
                        toast.error('Payment cancelled');
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Payment initialization failed. Please try again.';
            toast.error(message);
            setIsProcessingPayment(false);
        }
    };

    // Handle Registration - Only after payment is completed
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if payment is completed for the selected plan
        if (!paidPlanId || !paymentData || paidPlanId !== subscriptionPlan) {
            toast.error('Please complete payment for the selected plan first');
            return;
        }

        // Front-end Validations
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!subscriptionPlan) {
            toast.error('Please select a subscription plan');
            return;
        }

        if (businessTypes.length === 0) {
            toast.error('Please add at least one Business Type');
            return;
        }

        if (!businessLicense || !panCard) {
            toast.error('Please upload both Business License and PAN Card');
            return;
        }

        setLocalLoading(true);
        try {
            // Validate payment data before sending
            if (!paymentData || !paymentData.razorpayPaymentId) {
                toast.error('Payment data is missing. Please complete payment first.');
                setLocalLoading(false);
                return;
            }

            // Complete Registration with Payment Data
            const registrationData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                storeName: formData.companyName,
                storeDescription: `B2B ${businessTypes.join(', ')} Vendor`,
                address: formData.address,
                businessTypes: businessTypes,
                gstNumber: formData.gstNumber,
                subscriptionPlan: subscriptionPlan,
                documents: {
                    panCard: panCard.data,
                    businessLicense: businessLicense.data
                },
                paymentData: {
                    razorpayOrderId: paymentData.razorpayOrderId,
                    razorpayPaymentId: paymentData.razorpayPaymentId,
                    razorpaySignature: paymentData.razorpaySignature
                }
            };

            console.log('📤 Sending registration data to backend:', {
                email: registrationData.email,
                subscriptionPlan: registrationData.subscriptionPlan,
                hasPaymentData: !!registrationData.paymentData,
                razorpayPaymentId: registrationData.paymentData.razorpayPaymentId,
                razorpayOrderId: registrationData.paymentData.razorpayOrderId,
                razorpaySignature: registrationData.paymentData.razorpaySignature ? 'Present' : 'Missing',
            });

            const response = await api.post('/auth/vendor/b2b-vendor/register-with-payment', registrationData);

            console.log('✅ Registration API response received:', {
                success: response.success,
                hasVendor: !!response.data?.vendor,
                hasSubscription: !!response.data?.subscription,
                subscriptionPaymentId: response.data?.subscription?.razorpayPaymentId,
                subscriptionPlanId: response.data?.subscription?.planId,
            });

            if (response.success) {
                // Clear payment data from localStorage after successful registration
                localStorage.removeItem('b2b_payment_data');
                localStorage.removeItem('b2b_paid_plan_id');
                localStorage.removeItem('b2b_subscription_id');
                localStorage.removeItem('b2b_payment_email');
                localStorage.removeItem('b2b_payment_phone');

                toast.success('Registration successful! Your account is pending admin approval. You will be able to login once approved.', {
                    duration: 6000,
                });
                // Navigate to login page with message
                navigate('/b2b-vendor/login', {
                    state: {
                        message: 'Registration successful! Please wait for admin approval before logging in.',
                        email: formData.email
                    }
                });
            } else {
                toast.error(response.message || 'Registration failed');
            }
        } catch (error) {
            console.error('❌ Registration API error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
            });

            const message = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
            toast.error(message);

            // Log detailed error for debugging
            if (error.response?.data) {
                console.error('Error details from backend:', error.response.data);
            }
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 py-8 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-8 w-full max-w-3xl shadow-2xl max-h-[95vh] overflow-y-auto relative"
            >
             {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-4 left-4 p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"
            >
                <FiArrowLeft size={24} />
            </button>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FiBriefcase className="text-white text-2xl" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">B2B Vendor Registration</h1>
                    <p className="text-gray-600">Join our B2B network as a verified Partner</p>
                </div>

                <div className="space-y-8 mb-10">
                    {/* B2B Vendor Detail Card */}
                    <div className="relative p-6 rounded-2xl border-2 border-primary-600 bg-primary-50/50 backdrop-blur-sm shadow-sm">
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
                            <FiCheck className="text-white text-xs" />
                        </div>

                        <div className="flex gap-4 items-center mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                                <FiBriefcase className="text-white text-xl" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-primary-600 border border-primary-100">
                                    Bulk Business
                                </span>
                                <h3 className="text-lg font-bold text-gray-800">Verified B2B Status</h3>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">Verified B2B vendors get exclusive access to bulk inquiries, wholesaler tags, and priority search placement in the B2B marketplace.</p>
                    </div>

                    {/* Subscription Plan Selection */}
                    <div className="pt-4 border-t border-gray-100">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FiStar className="text-yellow-500" />
                                Select Your Subscription Plan
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {availablePlans.map((plan) => {
                                    const Icon = plan.icon || FiStar;
                                    const isSelected = subscriptionPlan === plan.id;
                                    const isPaid = paidPlanId === plan.id; // Check if this specific plan is paid
                                    const hasPaymentDone = !!paidPlanId; // Check if any payment is done
                                    const canSelect = !hasPaymentDone; // Can only select if no payment is done yet
                                    const isDisabled = hasPaymentDone && !isPaid; // Disable if payment done for another plan

                                    return (
                                        <motion.div
                                            key={plan.id}
                                            whileHover={canSelect && !isDisabled ? { y: -5 } : {}}
                                            className={`relative p-6 rounded-3xl border-2 transition-all ${isPaid
                                                    ? 'border-green-500 bg-green-50 shadow-lg'
                                                    : isSelected && canSelect
                                                        ? 'border-primary-600 bg-white shadow-xl ring-4 ring-primary-50'
                                                        : isDisabled
                                                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                                            : 'border-gray-100 bg-slate-50 hover:border-gray-200'
                                                }`}
                                        >
                                            {plan.popular && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                                                    Most Popular
                                                </div>
                                            )}

                                            <div className="text-center mb-6">
                                                <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 ${isSelected ? 'bg-primary-600 text-white' :
                                                        isPaid ? 'bg-green-600 text-white' :
                                                            'bg-white text-gray-400 border border-gray-100'
                                                    }`}>
                                                    <Icon className="text-2xl" />
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
                                                        <FiCheck className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-primary-600' :
                                                                isPaid ? 'text-green-600' :
                                                                    'text-gray-400'
                                                            }`} />
                                                        <span className="text-xs text-gray-600 leading-tight">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {isPaid ? (
                                                // This plan is already paid for - show success message
                                                <div className="w-full py-2.5 rounded-xl text-sm font-bold text-center bg-green-600 text-white shadow-lg">
                                                    Payment Completed ✓
                                                </div>
                                            ) : isDisabled ? (
                                                // Another plan is paid - disable this plan
                                                <div className="w-full py-2.5 rounded-xl text-sm font-bold text-center bg-gray-200 text-gray-500 cursor-not-allowed">
                                                    Payment Done for Another Plan
                                                </div>
                                            ) : isSelected ? (
                                                // This plan is selected but not paid - show pay button
                                                <div className="space-y-2">
                                                    <button
                                                        type="button"
                                                        onClick={handlePayment}
                                                        disabled={isProcessingPayment}
                                                        className="w-full py-3 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {isProcessingPayment ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                Processing...
                                                            </>
                                                        ) : (
                                                            <>Pay Now</>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                // This plan is not selected - show choose button
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (canSelect) {
                                                            setSubscriptionPlan(plan.id);
                                                        } else {
                                                            toast.error('You have already paid for a plan. Please complete registration first.');
                                                        }
                                                    }}
                                                    disabled={!canSelect || isDisabled}
                                                    className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all ${canSelect && !isDisabled
                                                            ? 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
                                                            : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {canSelect ? 'Choose Plan' : 'Payment Already Done'}
                                                </button>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {paidPlanId && (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
                                    <FiCheck className="text-green-600 text-xl flex-shrink-0" />
                                    <p className="text-xs text-green-800 leading-relaxed">
                                        <strong>Payment Successful!</strong> Payment completed for <strong>{availablePlans.find(p => p.id === paidPlanId)?.name}</strong>. Please complete the registration form below to finalize your B2B vendor account.
                                    </p>
                                </div>
                            )}

                            {!paidPlanId && (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                                    <FiZap className="text-amber-500 text-xl flex-shrink-0" />
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        <strong>Payment Required:</strong> Select a plan and click "Pay Now" to proceed. After successful payment, you can complete your registration.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Contact Person */}
                    <div className="bg-white/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                                <FiUser className="text-primary-600" />
                            </div>
                            Contact Person
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Full Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:border-primary-500 focus:bg-white transition-all outline-none" required placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none" required placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Phone Number</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none" required placeholder="+91 9876543210" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Business Details */}
                    <div className="bg-white/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <FiBriefcase className="text-blue-600" />
                            </div>
                            Business Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Company Name</label>
                                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none" required placeholder="Global Exports Pvt Ltd" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">GST Number</label>
                                <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none" placeholder="Enter GST Number (Optional)" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Business Types <span className="text-red-500">*</span></label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newBusinessType}
                                        onChange={(e) => setNewBusinessType(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBusinessType())}
                                        className="flex-1 px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none"
                                        placeholder="e.g. Wholesaler"
                                    />
                                    <button
                                        type="button"
                                        onClick={addBusinessType}
                                        className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center min-w-[48px]"
                                    >
                                        <FiPlus />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {businessTypes.map((type, index) => (
                                        <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg border border-primary-100 text-[10px] font-bold uppercase tracking-wider">
                                            {type}
                                            <button type="button" onClick={() => removeBusinessType(type)} className="hover:text-red-500">
                                                <FiX size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {businessTypes.length === 0 && (
                                        <span className="text-xs text-gray-400 italic">Add your business categories (Manufacturer, etc.)</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Document Upload */}
                    <div className="bg-white/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <FiUpload className="text-green-600" />
                            </div>
                            KYC Documents
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase">Business License / GST <span className="text-red-500">*</span></label>
                                {!businessLicense ? (
                                    <div className="relative">
                                        <input type="file" onChange={(e) => handleDocumentUpload(e, 'license')} className="hidden" id="license-upload" disabled={isUploadingDocs} />
                                        <label htmlFor="license-upload" className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                                            <FiUpload className="text-2xl text-gray-400 mb-1" />
                                            <span className="text-[10px] font-bold text-gray-500">CLICK TO UPLOAD</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border-2 border-green-100">
                                        <div className="flex items-center gap-2">
                                            <FiFile className="text-green-600" />
                                            <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">{businessLicense.name}</span>
                                        </div>
                                        <button type="button" onClick={() => setBusinessLicense(null)} className="text-gray-400 hover:text-red-500"><FiX /></button>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase">PAN Card <span className="text-red-500">*</span></label>
                                {!panCard ? (
                                    <div className="relative">
                                        <input type="file" onChange={(e) => handleDocumentUpload(e, 'pan')} className="hidden" id="pan-upload" disabled={isUploadingDocs} />
                                        <label htmlFor="pan-upload" className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                                            <FiUpload className="text-2xl text-gray-400 mb-1" />
                                            <span className="text-[10px] font-bold text-gray-500">CLICK TO UPLOAD</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border-2 border-green-100">
                                        <div className="flex items-center gap-2">
                                            <FiFile className="text-green-600" />
                                            <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">{panCard.name}</span>
                                        </div>
                                        <button type="button" onClick={() => setPanCard(null)} className="text-gray-400 hover:text-red-500"><FiX /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Address */}
                    <div className="bg-white/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                <FiMapPin className="text-orange-600" />
                            </div>
                            Shop Address
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <input type="text" name="address.street" value={formData.address.street} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-primary-500" required placeholder="Street Address" />
                            </div>
                            <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-primary-500" required placeholder="City" />
                            <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-primary-500" required placeholder="State" />
                            <input type="text" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-primary-500" required placeholder="Zip Code" />
                            <input type="text" name="address.country" readOnly value={formData.address.country} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-400 font-bold" />
                        </div>
                    </div>

                    {/* Section 5: Security */}
                    <div className="bg-white/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                <FiLock className="text-red-600" />
                            </div>
                            Security
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-primary-500" placeholder="Password" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary-600">
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-primary-500" placeholder="Confirm Password" required />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary-600">
                                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {paidPlanId && paidPlanId === subscriptionPlan ? (
                        <button
                            type="submit"
                            disabled={localLoading}
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 rounded-xl font-bold hover:shadow-xl transition-all shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {localLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Processing Registration...
                                </>
                            ) : (
                                <>Complete Registration</>
                            )}
                        </button>
                    ) : (
                        <div className="w-full bg-gray-100 text-gray-500 py-4 rounded-xl font-bold text-center">
                            {paidPlanId ? 'Please select the paid plan to continue' : 'Complete Payment First'}
                        </div>
                    )}

                    <div className="text-center space-y-4 pt-6 mt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                            Already registered? <Link to="/b2b-vendor/login" className="text-primary-600 font-bold hover:underline">Login here</Link>
                        </p>

                        <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Retail Vendor?</span>
                            <Link to="/vendor/login" className="text-primary-600 font-bold hover:underline">
                                Switch to B2C Vendor Panel
                            </Link>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BVendorRegister;
