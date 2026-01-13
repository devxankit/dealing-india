import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiMapPin, FiBriefcase, FiUpload, FiFile, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const WholesalerRegister = () => {
    const navigate = useNavigate();
    const [localLoading, setLocalLoading] = useState(false);
    const [isUploadingDocs, setIsUploadingDocs] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        gstNumber: '',
        businessType: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'India',
        },
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [businessLicense, setBusinessLicense] = useState(null);

    const handleDocumentUpload = async (e) => {
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
            setBusinessLicense({ name: file.name, data: base64, type: file.type });
            toast.success('Document uploaded successfully');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLocalLoading(true);
        try {
            // Mock registration logic
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast.success('Registration request submitted! Please verify your email.');
            navigate('/wholesaler/verification', { state: { email: formData.email } });
        } catch (error) {
            toast.error('Registration failed. Please try again.');
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <FiBriefcase className="text-white text-2xl" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Wholesaler Registration</h1>
                    <p className="text-gray-600">Join our B2B network as a verified wholesaler</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Contact Person */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FiUser className="text-primary-500" />
                            Contact Person
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500" required placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500" required placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500" required placeholder="+91 9876543210" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Business Details */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FiBriefcase className="text-primary-500" />
                            Business Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500" required placeholder="Global Exports Pvt Ltd" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">GST Number</label>
                                <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500" placeholder="22AAAAA0000A1Z5" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Business Type</label>
                                <select name="businessType" value={formData.businessType} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500">
                                    <option value="">Select Type</option>
                                    <option value="Manufacturer">Manufacturer</option>
                                    <option value="Distributor">Distributor</option>
                                    <option value="Importer">Importer</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Document Upload */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FiUpload className="text-primary-500" />
                            Business Proof
                        </h3>
                        <div className="space-y-4">
                            {!businessLicense ? (
                                <div className="relative">
                                    <input type="file" onChange={handleDocumentUpload} className="hidden" id="license-upload" disabled={isUploadingDocs} />
                                    <label htmlFor="license-upload" className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all">
                                        <FiUpload className="text-3xl text-gray-400 mb-2" />
                                        <span className="text-sm font-medium text-gray-600">Upload Business License / GST Cert</span>
                                        <span className="text-xs text-gray-400 mt-1">PDF or Image (max 5MB)</span>
                                    </label>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border-2 border-primary-100">
                                    <div className="flex items-center gap-3">
                                        <FiFile className="text-primary-600 text-xl" />
                                        <span className="text-sm font-medium text-gray-800">{businessLicense.name}</span>
                                    </div>
                                    <button type="button" onClick={() => setBusinessLicense(null)} className="text-gray-400 hover:text-red-500">
                                        <FiX />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Password */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FiLock className="text-primary-500" />
                            Security
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500" placeholder="Password" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500" placeholder="Confirm Password" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={localLoading}
                        className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
                    >
                        {localLoading ? 'Submitting Application...' : 'Submit Registration'}
                    </button>

                    <p className="text-center text-sm text-gray-600">
                        Already registered? <Link to="/wholesaler/login" className="text-primary-600 font-bold hover:underline">Login here</Link>
                    </p>
                </form>
            </motion.div>
        </div>
    );
};

export default WholesalerRegister;
