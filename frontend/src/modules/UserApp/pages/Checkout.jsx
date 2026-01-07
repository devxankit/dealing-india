import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  FiMapPin,
  FiCreditCard,
  FiTruck,
  FiCheck,
  FiX,
  FiPlus,
  FiArrowLeft,
  FiShoppingBag,
  FiChevronRight,
  FiEdit2,
  FiTag,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "../../../shared/store/useStore";
import { useAuthStore } from "../../../shared/store/authStore";
import { useAddressStore } from "../../../shared/store/addressStore";
import { useOrderStore } from "../../../shared/store/orderStore";
import { useSettingsStore } from "../../../shared/store/settingsStore";
import { formatPrice } from "../../../shared/utils/helpers";
import toast from "react-hot-toast";
import { initializeRazorpayCheckout, handlePaymentSuccess, handlePaymentError } from "../../../shared/services/paymentService";
import MobileLayout from "../components/Layout/MobileLayout";
import MobileCheckoutSteps from "../components/Mobile/MobileCheckoutSteps";
import PageTransition from "../../../shared/components/PageTransition";
import "../../../shared/styles/orderAnimation.css";
import api from "../../../shared/utils/api";
// import successSound from '../../../data/sounds/success.mp3'; // File not found

const MobileCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const buyNowItem = location.state?.buyNowItem;

  const { items: cartItems, getTotal, clearCart, getItemsByVendor } = useCartStore();

  // Use buyNowItem if it exists, otherwise use cartItems
  const items = useMemo(() => {
    return buyNowItem ? [buyNowItem] : cartItems;
  }, [buyNowItem, cartItems]);

  const { user, isAuthenticated } = useAuthStore();
  const { addresses, getDefaultAddress, addAddress, fetchAddresses } = useAddressStore();
  const { createOrderAPI, verifyPaymentAPI } = useOrderStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isAuthenticated, fetchAddresses]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Group items by vendor
  const itemsByVendor = useMemo(() => {
    if (buyNowItem) {
      const vendorId = buyNowItem.vendorId || 'default';
      return { [vendorId]: [buyNowItem] };
    }
    return getItemsByVendor();
  }, [items, buyNowItem, getItemsByVendor]);

  const [step, setStep] = useState(1);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [shippingOption, setShippingOption] = useState("standard");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
    state: "",
    country: "",
    paymentMethod: "card",
  });
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [deliveryData, setDeliveryData] = useState({ total: 0, breakdown: [] });
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);

  useEffect(() => {
    if (showCouponModal) {
      fetchAvailableCoupons();
    }
  }, [showCouponModal]);

  const fetchAvailableCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const response = await api.get('/public/promocodes/available');
      console.log('Fetch coupons response:', response);
      if (response && response.data && response.data.data) {
        // Handle both structure variations just in case
        const couponsData = response.data.data.coupons || response.data.coupons || [];
        console.log('Set available coupons:', couponsData);
        setAvailableCoupons(couponsData);
      } else if (response && response.data && response.data.coupons) {
        setAvailableCoupons(response.data.coupons || []);
      }
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Failed to load coupons");
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user && !isGuest) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      }));

      const defaultAddress = getDefaultAddress();
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setFormData((prev) => ({
          ...prev,
          name: defaultAddress.fullName || user.name || "",
          email: user.email || "",
          phone: defaultAddress.phone || user.phone || "",
          address: defaultAddress.address || "",
          city: defaultAddress.city || "",
          zipCode: defaultAddress.zipCode || "",
          state: defaultAddress.state || "",
          country: defaultAddress.country || "",
        }));
      }
    }
  }, [isAuthenticated, user, isGuest, getDefaultAddress]);

  // Calculate Delivery Charge dynamically
  useEffect(() => {
    const fetchDeliveryCharge = async () => {
      // If free shipping coupon, logic handled in discount, but base charge might still be needed?
      // Usually free shipping overrides everything.
      if (appliedCoupon?.type === "freeship") {
        setDeliveryData({ total: 0, breakdown: [] });
        return;
      }

      // We need address to calculate accurately.
      // If no address selected, we can't calculate perfectly.
      // But maybe we can try to find the selected address object?
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);

      if (!selectedAddr) {
        // Maybe default charge?
        setDeliveryData({ total: 50, breakdown: [] }); // Default fallback
        return;
      }

      setCalculatingDelivery(true);
      try {
        const response = await api.post('/public/delivery/calculate', {
          items: items.map(item => ({
            productId: item.productId || item.id,
            quantity: item.quantity
          })),
          address: {
            city: selectedAddr.city,
            state: selectedAddr.state
          }
        });

        if (response && response.data) {
          setDeliveryData(response.data);
        }
      } catch (error) {
        console.error("Delivery calc error:", error);
        // Fallback
        setDeliveryData({ total: 50, breakdown: [] });
      } finally {
        setCalculatingDelivery(false);
      }
    };

    fetchDeliveryCharge();
  }, [items, selectedAddressId, appliedCoupon]); // Recalculate if items or address changes

  const subtotal = useMemo(() => {
    if (buyNowItem) {
      return buyNowItem.price * buyNowItem.quantity;
    }
    return getTotal();
  }, [buyNowItem, getTotal, items]);

  const shipping = deliveryData.total;

  // Calculate tax based on product.taxRate for each item
  const tax = useMemo(() => {
    return items.reduce((sum, item) => {
      const itemSubtotal = (item.price || 0) * (item.quantity || 1);
      const itemTaxRate = item.taxRate || 0;
      const itemTax = item.taxIncluded ? 0 : (itemSubtotal * itemTaxRate) / 100;
      return sum + itemTax;
    }, 0);
  }, [items]);

  // Platform Fee / Tax from Settings
  const { settings, initialize: initSettings } = useSettingsStore();

  useEffect(() => {
    initSettings();
  }, []);

  const platformTax = useMemo(() => {
    if (!settings?.tax?.isEnabled) return 0;

    if (settings.tax.taxType === 'percentage') {
      return (subtotal * (settings.tax.taxValue || 0)) / 100;
    } else {
      return settings.tax.taxValue || 0;
    }
  }, [settings, subtotal]);

  const discount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? subtotal * (appliedCoupon.value / 100)
      : appliedCoupon.value
    : 0;
  const finalTotal = Math.max(0, subtotal + shipping + tax + platformTax - discount);

  const validateCoupon = async (codeToApply) => {
    if (!codeToApply || !codeToApply.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      const response = await api.post('/public/promocodes/validate', {
        code: codeToApply,
        cartTotal: total,
        cartItems: items.map(item => ({
          productId: item.productId || item.id, // Fixed: send productId instead of product
          price: item.price,
          quantity: item.quantity
        }))
      });

      if (response && response.data) {
        // Response format: { success, message, data: { isValid, discountAmount, type, value, ... } }
        const { discountAmount, code: validatedCode } = response.data; // Fixed: access data directly from response.data

        setAppliedCoupon({
          name: validatedCode,
          type: 'fixed', // Backend returns calculated amount, treat as fixed for display
          value: discountAmount
        });
        toast.success(`Coupon "${validatedCode}" applied! You saved ₹${discountAmount}`);
        setShowCouponModal(false);
      }
    } catch (error) {
      console.error("Coupon validation error:", error);
      const errorMessage = error.response?.data?.message || "Invalid coupon code";
      toast.error(errorMessage);
      setAppliedCoupon(null);
    }
  };

  const handleApplyCoupon = () => {
    validateCoupon(couponCode);
  };

  const handleSelectCoupon = (code) => {
    setCouponCode(code);
    validateCoupon(code);
  };

  const handleSelectAddress = (address) => {
    setSelectedAddressId(address.id);
    setFormData({
      ...formData,
      name: address.fullName,
      phone: address.phone,
      address: address.address,
      city: address.city,
      zipCode: address.zipCode,
      state: address.state,
      country: address.country,
    });
  };

  const handleNewAddress = (addressData) => {
    const newAddress = addAddress(addressData);
    handleSelectAddress(newAddress);
    setShowAddressForm(false);
    toast.success("Address added and selected!");
  };

  if (items.length === 0) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={false}>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Your cart is empty
              </h2>
              <button
                onClick={() => navigate("/app")}
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold">
                Continue Shopping
              </button>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (isAnimating || isProcessingPayment) return;

      // Start animation
      setIsAnimating(true);

      // Check if payment method requires Razorpay
      const onlinePaymentMethods = ['card', 'creditCard', 'debitCard', 'upi', 'wallet'];
      const requiresRazorpay = onlinePaymentMethods.includes(formData.paymentMethod);

      if (requiresRazorpay && isAuthenticated) {
        // For online payment, we start Razorpay after a short delay
        setTimeout(async () => {
          try {
            await handleOnlinePayment();
          } catch (error) {
            setIsAnimating(false);
          }
        }, 1500);
      } else {
        // For COD, we place order after animation has run for a bit
        setTimeout(() => {
          handleCODOrder();
        }, 1500);
      }

      // Reset animation after 10s as per user request (regardless of success/fail)
      setTimeout(() => setIsAnimating(false), 10000);
    }
  };

  const handleOnlinePayment = async () => {
    if (isProcessingPayment) return;

    setIsProcessingPayment(true);
    try {
      // Create order via API
      const orderData = {
        userId: user?.id,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId || item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
        shippingAddress: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
          state: formData.state,
          country: formData.country,
        },
        paymentMethod: formData.paymentMethod === 'card' ? 'creditCard' : formData.paymentMethod,
        subtotal: subtotal,
        shipping: shipping,
        tax: tax,
        discount: discount,
        total: finalTotal,
        couponCode: appliedCoupon ? couponCode : null,
      };

      const result = await createOrderAPI(orderData);
      const { order, razorpay } = result;

      if (!razorpay || !razorpay.orderId) {
        throw new Error('Failed to initialize payment gateway');
      }

      // Initialize Razorpay checkout
      await initializeRazorpayCheckout({
        key: razorpay.keyId,
        amount: finalTotal,
        currency: 'INR',
        name: 'Appzeto',
        description: `Order ${order.orderCode}`,
        orderId: razorpay.orderId,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        handler: async (paymentResponse) => {
          try {
            // Verify payment
            const paymentData = handlePaymentSuccess(paymentResponse);
            const verifyResult = await verifyPaymentAPI(order.id || order.orderCode, paymentData);

            if (!buyNowItem) {
              clearCart();
            }
            toast.success("Payment successful! Order placed.");
            navigate(`/app/order-confirmation/${order.id || order.orderCode}`);
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error("Payment verification failed. Please contact support.");
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
            toast.error("Payment cancelled");
          },
        },
      });
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessingPayment(false);
      toast.error(error.message || "Failed to process payment. Please try again.");
    }
  };

  const handleCODOrder = async () => {
    if (isProcessingPayment) return;

    setIsProcessingPayment(true);
    try {
      // Create order via API for COD
      const orderData = {
        userId: isAuthenticated ? user?.id : null,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId || item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
        shippingAddress: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
          state: formData.state,
          country: formData.country,
        },
        paymentMethod: formData.paymentMethod === 'cash' ? 'cod' : formData.paymentMethod,
        subtotal: total,
        shipping: shipping,
        tax: tax,
        discount: discount,
        total: finalTotal,
        couponCode: appliedCoupon ? couponCode : null,
      };

      const result = await createOrderAPI(orderData);
      const order = result.order || result.data?.order || result;
      const orderId = order?.id || order?.orderCode || order?._id || result?.order?.id || result?.order?.orderCode;

      if (!orderId) {
        throw new Error('Failed to get order ID from response');
      }

      if (!buyNowItem) {
        clearCart();
      }
      toast.success("Order placed successfully!");
      navigate(`/app/order-confirmation/${orderId}`);
    } catch (error) {
      console.error('COD order error:', error);
      toast.error(error.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <PageTransition>
      <MobileLayout showBottomNav={false} showCartBar={false}>
        <div className="w-full pb-24">
          {/* Clean Checkout Header */}
          <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <FiArrowLeft className="text-2xl text-gray-700" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">Checkout</h1>
                    <p className="text-sm text-gray-500">
                      Step {step} of 2 • {step === 1 ? 'Shipping' : 'Payment'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-10 h-1.5 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-gray-200'}`} />
                  <div className={`w-10 h-1.5 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-gray-200'}`} />
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Shipping Information */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-4 py-5">
                <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <FiTruck className="text-primary-600 text-xl" />
                  Shipping Information
                </h2>

                {/* Saved Addresses */}
                {isAuthenticated && addresses.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Saved Addresses
                    </h3>
                    <div className="space-y-2 mb-3">
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          onClick={() => handleSelectAddress(address)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedAddressId === address.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200"
                            }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2 flex-1">
                              <FiMapPin className="text-primary-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-800 text-sm">
                                  {address.name}
                                </h4>
                                <p className="text-xs text-gray-600">
                                  {address.fullName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {address.address}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {address.city}, {address.state}{" "}
                                  {address.zipCode}
                                </p>
                              </div>
                            </div>
                            {selectedAddressId === address.id && (
                              <FiCheck className="text-primary-600 text-xl flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(true)}
                      className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm">
                      <FiPlus />
                      Add New Address
                    </button>
                  </div>
                )}

                {/* Address Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 1 Actions */}
                <div className="mt-8">
                  <button
                    type="submit"
                    className="w-full h-12 gradient-green text-white rounded-xl font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.98] shadow-lg shadow-green-500/30">
                    CONTINUE TO PAYMENT
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-4 py-5">
                <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <FiCreditCard className="text-primary-600 text-xl" />
                  Payment Method
                </h2>
                <div className="space-y-3 mb-5">
                  {[
                    { value: "card", label: "Credit/Debit Card", online: true },
                    { value: "upi", label: "UPI", online: true },
                    { value: "wallet", label: "Wallet", online: true },
                    { value: "cash", label: "Cash on Delivery", online: false },
                  ].map((method) => (
                    <label
                      key={method.value}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === method.value
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200"
                        } ${!isAuthenticated && method.online ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={formData.paymentMethod === method.value}
                        onChange={handleInputChange}
                        disabled={!isAuthenticated && method.online}
                        className="w-5 h-5 text-primary-500"
                      />
                      <span className="font-semibold text-gray-800 text-base">
                        {method.label}
                        {!isAuthenticated && method.online && (
                          <span className="text-xs text-red-500 ml-2">(Login required)</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Shipping Options */}
                {total < 100 && (
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-gray-800 mb-3">
                      Shipping Options
                    </h3>
                    <div className="space-y-3">
                      <label
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${shippingOption === "standard"
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200"
                          }`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingOption"
                            value="standard"
                            checked={shippingOption === "standard"}
                            onChange={(e) => setShippingOption(e.target.value)}
                            className="w-5 h-5 text-primary-500"
                          />
                          <div>
                            <span className="font-semibold text-gray-800 text-base">
                              Standard Shipping
                            </span>
                            <p className="text-sm text-gray-500">
                              5-7 business days
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-gray-800 text-base">
                          {formatPrice(50)}
                        </span>
                      </label>
                      <label
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${shippingOption === "express"
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200"
                          }`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingOption"
                            value="express"
                            checked={shippingOption === "express"}
                            onChange={(e) => setShippingOption(e.target.value)}
                            className="w-5 h-5 text-primary-500"
                          />
                          <div>
                            <span className="font-semibold text-gray-800 text-base">
                              Express Shipping
                            </span>
                            <p className="text-sm text-gray-500">
                              2-3 business days
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-gray-800 text-base">
                          {formatPrice(100)}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Coupon Code */}
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-gray-800 mb-3">
                    Coupon Code
                  </h3>
                  {!appliedCoupon ? (
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter code"
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-5 py-3 gradient-green text-white rounded-xl font-semibold text-base hover:shadow-glow-green transition-all">
                        Apply
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          {appliedCoupon.name} Applied
                        </p>
                        <p className="text-sm text-green-600">
                          Code: {couponCode}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponCode("");
                        }}
                        className="text-red-600 hover:text-red-700">
                        <FiX className="text-xl" />
                      </button>
                    </div>
                  )}
                  {/* View Available Coupons Link */}
                  <button
                    type="button"
                    onClick={() => setShowCouponModal(true)}
                    className="mt-2 text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1"
                  >
                    <FiTag className="w-4 h-4" /> View Available Coupons
                  </button>
                </div>

                {/* Order Summary */}
                <div className="glass-card rounded-xl p-4">
                  <h3 className="text-base font-bold text-gray-800 mb-3">
                    Order Summary
                  </h3>
                  <div className="space-y-3 mb-4">
                    {itemsByVendor.map((vendorGroup) => (
                      <div
                        key={vendorGroup.vendorId}
                        className="space-y-2 mb-3">
                        {/* Vendor Header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200/50">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                            <FiShoppingBag className="text-white text-[10px]" />
                          </div>
                          <span className="text-sm font-bold text-primary-700 flex-1">
                            {vendorGroup.vendorName}
                          </span>
                          <span className="text-sm font-semibold text-primary-600 bg-white px-2 py-0.5 rounded">
                            {formatPrice(vendorGroup.subtotal)}
                          </span>
                        </div>
                        {/* Vendor Items */}
                        <div className="space-y-2 pl-2">
                          {vendorGroup.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate text-sm">
                                  {item.name}
                                </p>
                                <p className="text-gray-500 text-sm">
                                  {formatPrice(item.price)} × {item.quantity}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span>
                        {shipping === 0 ? (
                          <span className="text-green-600 font-semibold">
                            FREE
                          </span>
                        ) : (
                          formatPrice(shipping)
                        )}
                      </span>
                    </div>
                    {tax > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Tax (GST)</span>
                        <span>{formatPrice(tax)}</span>
                      </div>
                    )}
                    {platformTax > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>{settings?.tax?.taxName || 'Service Fee'}</span>
                        <span>{formatPrice(platformTax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-gray-800 pt-3 border-t border-gray-200">
                      <span>Total</span>
                      <span className="text-primary-600">
                        {formatPrice(finalTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Inline Navigation Buttons (Moved from floating) */}
                  <div className="mt-8 flex gap-3">
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={() => setStep(step - 1)}
                        className="h-12 px-6 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 active:scale-95">
                        BACK
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isProcessingPayment || (step === 2 && isAnimating)}
                      className={`flex-1 h-12 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${step === 2 ? 'order' : 'bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50'} ${isAnimating ? 'animate' : ''}`}>
                      {step === 2 ? (
                        <>
                          <span className="default">
                            {isProcessingPayment ? "PROCESSING..." : "PLACE ORDER"}
                          </span>
                          <span className="success">
                            <svg viewBox="0 0 12 10">
                              <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                            </svg>
                            ORDER PLACED
                          </span>
                          <div className="truck">
                            <div className="back"></div>
                            <div className="front">
                              <div className="window"></div>
                            </div>
                            <div className="light"></div>
                          </div>
                          <div className="box"></div>
                          <div className="lines"></div>
                        </>
                      ) : (
                        "CONTINUE"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}


          </form>
        </div>

        {/* Address Form Modal */}
        <AnimatePresence>
          {showAddressForm && (
            <AddressFormModal
              onSubmit={handleNewAddress}
              onCancel={() => setShowAddressForm(false)}
            />
          )}
        </AnimatePresence>

        {/* Coupon Selection Modal */}
        <AnimatePresence>
          {showCouponModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCouponModal(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
              />

              {/* Modal/Sheet Content */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-xl pointer-events-auto max-h-[80vh] overflow-hidden flex flex-col"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Available Coupons</h3>
                  <button
                    onClick={() => setShowCouponModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 space-y-3 p-1">
                  {loadingCoupons ? (
                    <div className="text-center py-8">
                      <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading coupons...</p>
                    </div>
                  ) : availableCoupons.length > 0 ? (
                    availableCoupons.map((coupon) => (
                      <div
                        key={coupon._id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectCoupon(coupon.code)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-primary-700 text-lg border-2 border-dashed border-primary-200 px-2 py-0.5 rounded bg-white">
                            {coupon.code}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{coupon.name}</p>
                        <button
                          className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                        >
                          Apply <FiChevronRight />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FiTag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No coupons available at the moment.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </MobileLayout>
    </PageTransition>
  );
};

// Address Form Modal Component
const AddressFormModal = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    fullName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onCancel}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl p-6 w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Add New Address</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full">
            <FiX className="text-xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Address Label
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
              placeholder="Home, Work, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Street Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Zip Code
              </label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 gradient-green text-white py-3 rounded-xl font-semibold hover:shadow-glow-green transition-all">
              Add Address
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default MobileCheckout;
