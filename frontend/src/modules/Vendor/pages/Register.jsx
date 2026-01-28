import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiShoppingBag, FiMapPin, FiUpload, FiFile, FiX, FiBriefcase, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useVendorAuthStore } from "../store/vendorAuthStore";
import toast from 'react-hot-toast';

const VendorRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register: registerVendor, isLoading } = useVendorAuthStore();
  const [localLoading, setLocalLoading] = useState(false);
  const timeoutRef = useRef(null);

  // Get pre-filled data from navigation state (e.g. from "Become a Seller" button)
  const preFilledData = location.state?.userData || {};
  const isUpgrade = location.state?.isUpgrade || false;

  const [vendorType] = useState('b2c'); // Only 'b2c' now
  const [subscriptionPlan, setSubscriptionPlan] = useState('premium');

  useEffect(() => {
    if (isUpgrade && preFilledData.name) {
      toast.success(`Welcome ${preFilledData.name.split(' ')[0]}! Complete these details to start your business.`);
    }
  }, [isUpgrade, preFilledData.name]);

  const [formData, setFormData] = useState({
    name: preFilledData.name || '',
    email: preFilledData.email || '',
    phone: preFilledData.phone || '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeDescription: '',
    address: {
      street: '',
      area: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [panCard, setPanCard] = useState(null); // { name, data, type }
  const [businessLicense, setBusinessLicense] = useState(null); // { name, data, type }
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);

  // Increased timeout for production (email sending can take up to 60s)
  const isProduction = typeof window !== 'undefined' &&
    (window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('onrender.com'));
  const timeoutDuration = isProduction ? 95000 : 35000; // 95s in production, 35s in dev

  // Safety mechanism: Reset loading state if it's stuck
  useEffect(() => {
    if (localLoading || isLoading) {
      timeoutRef.current = setTimeout(() => {
        setLocalLoading(false);
        toast.error('Request timeout. Please check your internet connection and try again.');
      }, timeoutDuration);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isLoading, localLoading]);

  // Sync local loading with store loading
  useEffect(() => {
    if (!isLoading) {
      setLocalLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isLoading]);

  // Handle document/media upload
  const handleDocumentUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingDocs(true);

    // Validate file type (PDF, images)
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPDF && !isImage) {
      toast.error(`${file.name} is not a valid file type (PDF or image)`);
      setIsUploadingDocs(false);
      return;
    }

    // Validate file size: max 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`${file.name} is too large (max 5MB)`);
      setIsUploadingDocs(false);
      return;
    }

    // Convert to base64
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const docData = {
        name: type === 'pan' ? 'PAN Card' : 'Business License',
        fileName: file.name,
        data: base64,
        type: file.type,
      };

      if (type === 'pan') {
        setPanCard(docData);
      } else {
        setBusinessLicense(docData);
      }
      toast.success(`${type === 'pan' ? 'PAN Card' : 'Business License'} added`);
    } catch (error) {
      toast.error(`Failed to read ${file.name}`);
    }
    setIsUploadingDocs(false);
    // Reset input
    e.target.value = '';
  };

  // Remove document
  const removeDocument = (type) => {
    if (type === 'pan') {
      setPanCard(null);
    } else {
      setBusinessLicense(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.storeName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setLocalLoading(true);

      const documents = [];
      if (panCard) documents.push(panCard);
      if (businessLicense) documents.push(businessLicense);

      const result = await registerVendor({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        storeName: formData.storeName,
        storeDescription: formData.storeDescription,
        address: formData.address,
        documents: documents,
        vendorType,
        subscriptionPlan: null,
      });

      setLocalLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Show message that OTP has been sent (not registration successful yet)
      toast.success('Verification code sent to your email. Please verify to complete registration.');
      // Navigate to verification page
      navigate('/vendor/verification', { state: { email: formData.email, vendorType } });
    } catch (error) {
      setLocalLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Extract error message
      const errorMessage = error?.message ||
        error?.response?.data?.message ||
        'Registration failed. Please check your information and try again.';
      // Show error toast (API interceptor won't show for auth pages)
      toast.error(errorMessage);
    }
  };

  const isButtonLoading = localLoading || isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4 py-8 relative overflow-hidden">
      {/* Decorative Background Elements */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative"
      >
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"
        >
          <FiArrowLeft size={24} />
        </button>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 gradient-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-green">
            <FiShoppingBag className="text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Become a Vendor</h1>
          <p className="text-gray-600">Register your retail store and start selling today</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="pt-6 border-t border-gray-100">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="vendor@example.com"
                      className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1234567890"
                      className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Store Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Store Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiShoppingBag className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="storeName"
                      value={formData.storeName}
                      onChange={handleChange}
                      placeholder="My Awesome Store"
                      className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Store Description
                  </label>
                  <textarea
                    name="storeDescription"
                    value={formData.storeDescription}
                    onChange={handleChange}
                    placeholder="Describe your store and products..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Street Address
                  </label>
                  <div className="relative">
                    <FiMapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleChange}
                      placeholder="123 Main Street"
                      className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Area / Locality</label>
                  <input
                    type="text"
                    name="address.area"
                    value={formData.address.area}
                    onChange={handleChange}
                    placeholder="Sector 12 / Near Park"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    placeholder="New York"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    placeholder="NY"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Zip Code</label>
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    placeholder="10001"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    placeholder="USA"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className="w-full pl-12 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 text-gray-800 placeholder:text-gray-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Upload Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Documents</h3>
              <p className="text-sm text-gray-600 mb-6">
                Upload your PAN Card and Business License for verification (PDF or Images, max 5MB each)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PAN Card Upload */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    PAN Card <span className="text-red-500">*</span>
                  </label>
                  {!panCard ? (
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,application/pdf,image/*"
                        onChange={(e) => handleDocumentUpload(e, 'pan')}
                        className="hidden"
                        id="pan-upload"
                        disabled={isUploadingDocs}
                      />
                      <label
                        htmlFor="pan-upload"
                        className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all ${isUploadingDocs ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FiUpload className="text-2xl text-gray-400" />
                        <span className="text-sm text-gray-500 font-medium">Upload PAN Card</span>
                        <span className="text-xs text-gray-400">PDF or Image (max 5MB)</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border-2 border-primary-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <FiFile className="text-primary-600 text-lg" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">
                            {panCard.fileName}
                          </p>
                          <p className="text-xs text-primary-600">PAN Card</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument('pan')}
                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                      >
                        <FiX />
                      </button>
                    </div>
                  )}
                </div>

                {/* Business License Upload */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Business License <span className="text-red-500">*</span>
                  </label>
                  {!businessLicense ? (
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,application/pdf,image/*"
                        onChange={(e) => handleDocumentUpload(e, 'license')}
                        className="hidden"
                        id="license-upload"
                        disabled={isUploadingDocs}
                      />
                      <label
                        htmlFor="license-upload"
                        className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all ${isUploadingDocs ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FiUpload className="text-2xl text-gray-400" />
                        <span className="text-sm text-gray-500 font-medium">Upload License</span>
                        <span className="text-xs text-gray-400">PDF or Image (max 5MB)</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border-2 border-primary-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <FiFile className="text-primary-600 text-lg" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">
                            {businessLicense.fileName}
                          </p>
                          <p className="text-xs text-primary-600">Business License</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument('license')}
                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                      >
                        <FiX />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your registration will be reviewed by our admin team.
                You'll receive an email once your account is approved.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isButtonLoading}
              className="w-full gradient-green text-white py-3 rounded-xl font-semibold hover:shadow-glow-green transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isButtonLoading ? 'Registering...' : 'Register as Vendor'}
            </button>

            {/* Login & Switch Links */}
            <div className="text-center space-y-4 pt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/vendor/login"
                  className="text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Login
                </Link>
              </p>

              <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Wholesale Vendor?</span>
                <Link to="/b2b-vendor/register" className="text-primary-600 font-bold hover:underline">
                  Switch to B2B Vendor Register
                </Link>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default VendorRegister;

