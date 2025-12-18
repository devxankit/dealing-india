import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiMapPin,
  FiPhone,
  FiMail,
  FiCreditCard,
  FiTruck,
  FiCheck,
  FiX,
  FiPlus,
  FiShoppingBag,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "../../../shared/store/useStore";
import { useAuthStore } from "../../../shared/store/authStore";
import { useAddressStore } from "../../../shared/store/addressStore";
import { useOrderStore } from "../../../shared/store/orderStore";
import { formatPrice } from "../../../shared/utils/helpers";
import toast from "react-hot-toast";
import Header from "../components/Layout/Header";
import Navbar from "../components/Layout/Navbar";
import Footer from "../components/Layout/Footer";
import PageTransition from "../../../shared/components/PageTransition";
import Breadcrumbs from "../components/Layout/Breadcrumbs";
// import successSound from '../../../data/sounds/success.mp3'; // File not found
import useResponsiveHeaderPadding from "../../../shared/hooks/useResponsiveHeaderPadding";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart, getItemsByVendor } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { addresses, getDefaultAddress, addAddress } = useAddressStore();
  const { createOrder } = useOrderStore();
  const { responsivePadding } = useResponsiveHeaderPadding();

  // Group items by vendor
  const itemsByVendor = useMemo(
    () => getItemsByVendor(),
    [items, getItemsByVendor]
  );

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

  // Pre-fill form data from user profile
  useEffect(() => {
    if (isAuthenticated && user && !isGuest) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      }));

      // Try to get default address
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

  // Calculate shipping cost
  const calculateShipping = () => {
    const total = getTotal();
    const freeShippingThreshold = 100;

    if (appliedCoupon?.type === "freeship") {
      return 0;
    }

    if (total >= freeShippingThreshold) {
      return 0;
    }

    if (shippingOption === "express") {
      return 100;
    }

    return 50; // Standard shipping
  };

  const total = getTotal();
  const shipping = calculateShipping();
  const tax = total * 0.1;
  const discount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? total * (appliedCoupon.value / 100)
      : appliedCoupon.value
    : 0;
  const finalTotal = Math.max(0, total + shipping + tax - discount);

  // Coupon validation
  const validateCoupon = (code) => {
    const coupons = {
      SAVE10: { type: "percentage", value: 10, name: "10% Off" },
      FREESHIP: { type: "freeship", value: 0, name: "Free Shipping" },
      WELCOME20: { type: "percentage", value: 20, name: "20% Off" },
      SAVE50: { type: "fixed", value: 50, name: "$50 Off" },
    };

    return coupons[code.toUpperCase()] || null;
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    const coupon = validateCoupon(couponCode);
    if (coupon) {
      setAppliedCoupon(coupon);
      toast.success(`Coupon "${coupon.name}" applied!`);
    } else {
      toast.error("Invalid coupon code");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.success("Coupon removed");
  };

  // Handle address selection
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

  // Handle new address from form
  const handleNewAddress = (addressData) => {
    const newAddress = addAddress(addressData);
    handleSelectAddress(newAddress);
    setShowAddressForm(false);
    toast.success("Address added and selected!");
  };

  if (items.length === 0) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
          <Header />
          <Navbar />
          <main className="w-full overflow-x-hidden flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Your cart is empty
              </h2>
              <button
                onClick={() => navigate("/")}
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold">
                Continue Shopping
              </button>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      // Place order
      const order = createOrder({
        userId: isAuthenticated ? user?.id : null,
        items: items,
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
        paymentMethod: formData.paymentMethod,
        subtotal: total,
        shipping: shipping,
        tax: tax,
        discount: discount,
        total: finalTotal,
        couponCode: appliedCoupon ? couponCode : null,
      });

      clearCart();

      // Play success sound
      // const audio = new Audio(successSound); // Commented out - file not found
      // audio.play().catch((error) => {
      //   console.log('Could not play sound:', error);
      // });

      toast.success("Order placed successfully!");
      navigate(`/order-confirmation/${order.id}`);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
        <Header />
        <Navbar />
        <main
          className="w-full overflow-x-hidden"
          style={{ paddingTop: `${responsivePadding}px` }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-2">
            <div className="max-w-5xl mx-auto">
              <Breadcrumbs />
              <h1 className="text-3xl font-bold text-gray-800 mb-8">
                Checkout
              </h1>

              {/* Guest Checkout Option */}
              {!isAuthenticated && !isGuest && (
                <div className="glass-card rounded-2xl p-6 mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        Have an account?
                      </h3>
                      <p className="text-sm text-gray-600">
                        Sign in for faster checkout and order tracking
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        to="/login"
                        className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300">
                        Sign In
                      </Link>
                      <button
                        onClick={() => setIsGuest(true)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                        Continue as Guest
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center gap-4">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          step >= s
                            ? "gradient-green text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}>
                        {s}
                      </div>
                      {s < 3 && (
                        <div
                          className={`w-16 h-1 mx-2 ${
                            step > s ? "gradient-green" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2">
                  <form onSubmit={handleSubmit}>
                    {/* Step 1: Shipping Information */}
                    {step === 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <FiTruck className="text-green-500" />
                          Shipping Information
                        </h2>

                        {/* Saved Addresses Selection */}
                        {isAuthenticated && addresses.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">
                              Saved Addresses
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              {addresses.map((address) => (
                                <div
                                  key={address.id}
                                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                    selectedAddressId === address.id
                                      ? "border-primary-500 bg-primary-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                  onClick={() => handleSelectAddress(address)}>
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <FiMapPin className="text-primary-600" />
                                      <h4 className="font-bold text-gray-800">
                                        {address.name}
                                      </h4>
                                      {address.isDefault && (
                                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-semibold">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    {selectedAddressId === address.id && (
                                      <FiCheck className="text-primary-600 text-xl" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {address.fullName}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {address.address}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {address.city}, {address.state}{" "}
                                    {address.zipCode}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowAddressForm(true)}
                              className="flex items-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                              <FiPlus />
                              Add New Address
                            </button>
                            <div className="my-4 border-t border-gray-200"></div>
                          </div>
                        )}

                        {/* Address Form Modal */}
                        <AnimatePresence>
                          {showAddressForm && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                              onClick={() => setShowAddressForm(false)}>
                              <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                  <h3 className="text-xl font-bold text-gray-800">
                                    Add New Address
                                  </h3>
                                  <button
                                    onClick={() => setShowAddressForm(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full">
                                    <FiX className="text-xl" />
                                  </button>
                                </div>
                                <AddressForm
                                  onSubmit={handleNewAddress}
                                  onCancel={() => setShowAddressForm(false)}
                                />
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Full Name
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Email
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              City
                            </label>
                            <input
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              ZIP Code
                            </label>
                            <input
                              type="text"
                              name="zipCode"
                              value={formData.zipCode}
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Country
                            </label>
                            <input
                              type="text"
                              name="country"
                              value={formData.country}
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Address
                            </label>
                            <textarea
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              required
                              rows={3}
                              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2: Payment */}
                    {step === 2 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <FiCreditCard className="text-green-500" />
                          Payment Method
                        </h2>
                        <div className="space-y-4">
                          {["card", "cash", "bank"].map((method) => (
                            <label
                              key={method}
                              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                formData.paymentMethod === method
                                  ? "border-primary-500 bg-primary-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}>
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={method}
                                checked={formData.paymentMethod === method}
                                onChange={handleInputChange}
                                className="w-5 h-5 text-primary-500"
                              />
                              <span className="font-semibold text-gray-800 capitalize">
                                {method === "card"
                                  ? "Credit/Debit Card"
                                  : method === "cash"
                                  ? "Cash on Delivery"
                                  : "Bank Transfer"}
                              </span>
                            </label>
                          ))}
                        </div>

                        {/* Shipping Options */}
                        {total < 100 && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                              Shipping Options
                            </h3>
                            <div className="space-y-3">
                              <label
                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  shippingOption === "standard"
                                    ? "border-primary-500 bg-primary-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}>
                                <div>
                                  <input
                                    type="radio"
                                    name="shippingOption"
                                    value="standard"
                                    checked={shippingOption === "standard"}
                                    onChange={(e) =>
                                      setShippingOption(e.target.value)
                                    }
                                    className="w-5 h-5 text-primary-500 mr-3"
                                  />
                                  <span className="font-semibold text-gray-800">
                                    Standard Shipping
                                  </span>
                                  <p className="text-sm text-gray-600">
                                    5-7 business days
                                  </p>
                                </div>
                                <span className="font-bold text-gray-800">
                                  {formatPrice(50)}
                                </span>
                              </label>
                              <label
                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  shippingOption === "express"
                                    ? "border-primary-500 bg-primary-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}>
                                <div>
                                  <input
                                    type="radio"
                                    name="shippingOption"
                                    value="express"
                                    checked={shippingOption === "express"}
                                    onChange={(e) =>
                                      setShippingOption(e.target.value)
                                    }
                                    className="w-5 h-5 text-primary-500 mr-3"
                                  />
                                  <span className="font-semibold text-gray-800">
                                    Express Shipping
                                  </span>
                                  <p className="text-sm text-gray-600">
                                    2-3 business days
                                  </p>
                                </div>
                                <span className="font-bold text-gray-800">
                                  {formatPrice(100)}
                                </span>
                              </label>
                            </div>
                            {total >= 50 && (
                              <p className="mt-3 text-sm text-primary-600 font-semibold">
                                💡 Add {formatPrice(100 - total)} more for free
                                shipping!
                              </p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                          Order Review
                        </h2>
                        <div className="space-y-4 mb-6">
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                            <FiMapPin className="text-green-500 text-xl" />
                            <div>
                              <p className="font-semibold text-gray-800">
                                {formData.address}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formData.city}, {formData.zipCode}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                            <FiPhone className="text-green-500 text-xl" />
                            <p className="font-semibold text-gray-800">
                              {formData.phone}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                            <FiMail className="text-green-500 text-xl" />
                            <p className="font-semibold text-gray-800">
                              {formData.email}
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-gray-200 pt-6">
                          <h3 className="font-bold text-gray-800 mb-4">
                            Order Items
                          </h3>
                          <div className="space-y-6">
                            {itemsByVendor.map((vendorGroup) => (
                              <div
                                key={vendorGroup.vendorId}
                                className="space-y-3">
                                {/* Vendor Header */}
                                <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg">
                                  <FiShoppingBag className="text-primary-600" />
                                  <span className="font-semibold text-primary-700">
                                    {vendorGroup.vendorName}
                                  </span>
                                  <span className="text-sm text-primary-600 ml-auto">
                                    {formatPrice(vendorGroup.subtotal)}
                                  </span>
                                </div>
                                {/* Vendor Items */}
                                <div className="space-y-3 pl-2">
                                  {vendorGroup.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-4">
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-16 h-16 rounded-lg object-cover"
                                      />
                                      <div className="flex-1">
                                        <p className="font-semibold text-gray-800">
                                          {item.name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          {formatPrice(item.price)} ×{" "}
                                          {item.quantity}
                                        </p>
                                      </div>
                                      <p className="font-bold text-gray-800">
                                        {formatPrice(
                                          item.price * item.quantity
                                        )}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-4">
                      {step > 1 && (
                        <button
                          type="button"
                          onClick={() => setStep(step - 1)}
                          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors">
                          Back
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 gradient-green text-white py-3 rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 hover:scale-105">
                        {step === 3 ? "Place Order" : "Continue"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="glass-card rounded-2xl p-6 sticky top-4">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">
                      Order Summary
                    </h2>
                    <div className="space-y-4 mb-6">
                      {itemsByVendor.map((vendorGroup) => (
                        <div key={vendorGroup.vendorId} className="space-y-3">
                          {/* Vendor Header */}
                          <div className="flex items-center gap-2 px-2 py-1 bg-primary-50 rounded-lg">
                            <FiShoppingBag className="text-primary-600 text-xs" />
                            <span className="text-xs font-semibold text-primary-700">
                              {vendorGroup.vendorName}
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
                                  <p className="text-sm font-semibold text-gray-800 truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {formatPrice(item.price)} × {item.quantity}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Coupon Code */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      {!appliedCoupon ? (
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Coupon Code
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              placeholder="Enter code"
                              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              className="px-4 py-2 gradient-green text-white rounded-lg font-semibold text-sm hover:shadow-glow-green transition-all">
                              Apply
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="text-sm font-semibold text-green-800">
                              {appliedCoupon.name} Applied
                            </p>
                            <p className="text-xs text-green-600">
                              Code: {couponCode}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-red-600 hover:text-red-700">
                            <FiX className="text-lg" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-4 space-y-2">
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
                      <div className="flex justify-between text-gray-600">
                        <span>Tax</span>
                        <span>{formatPrice(tax)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-primary-600">
                          {formatPrice(finalTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

// Address Form Component for Modal
const AddressForm = ({ onSubmit, onCancel }) => {
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
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
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
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
  );
};

export default Checkout;
