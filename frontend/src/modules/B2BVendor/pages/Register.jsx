import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiMapPin, FiBriefcase, FiUpload, FiFile, FiX, FiCheck, FiPlus, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

/**
 * B2B Vendor Registration Page
 * 
 * STRICT ARCHITECTURE RULE:
 * This page must ONLY contain registration fields.
 * DO NOT fetch or render subscription plans here.
 * Subscription selection happens strictly AFTER login in the dashboard.
 * 
 * Production Fix: Removed all subscription plan logic.
 */

const B2BVendorRegister = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [localLoading, setLocalLoading] = useState(false);
    const [isUploadingDocs, setIsUploadingDocs] = useState(false);

    // Get pre-filled data from navigation state (e.g. from "Become a Seller" button)
    const preFilledData = location.state?.userData || {};
    const isUpgrade = location.state?.isUpgrade || false;

    const [businessTypes, setBusinessTypes] = useState([]);
    const [selectedBusinessType, setSelectedBusinessType] = useState(null);

    const [formData, setFormData] = useState({
        name: preFilledData.name || '',
        email: preFilledData.email || '',
        phone: preFilledData.phone || '',
        password: '',
        confirmPassword: '',
        companyName: '',
        gstNumber: '',
        businessType: 'Textile',
        businessTypeRef: '',
        address: {
            street: '',
            area: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'India',
        },
    });

    useEffect(() => {
        const fetchBusinessTypes = async () => {
            try {
                const response = await api.get('/business-types');
                if (response.success) {
                    setBusinessTypes(response.data);
                    // Set default if available
                    const textile = response.data.find(t => t.name === 'Textile');
                    if (textile) {
                        setFormData(prev => ({
                            ...prev,
                            businessType: textile.name,
                            businessTypeRef: textile._id
                        }));
                        setSelectedBusinessType(textile);
                    }
                }
            } catch (error) {
                console.error('Error fetching business types:', error);
            }
        };

        fetchBusinessTypes();

        if (isUpgrade && preFilledData.name) {
            toast.success(`Welcome ${preFilledData.name.split(' ')[0]}! Complete these details to start your B2B business.`);
        }
    }, [isUpgrade, preFilledData.name]);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [businessLicense, setBusinessLicense] = useState(null);
    const [panCard, setPanCard] = useState(null);

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
        if (name === 'phone') {
            // Only allow numbers and limit to 10 digits
            const cleaned = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [name]: cleaned }));
            return;
        }
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

    // Handle Registration
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Front-end Validations
        if (formData.phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!businessLicense || !panCard) {
            toast.error('Please upload both Business License and PAN Card');
            return;
        }

        setLocalLoading(true);
        try {
            // Complete Registration
            const registrationData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                storeName: formData.companyName,
                storeDescription: `B2B Vendor`,
                address: formData.address,
                gstNumber: formData.gstNumber,
                businessType: formData.businessType,
                businessTypeRef: formData.businessTypeRef,
                documents: {
                    panCard: {
                        data: panCard.data,
                        name: panCard.name,
                        type: panCard.type
                    },
                    businessLicense: {
                        data: businessLicense.data,
                        name: businessLicense.name,
                        type: businessLicense.type
                    }
                }
            };

            const response = await api.post('/auth/vendor/register', registrationData);

            if (response.success) {
                // Show success toast with longer duration to ensure it's seen
                toast.success('Registration successful! Your account is now waiting for admin approval.', {
                    duration: 10000,
                    icon: '🚀',
                    id: 'registration-success-toast'
                });

                // Clear temporary storage and leftover payment data
                localStorage.removeItem('b2b_payment_data');
                sessionStorage.removeItem('b2b_registration_data'); // Added this line
                localStorage.removeItem('b2b_paid_plan_id');
                localStorage.removeItem('b2b_subscription_id');
                localStorage.removeItem('b2b_payment_email');
                localStorage.removeItem('b2b_payment_phone');

                // Small delay to let user see the success toast before navigation
                setTimeout(() => {
                    navigate('/b2b-vendor/verification', {
                        state: {
                            email: formData.email
                        }
                    });
                }, 1000);
            } else {
                toast.error(response.message || 'Registration failed', { id: 'registration-error-toast' });
            }
        } catch (error) {
            console.error('Registration error:', error);
            const message = error.response?.data?.message || error.message || 'Registration failed';

            // Check for specific duplicate field errors
            if (message.toLowerCase().includes('phone') || message.toLowerCase().includes('mobile')) {
                toast.error('Mobile number already registered. Please use a different number or login.', {
                    id: 'duplicate-phone-error',
                    duration: 6000
                });
            } else if (message.toLowerCase().includes('email')) {
                toast.error('Email already registered. Please use a different email or login.', {
                    id: 'duplicate-email-error',
                    duration: 6000
                });
            } else {
                toast.error(message, { id: 'registration-catch-error' });
            }
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 py-6 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto relative"
            >
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-3 left-3 p-1.5 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"
                >
                    <FiArrowLeft size={20} />
                </button>
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <FiBriefcase className="text-white text-xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">B2B Vendor Registration</h1>
                    <p className="text-sm text-gray-600">Join our B2B network as a verified Partner</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Section 1: Contact Person */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                                <FiUser className="text-primary-600 size-4" />
                            </div>
                            Contact Person
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Full Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 focus:bg-white transition-all outline-none text-sm" required placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Phone Number</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="9876543210" maxLength={10} />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Business Details */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                <FiBriefcase className="text-blue-600 size-4" />
                            </div>
                            Business Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Business Type <span className="text-red-500">*</span></label>
                                <select
                                    name="businessTypeRef"
                                    value={formData.businessTypeRef}
                                    onChange={(e) => {
                                        const typeId = e.target.value;
                                        const type = businessTypes.find(t => t._id === typeId);
                                        setFormData(prev => ({
                                            ...prev,
                                            businessTypeRef: typeId,
                                            businessType: type?.name || ''
                                        }));
                                        setSelectedBusinessType(type);
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none appearance-none text-sm"
                                    required
                                >
                                    <option value="">Select Business Type</option>
                                    {businessTypes.map(type => (
                                        <option key={type._id} value={type._id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Company Name</label>
                                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="Global Exports Pvt Ltd" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">GST Number</label>
                                <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" placeholder="Enter GST Number (Optional)" />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Document Upload */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                                <FiUpload className="text-green-600 size-4" />
                            </div>
                            KYC Documents
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase">Business License / GST <span className="text-red-500">*</span></label>
                                {!businessLicense ? (
                                    <div className="relative">
                                        <input type="file" onChange={(e) => handleDocumentUpload(e, 'license')} className="hidden" id="license-upload" disabled={isUploadingDocs} />
                                        <label htmlFor="license-upload" className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                                            <FiUpload className="text-xl text-gray-400 mb-1" />
                                            <span className="text-[9px] font-bold text-gray-500">CLICK TO UPLOAD</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
                                                <FiCheck className="text-white text-xs" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-green-700 uppercase">License</span>
                                                <span className="text-[9px] text-green-600 truncate max-w-[100px]">{businessLicense.name}</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick="{() => setBusinessLicense(null)}" className="p-1 hover:bg-green-100 rounded-lg text-green-600 transition-colors">
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase">PAN Card <span className="text-red-500">*</span></label>
                                {!panCard ? (
                                    <div className="relative">
                                        <input type="file" onChange={(e) => handleDocumentUpload(e, 'pan')} className="hidden" id="pan-upload" disabled={isUploadingDocs} />
                                        <label htmlFor="pan-upload" className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                                            <FiUpload className="text-xl text-gray-400 mb-1" />
                                            <span className="text-[9px] font-bold text-gray-500">CLICK TO UPLOAD</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
                                                <FiCheck className="text-white text-xs" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-green-700 uppercase">PAN Card</span>
                                                <span className="text-[9px] text-green-600 truncate max-w-[100px]">{panCard.name}</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick="{() => setPanCard(null)}" className="p-1 hover:bg-green-100 rounded-lg text-green-600 transition-colors">
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Address */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                                <FiMapPin className="text-orange-600 size-4" />
                            </div>
                            Business Address
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Street Address</label>
                                <input type="text" name="address.street" value={formData.address.street} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="Shop No, Building Name" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Area / Locality</label>
                                <input type="text" name="address.area" value={formData.address.area} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="Textile Market" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">City</label>
                                <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="Surat" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">State</label>
                                <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="Gujarat" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Zip Code</label>
                                <input type="text" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="395003" />
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Security */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                                <FiLock className="text-purple-600 size-4" />
                            </div>
                            Security
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="relative">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Password</label>
                                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="••••••••" minLength={6} />
                                <button type="button" onClick="{() => setShowPassword(!showPassword)}" className="absolute right-3 top-7 text-gray-400 hover:text-gray-600">
                                    {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                                </button>
                            </div>
                            <div className="relative">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Confirm Password</label>
                                <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" required placeholder="••••••••" minLength={6} />
                                <button type="button" onClick="{() => setShowConfirmPassword(!showConfirmPassword)}" className="absolute right-3 top-7 text-gray-400 hover:text-gray-600">
                                    {showConfirmPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={localLoading || isUploadingDocs}
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3.5 rounded-xl font-bold text-base hover:from-primary-700 hover:to-primary-600 shadow-xl shadow-primary-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {localLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <FiCheck className="text-lg" />
                                Create Vendor Account
                            </>
                        )}
                    </button>

                    <div className="text-center pb-2">
                        <p className="text-xs text-gray-500">
                            Already have a vendor account?{" "}
                            <Link to="/b2b-vendor/login" className="text-primary-600 font-bold hover:underline">
                                Login Here
                            </Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BVendorRegister;
