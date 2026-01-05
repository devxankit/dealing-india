import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiVideo, FiImage, FiAlertCircle, FiCheckCircle, FiCreditCard } from "react-icons/fi";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { createVendorReel } from "../../services/reelService";
import { getVendorProducts } from "../../services/productService";
import AnimatedSelect from "../../../../modules/Admin/components/AnimatedSelect";
import api from "../../../../shared/utils/api";
import { initializeRazorpayCheckout, handlePaymentSuccess } from "../../../../shared/services/paymentService";
import toast from "react-hot-toast";

// Suppress Razorpay SVG warnings (these are from Razorpay's checkout modal, not our code)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    // Filter out Razorpay SVG attribute warnings
    const errorString = args[0]?.toString?.() || '';
    if (errorString.includes('Expected length') && errorString.includes('auto')) {
      return; // Suppress SVG width/height "auto" warnings from Razorpay
    }
    originalError.apply(console, args);
  };
}

const AddReel = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const [loading, setLoading] = useState(false);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [extraCharge, setExtraCharge] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [formData, setFormData] = useState({
    productId: "",
    productName: "",
    productPrice: "",
    vendorName: vendor?.storeName || vendor?.name || "",
    vendorId: vendor?.id || null,
    status: "draft",
    likes: 0,
    comments: 0,
    shares: 0,
  });

  useEffect(() => {
    loadVendorProducts();
    loadSubscription();
  }, [vendor?.id]);

  useEffect(() => {
    if (subscription && subscription.status === 'active') {
      checkPaymentRequirement();
    }
  }, [subscription]);

  const loadSubscription = async () => {
    if (!vendor?.id) return;
    
    try {
      setSubscriptionLoading(true);
      const response = await api.get('/vendor/subscriptions/current');
      if (response.success && response.data) {
        const sub = response.data;
        setSubscription({
          tierName: sub.tierId?.name || 'Free',
          status: sub.status,
          endDate: sub.endDate ? new Date(sub.endDate) : null,
          usage: {
            reelsUploaded: sub.usage?.reelsUploaded || 0,
            limit: sub.tierId?.reelLimit === -1 ? -1 : (sub.tierId?.reelLimit || 0)
          }
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const checkPaymentRequirement = async () => {
    if (!vendor?.id || !subscription) return;
    
    try {
      const response = await api.get('/vendor/subscriptions/check-reel-payment');
      if (response.success && response.data) {
        setPaymentRequired(response.data.requiresPayment);
        setExtraCharge(response.data.extraCharge || 0);
        setPaymentVerified(false); // Reset on check
      }
    } catch (error) {
      console.error('Error checking payment requirement:', error);
    }
  };

  const loadVendorProducts = async () => {
    if (!vendor?.id) return;

    try {
      const response = await getVendorProducts({ limit: 1000 });
      // Handle both response structures
      if (response?.data?.products) {
        setVendorProducts(response.data.products);
      } else if (response?.products) {
        setVendorProducts(response.products);
      } else if (Array.isArray(response)) {
        setVendorProducts(response);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  useEffect(() => {
    if (formData.productId) {
      const product = vendorProducts.find((p) => (p._id || p.id)?.toString() === formData.productId);
      if (product) {
        setFormData((prev) => ({
          ...prev,
          productName: product.name,
          productPrice: product.price,
        }));
        // Set thumbnail preview from product image if no thumbnail file is selected
        if (!thumbnailFile && product.image) {
          setThumbnailPreview(product.image);
        }
      }
    }
  }, [formData.productId, vendorProducts, thumbnailFile]);

  // Re-check payment requirement when product is selected and subscription is active
  useEffect(() => {
    if (subscription && subscription.status === 'active' && formData.productId && videoFile) {
      checkPaymentRequirement();
    }
  }, [formData.productId, videoFile, subscription?.status]);

  // Handle video file selection
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'];
      const validExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        toast.error('Please select a valid video file (mp4, mov, avi, wmv, flv, webm, mkv)');
        return;
      }

      // Validate file size (100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('Video file size should be less than 100MB');
        return;
      }

      setVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  // Handle thumbnail file selection
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid image file (jpeg, jpg, png, gif, webp)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Thumbnail file size should be less than 5MB');
        return;
      }

      setThumbnailFile(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePayment = async () => {
    if (processingPayment) return;

    try {
      setProcessingPayment(true);
      
      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        // Wait a bit for script to load
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (typeof window.Razorpay === 'undefined') {
          throw new Error('Razorpay payment gateway is not loaded. Please refresh the page and try again.');
        }
      }
      
      // Initialize payment
      const response = await api.post('/vendor/subscriptions/initialize-extra-reel-payment');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to initialize payment');
      }

      const { razorpay, razorpayKeyId, extraCharge: chargeAmount } = response.data;

      if (!razorpay || !razorpay.orderId) {
        throw new Error('Payment order not created. Please try again.');
      }

      if (!razorpayKeyId) {
        throw new Error('Payment gateway not configured. Please contact support.');
      }

      // Ensure we use the extra charge amount (₹10), not product price
      // chargeAmount is already in rupees from backend (e.g., 10 for ₹10)
      // razorpay.amount is in paise (e.g., 1000 paise = ₹10)
      // Use chargeAmount directly as it's the correct extra reel charge amount
      if (!chargeAmount || chargeAmount <= 0) {
        throw new Error('Invalid payment amount. Please try again.');
      }
      
      const paymentAmount = chargeAmount; // Use extraCharge directly (₹10), not product price

      // Get vendor info for prefill
      const vendorInfo = JSON.parse(localStorage.getItem('vendor') || '{}');

      try {
        await initializeRazorpayCheckout({
          key: razorpayKeyId,
          amount: paymentAmount, // Use extraCharge amount (₹10), not product price
          currency: razorpay.currency || 'INR',
          name: 'Dealing India',
          description: `Extra Reel Upload Payment - ₹${chargeAmount}`,
          orderId: razorpay.orderId,
          prefill: {
            name: vendorInfo.businessName || vendorInfo.storeName || vendor?.storeName || '',
            email: vendorInfo.email || vendor?.email || '',
            contact: vendorInfo.phone || vendor?.phone || '',
          },
          handler: async (paymentResponse) => {
            try {
              const paymentData = handlePaymentSuccess(paymentResponse);
              
              const verifyResponse = await api.post('/vendor/subscriptions/verify-extra-reel-payment', {
                razorpayOrderId: paymentData.razorpayOrderId,
                razorpayPaymentId: paymentData.razorpayPaymentId,
                razorpaySignature: paymentData.razorpaySignature,
              });

              if (verifyResponse.success) {
                toast.success('Payment successful! Uploading reel...');
                setPaymentVerified(true);
                setPaymentRequired(false);
                // Reload subscription to update extraReelsCharged
                await loadSubscription();
                await checkPaymentRequirement();
                // After payment, proceed with upload
                await proceedWithUpload(true);
              } else {
                throw new Error(verifyResponse.message || 'Payment verification failed');
              }
            } catch (error) {
              console.error('Payment verification error:', error);
              const errorMessage = error.response?.data?.message || error.message || 'Payment verification failed';
              toast.error(errorMessage);
              setProcessingPayment(false);
              setPaymentVerified(false);
              // Don't proceed with upload if verification fails
            }
          },
          modal: {
            ondismiss: () => {
              setProcessingPayment(false);
              toast.error('Payment cancelled');
            },
          },
        });
      } catch (paymentError) {
        // Handle payment cancellation or errors
        if (paymentError.message === 'Payment cancelled by user') {
          setProcessingPayment(false);
          // Don't show error toast as it's already shown in modal.ondismiss
          return;
        }
        throw paymentError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      setProcessingPayment(false);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process payment';
      toast.error(errorMessage);
    }
  };

  const proceedWithUpload = async (isPaymentVerified = false) => {
    setLoading(true);

    try {
      // Validate required fields manually (since hidden inputs can't use HTML5 validation)
      if (!videoFile) {
        toast.error("Please upload a video file");
        setLoading(false);
        return;
      }

      if (!formData.productId) {
        toast.error("Please select a product");
        setLoading(false);
        return;
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('video', videoFile);
      if (thumbnailFile) {
        formDataToSend.append('thumbnail', thumbnailFile);
      }
      formDataToSend.append('productId', formData.productId);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('likes', formData.likes);
      formDataToSend.append('comments', formData.comments);
      formDataToSend.append('shares', formData.shares);
      formDataToSend.append('views', 0);
      formDataToSend.append('paymentVerified', isPaymentVerified);

      await createVendorReel(formDataToSend);
      toast.success("Reel added successfully!");
      // Reload subscription to update usage
      await loadSubscription();
      await checkPaymentRequirement();
      setPaymentVerified(false);
      navigate("/vendor/reels/all-reels");
    } catch (error) {
      console.error("Error adding reel:", error);
      const errorMessage = error.response?.data?.message || "Failed to add reel. Please try again.";
      toast.error(errorMessage);
      
      // If payment required error, show payment option
      if (error.response?.data?.code === 'PAYMENT_REQUIRED') {
        setPaymentRequired(true);
        setExtraCharge(error.response?.data?.extraCharge || 0);
      }
      
      // If subscription-related error, redirect to subscription page
      if (error.response?.data?.code === 'NO_SUBSCRIPTION' || 
          error.response?.data?.code === 'SUBSCRIPTION_EXPIRED' ||
          error.response?.data?.code === 'SUBSCRIPTION_INACTIVE') {
        setTimeout(() => navigate('/vendor/subscription'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Check subscription status before proceeding
      if (!subscription) {
        toast.error("You must have an active subscription to upload reels. Please subscribe to a plan first.");
        navigate('/vendor/subscription');
        return;
      }

      if (subscription.status !== 'active') {
        toast.error(`Your subscription is ${subscription.status}. Please activate your subscription to upload reels.`);
        navigate('/vendor/subscription');
        return;
      }

      if (subscription.endDate && subscription.endDate < new Date()) {
        toast.error("Your subscription has expired. Please renew your subscription to continue uploading reels.");
        navigate('/vendor/subscription');
        return;
      }

      // Check if payment is required
      if (paymentRequired && !paymentVerified) {
        // Trigger payment flow
        await handlePayment();
        return;
      }

      // Proceed with upload
      await proceedWithUpload(paymentVerified);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  const canUploadReel = () => {
    if (!subscription) return false;
    if (subscription.status !== 'active') return false;
    if (subscription.endDate && subscription.endDate < new Date()) return false;
    return true;
  };

  const getReelLimitStatus = () => {
    if (!subscription || subscription.usage.limit === -1) return null;
    const { reelsUploaded, limit } = subscription.usage;
    const percentage = (reelsUploaded / limit) * 100;
    return { reelsUploaded, limit, percentage };
  };

  const limitStatus = getReelLimitStatus();
  const canUpload = canUploadReel();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Reel</h1>
          <p className="text-gray-500 mt-1">Showcase your products with engaging video content.</p>
        </div>
        <button
          onClick={() => navigate("/vendor/reels/all-reels")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <FiX className="text-xl" />
          <span className="font-medium">Cancel</span>
        </button>
      </div>

      {/* Subscription Status Banner */}
      {subscriptionLoading ? (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">Loading subscription status...</span>
          </div>
        </div>
      ) : !canUpload ? (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-red-600 text-xl mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Subscription Required</h3>
              <p className="text-sm text-red-700 mb-3">
                {!subscription 
                  ? "You must have an active subscription to upload reels. Please subscribe to a plan first."
                  : subscription.status !== 'active'
                  ? `Your subscription is ${subscription.status}. Please activate your subscription to upload reels.`
                  : "Your subscription has expired. Please renew your subscription to continue uploading reels."
                }
              </p>
              <button
                onClick={() => navigate('/vendor/subscription')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
              >
                Go to Subscription
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <FiCheckCircle className="text-blue-600 text-xl mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900">Active Subscription: {subscription.tierName}</h3>
                {limitStatus && (
                  <span className="text-sm font-medium text-blue-700">
                    {limitStatus.reelsUploaded} / {limitStatus.limit === -1 ? '∞' : limitStatus.limit} reels
                  </span>
                )}
              </div>
              {limitStatus && (
                <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      limitStatus.percentage >= 90 ? 'bg-red-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(limitStatus.percentage, 100)}%` }}
                  ></div>
                </div>
              )}
              {limitStatus && limitStatus.percentage >= 90 && (
                <p className="text-xs text-blue-700">
                  {limitStatus.percentage >= 100 
                    ? "You've reached your reel limit. Additional reels will be charged extra."
                    : "You're approaching your reel limit. Additional reels will be charged extra."
                  }
                </p>
              )}
              {paymentRequired && !paymentVerified && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    Payment Required for This Reel
                  </p>
                  <p className="text-xs text-yellow-700">
                    {subscription.usage.limit === 0 
                      ? "Free plan requires payment of ₹" + extraCharge + " for each reel upload."
                      : "You've reached your plan limit. Additional reels cost ₹" + extraCharge + " each."
                    }
                  </p>
                </div>
              )}
              {paymentVerified && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-900">
                    ✓ Payment verified! You can now upload the reel.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <FiVideo className="text-xl" />
              </span>
              <h2 className="text-lg font-bold text-gray-800">Reel Details</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Product <span className="text-red-500">*</span>
                </label>
                <AnimatedSelect
                  value={formData.productId}
                  onChange={(e) => {
                    const value = e?.target?.value || e;
                    setFormData((prev) => ({ ...prev, productId: value }));
                  }}
                  options={[
                    { value: "", label: "Select a product to feature" },
                    ...vendorProducts.map((product) => ({
                      value: (product._id || product.id).toString(),
                      label: `${product.name} - ₹${product.price}`,
                    })),
                  ]}
                  className="bg-gray-50 border-gray-200 text-gray-900"
                  name="productId"
                  required
                />
              </div>

              {/* Video & Thumbnail */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Video <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/mp4,video/mov,video/avi,video/wmv,video/flv,video/webm,video/mkv"
                      onChange={handleVideoChange}
                      className="hidden"
                      id="video-upload"
                    />
                    <label
                      htmlFor="video-upload"
                      className="flex items-center gap-3 w-full pl-4 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 cursor-pointer hover:bg-gray-100 transition-all"
                    >
                      <FiVideo className="text-gray-400 text-xl" />
                      <span className="flex-1 text-sm">
                        {videoFile ? videoFile.name : "Choose video file (max 100MB)"}
                      </span>
                      <FiUpload className="text-gray-400" />
                    </label>
                  </div>
                  {videoFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Thumbnail (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleThumbnailChange}
                      className="hidden"
                      id="thumbnail-upload"
                    />
                    <label
                      htmlFor="thumbnail-upload"
                      className="flex items-center gap-3 w-full pl-4 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 cursor-pointer hover:bg-gray-100 transition-all"
                    >
                      <FiImage className="text-gray-400 text-xl" />
                      <span className="flex-1 text-sm">
                        {thumbnailFile ? thumbnailFile.name : "Choose thumbnail (max 5MB)"}
                      </span>
                      <FiUpload className="text-gray-400" />
                    </label>
                  </div>
                  {thumbnailFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {thumbnailFile.name} ({(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Publication Status
                </label>
                <div className="w-full md:w-1/2">
                  <AnimatedSelect
                    value={formData.status}
                    onChange={(e) => {
                      const value = e?.target?.value || e;
                      setFormData((prev) => ({ ...prev, status: value }));
                    }}
                    options={[
                      { value: "draft", label: "Save as Draft" },
                      { value: "active", label: "Publish Immediately" },
                      { value: "archived", label: "Archived" },
                    ]}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                    name="status"
                  />
                </div>
              </div>

              {/* Social Proof Seeding */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Initial Engagement (Optional)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Likes</label>
                    <input
                      type="number"
                      name="likes"
                      value={formData.likes}
                      onChange={handleChange}
                      min="0"
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Comments</label>
                    <input
                      type="number"
                      name="comments"
                      value={formData.comments}
                      onChange={handleChange}
                      min="0"
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Shares</label>
                    <input
                      type="number"
                      name="shares"
                      value={formData.shares}
                      onChange={handleChange}
                      min="0"
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/vendor/reels/all-reels")}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canUpload || processingPayment}
              className={`${
                canUpload 
                  ? paymentRequired && !paymentVerified
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-purple-600 hover:bg-purple-700"
                  : "bg-gray-400 cursor-not-allowed"
              } text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2`}
            >
              {processingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Payment...
                </>
              ) : loading ? (
                <>
                  <FiSave />
                  Saving...
                </>
              ) : !canUpload ? (
                <>
                  <FiAlertCircle />
                  Subscription Required
                </>
              ) : paymentRequired && !paymentVerified ? (
                <>
                  <FiCreditCard />
                  Pay & Publish Reel (₹{extraCharge})
                </>
              ) : (
                <>
                  <FiSave />
                  Publish Reel
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-4">
          <div className="sticky top-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Mobile Preview</h3>
            <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-gray-800 relative aspect-[9/19] max-w-[300px] mx-auto">
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>

              {/* Video Content */}
              {videoPreview || thumbnailPreview ? (
                <div className="relative w-full h-full">
                  {videoPreview ? (
                    <video
                      src={videoPreview}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      onEnded={(e) => {
                        e.target.currentTime = 0;
                        e.target.play().catch(() => {});
                      }}
                      onError={(e) => {
                        const video = e.target;
                        if (!video.getAttribute('src')) return;
                        if (video.error) {
                          if (video.error.code === 4 && (!video.src || video.src === window.location.href)) return;
                          console.error("Preview Video Error:", video.error);
                        }
                      }}
                    />
                  ) : (
                    <img src={thumbnailPreview} className="w-full h-full object-cover" alt="Preview" />
                  )}

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none"></div>

                  {/* Right Actions Bar */}
                  <div className="absolute right-4 bottom-20 flex flex-col gap-6 items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                        <span className="text-xl">❤️</span>
                      </div>
                      <span className="text-white text-xs font-medium">{formData.likes || 0}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                        <span className="text-xl">💬</span>
                      </div>
                      <span className="text-white text-xs font-medium">{formData.comments || 0}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                        <span className="text-xl">↗️</span>
                      </div>
                      <span className="text-white text-xs font-medium">{formData.shares || 0}</span>
                    </div>
                  </div>

                  {/* Bottom Info */}
                  <div className="absolute bottom-4 left-4 right-16 text-white text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
                        {vendor?.storeName?.[0] || 'V'}
                      </div>
                      <span className="font-semibold text-sm shadow-sm">{vendor?.storeName || 'Your Store'}</span>
                    </div>
                    <p className="text-sm line-clamp-2 leading-snug opacity-90">
                      {formData.productName ? `Check out ${formData.productName}!` : 'Product description will appear here...'}
                    </p>
                    {formData.productPrice && (
                      <div className="mt-2 inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
                        ₹ {formData.productPrice}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900">
                  <FiVideo className="text-4xl mb-2 opacity-50" />
                  <p className="text-xs">Preview will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddReel;
