import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiPlus,
    FiCalendar,
    FiImage,
    FiExternalLink,
    FiClock,
    FiCheckCircle,
    FiInfo,
    FiCreditCard,
    FiEye,
} from "react-icons/fi";
import { BiWallet } from "react-icons/bi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { formatPrice } from "../../../shared/utils/helpers";
import Badge from "../../../shared/components/Badge";
import DataTable from "../../Admin/components/DataTable";
import {
    getAvailableBannerSlots,
    getMyBannerBookings,
    createBannerBooking,
    confirmBannerPayment,
    cancelBannerBooking
} from "../services/b2bBannerService";
import { initializeRazorpayCheckout, handlePaymentSuccess } from "../../../shared/services/paymentService";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";

const B2BBannerBooking = () => {
    const navigate = useNavigate();
    const { vendor } = useB2BVendorAuthStore();
    const [slots, setSlots] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [settings, setSettings] = useState({
        bookingWindowDays: 30,
        minDurationHours: 24,
        maxDurationHours: 720,
        defaultPricePerDay: 2999,
        pricingStructure: {}
    });
    const [loading, setLoading] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [showWalletConfirm, setShowWalletConfirm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);


    // Standard date formatter for B2B Banners (Literal UTC-to-IST)
    const formatISTDate = (val) => {
        if (!val) return "";
        // Database stores as 00:00 UTC to represent 00:00 IST
        // So we just take the date part from ISO string
        return new Date(val).toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        title: "",
        link: "",
        image: null,
        preview: null,
        startDate: "",
        durationDays: 1,
        durationType: "day",
        paymentMethod: "razorpay", // Add paymentMethod
    });


    // Prevent duplicate API calls in React StrictMode
    const hasLoadedData = useRef(false);

    useEffect(() => {
        if (!hasLoadedData.current) {
            hasLoadedData.current = true;
            loadData();
        }
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [slotsRes, bookingsRes] = await Promise.all([
                getAvailableBannerSlots(),
                getMyBannerBookings()
            ]);

            // Handle slots response structure (same as HeroBannerBooking)
            // Backend returns: { success: true, data: { slots: [], settings: {} } }
            // Interceptor returns that object as `slotsRes`
            // So we need to access slotsRes.data.slots or slotsRes.data.data.slots depending on interceptor behavior
            const payload = slotsRes?.data || slotsRes; // Fallback in case structure changes

            if (payload && Array.isArray(payload.slots)) {
                setSlots(payload.slots);
                setSettings({
                    bookingWindowDays: payload.settings?.bookingWindowDays || 30,
                    minDurationHours: payload.settings?.minDurationHours || 24,
                    maxDurationHours: payload.settings?.maxDurationHours || 720,
                    defaultPricePerDay: payload.settings?.defaultPricePerDay || 2999,
                    pricingStructure: payload.settings?.pricingStructure || {}
                });
                setWalletBalance(payload.walletBalance || 0);
            } else if (payload?.success && payload?.data) {
                // Handle case where response is { success: true, data: { slots: [], settings: {} } }
                const data = payload.data;
                if (Array.isArray(data.slots)) {
                    setSlots(data.slots);
                    setSettings({
                        bookingWindowDays: data.settings?.bookingWindowDays || 30,
                        minDurationHours: data.settings?.minDurationHours || 24,
                        maxDurationHours: data.settings?.maxDurationHours || 720,
                        defaultPricePerDay: data.settings?.defaultPricePerDay || 2999,
                        pricingStructure: data.settings?.pricingStructure || {}
                    });
                    setWalletBalance(data.walletBalance || 0);

                } else {
                    setSlots([]);
                    console.warn("Unexpected slots response structure", slotsRes);
                }
            } else {
                setSlots([]);
                console.warn("Unexpected slots response structure", slotsRes);
            }

            // Handle bookings response
            const bookingsPayload = bookingsRes?.data || bookingsRes;
            if (Array.isArray(bookingsPayload)) {
                setBookings(bookingsPayload);
            } else if (bookingsPayload?.success && bookingsPayload?.data) {
                const bookingsData = Array.isArray(bookingsPayload.data) ? bookingsPayload.data : [];
                setBookings(bookingsData);
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error(error?.response?.data?.message || 'Failed to load banner data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate price based on duration and selected slot price
    const calculatedPrice = useMemo(() => {
        const slotPricePerDay = selectedSlot?.price || settings.defaultPricePerDay || 2999;
        const durationDays = formData.durationDays || 1;
        return Math.round(slotPricePerDay * durationDays);
    }, [formData.durationDays, settings, selectedSlot]);

    // Calculate End Date for display
    const calculatedEndDate = useMemo(() => {
        if (!formData.startDate) return null;

        // Use the same normalization logic as backend
        const start = new Date(formData.startDate);
        start.setUTCHours(0, 0, 0, 0);

        const durationInDays = parseInt(formData.durationDays) || 1;
        const end = new Date(start);
        end.setUTCHours(end.getUTCHours() + (durationInDays * 24));
        end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

        return end;
    }, [formData.startDate, formData.durationDays]);

    const checkOverlap = (startDate, durationDays, slot) => {
        if (!slot) return false;

        // Combine current and upcoming bookings for checking
        const allBookings = [];
        if (slot.currentBooking) allBookings.push(slot.currentBooking);
        if (slot.upcomingBookings) allBookings.push(...slot.upcomingBookings);

        if (allBookings.length === 0) return false;

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);

        const durationInDays = parseInt(durationDays) || 1;
        const end = new Date(start);
        end.setUTCHours(end.getUTCHours() + (durationInDays * 24));
        end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

        return allBookings.some(booking => {
            const bStart = new Date(booking.startDate);
            const bEnd = new Date(booking.endDate);
            return (start <= bEnd && end >= bStart);
        });
    };

    // Get min and max dates for date picker
    const { minDate, maxDate } = useMemo(() => {
        const now = new Date();
        const min = now.toISOString().split('T')[0];
        const max = new Date(now.getTime() + (settings.bookingWindowDays * 24 * 60 * 60 * 1000));
        const maxStr = max.toISOString().split('T')[0];
        return { minDate: min, maxDate: maxStr };
    }, [settings.bookingWindowDays]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error("Please upload an image file (PNG, JPG)");
                return;
            }

            if (file.size > 400 * 1024) {
                toast.error("Image size should be less than 400KB. Ideal size 250-400KB.");
                return;
            }

            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                if (img.width < 1000) {
                    toast.error("For best quality, banner width should be at least 1000px");
                }
                setFormData({
                    ...formData,
                    image: file,
                    preview: img.src,
                });
            };
        }
    };

    const removeImage = () => {
        setFormData({
            ...formData,
            image: null,
            preview: null,
        });
    };

    const handleDateChange = (e) => {
        setFormData({
            ...formData,
            startDate: e.target.value,
        });
    };

    const handleDurationChange = (e) => {
        let val = parseInt(e.target.value) || 1;
        val = Math.max(1, Math.round(val));

        setFormData(prev => ({
            ...prev,
            durationDays: val
        }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!formData.image) {
            toast.error("Please upload a banner image");
            return;
        }

        if (!formData.startDate) {
            toast.error("Please select a start date");
            return;
        }

        const localSelectedDate = new Date(`${formData.startDate}T00:00:00`); 
        const now = new Date();
        const maxDateObj = new Date(now.getTime() + (settings.bookingWindowDays * 24 * 60 * 60 * 1000));

        if (localSelectedDate < now) {
            toast.error("Start time cannot be in the past");
            return;
        }

        if (localSelectedDate > maxDateObj) {
            toast.error(`Start date cannot be more than ${settings.bookingWindowDays} days in the future`);
            return;
        }

        if (checkOverlap(formData.startDate, formData.durationDays, selectedSlot)) {
            toast.error("This slot is already booked for the selected dates. Please choose different dates.");
            return;
        }

        // If paying with wallet, show confirmation modal first
        if (formData.paymentMethod === 'wallet' && !showWalletConfirm) {
            setShowWalletConfirm(true);
            return;
        }

        setLoading(true);
        setIsProcessing(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('slotId', selectedSlot._id);
            formDataToSend.append('startDate', formData.startDate);
            formDataToSend.append('durationDays', formData.durationDays.toString());
            formDataToSend.append('title', formData.title || '');
            formDataToSend.append('link', formData.link || '/');
            formDataToSend.append('image', formData.image);
            formDataToSend.append('paymentMethod', formData.paymentMethod);
            formDataToSend.append('bannerType', 'b2b');

            const response = await createBannerBooking(formDataToSend);
            const responseData = response;

            if (responseData?.success) {
                const bookingData = responseData.data;

                if (bookingData.paymentStatus === 'paid' && bookingData.paymentMethod === 'wallet') {
                    toast.success("Banner booking created successfully using wallet! Awaiting admin approval.");
                    setShowWalletConfirm(false);
                    setShowBookingModal(false);
                    resetForm();
                    await loadData();
                } else if (bookingData.razorpayOrder) {
                    toast.success("Booking initiated! Opening payment gateway...");
                    await handleRazorpayPayment(
                        bookingData._id,
                        bookingData.razorpayOrder,
                        bookingData.amount,
                        bookingData.razorpayKeyId
                    );
                } else {
                    toast.error("Booking created but payment gateway failed.");
                    await loadData();
                    setShowBookingModal(false);
                    resetForm();
                }
            } else {
                toast.error(responseData?.message || 'Failed to create banner booking');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create banner booking';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            setIsProcessing(false);
        }
    };

    const handleRazorpayPayment = async (bookingId, razorpayOrder, amount, razorpayKeyId = null) => {
        try {
            const keyId = razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

            if (!keyId) {
                toast.error("Payment gateway not configured. Please contact support.");
                return;
            }

            await initializeRazorpayCheckout({
                key: keyId,
                amount: amount,
                currency: 'INR',
                name: 'Dealing India',
                description: `B2B Banner Booking - ${bookingId}`,
                orderId: razorpayOrder.id,
                prefill: {
                    name: '',
                    email: '',
                    contact: '',
                },
                handler: async (paymentResponse) => {
                    try {
                        const paymentData = handlePaymentSuccess(paymentResponse);

                        await confirmBannerPayment({
                            bookingId,
                            razorpayPaymentId: paymentData.razorpayPaymentId,
                            razorpayOrderId: paymentData.razorpayOrderId,
                            razorpaySignature: paymentData.razorpaySignature,
                            paymentMethod: 'razorpay'
                        });

                        toast.success("Payment successful! Your banner booking is pending admin approval.");
                        setShowBookingModal(false);
                        resetForm();
                        await loadData();
                    } catch (error) {
                        console.error("Payment confirmation error:", error);
                        toast.error(error?.response?.data?.message || error?.message || "Payment verification failed. Please contact support.");
                    }
                },
                modal: {
                    ondismiss: async () => {
                        try {
                            toast.error("Payment cancelled");
                            await cancelBannerBooking(bookingId);
                            await loadData(); // Refresh list to remove the temp booking
                        } catch (err) {
                            console.error("Error cancelling booking:", err);
                        }
                    },
                },
            });
        } catch (error) {
            console.error("Razorpay payment error:", error);
            toast.error(error?.message || "Failed to open payment gateway. Please try again.");
        }
    };

    const resetForm = () => {
        setFormData({
            title: "",
            link: "",
            image: null,
            preview: null,
            startDate: "",
            durationDays: 1,
            durationType: "day",
            paymentMethod: "razorpay"
        });
        setSelectedSlot(null);
    };

    const openBookingModal = (slot) => {
        setSelectedSlot(slot);
        const shopUrl = window.location.origin + `/b2b/vendor/${vendor?._id || vendor?.id || ''}`;
        setFormData({
            title: "",
            link: shopUrl,
            image: null,
            preview: null,
            startDate: "",
            durationDays: 1,
            durationType: "day",
            paymentMethod: "razorpay"
        });
        setShowBookingModal(true);
    };

    const columns = [
        {
            header: "Reference ID",
            accessor: "referenceId",
            render: (val) => <span className="font-medium text-gray-900">{val}</span>,
        },
        {
            header: "Banner",
            accessor: "bannerImage",
            render: (val) => (
                <div className="relative group/img">
                    <img src={val} alt="Banner" className="h-10 w-20 object-cover rounded border" />
                    <a
                        href={val}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity rounded"
                    >
                        <FiEye className="text-white text-xs" />
                    </a>
                </div>
            ),
        },
        {
            header: "Slot",
            accessor: "slotId",
            render: (val) => `Slot ${val?.slotNumber || "N/A"}`,
        },
        {
            header: "Duration",
            accessor: "durationHours",
            render: (val, row) => {
                const days = row.durationDays || (row.durationHours ? row.durationHours / 24 : 1);
                return <span className="text-sm text-gray-600">{days} Day{days !== 1 ? 's' : ''}</span>;
            },
        },
        {
            header: "Price",
            accessor: "amount",
            render: (val) => formatPrice(val),
        },
        {
            header: "Status",
            accessor: "status",
            render: (val) => (
                <Badge variant={val === "active" ? "success" : val === "pending" ? "warning" : "error"}>
                    {val.toUpperCase()}
                </Badge>
            ),
        },
        {
            header: "Show Dates",
            accessor: "startDate",
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                        {formatISTDate(val)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                        to {formatISTDate(row.endDate)}
                    </span>
                </div>
            ),
        },
        {
            header: "Booking Date",
            accessor: "createdAt",
            render: (val) => <span className="text-gray-500">{new Date(val).toLocaleDateString()}</span>,
        },
        {
            header: "Actions",
            accessor: "_id",
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => toast.info("View details coming soon")}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="View Details"
                    >
                        <FiInfo className="text-lg" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">B2B Banner Booking</h1>
                    <p className="text-gray-500 text-sm">Book banner slots to promote your B2B business on the marketplace</p>
                </div>

                {/* Wallet Balance Card */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <BiWallet size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Wallet Balance</p>
                        <p className="text-xl font-bold text-gray-900">{formatPrice(walletBalance)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
                {slots.map((slot) => {
                    const isBookedNow = slot.currentBooking &&
                        (slot.currentBooking.status === 'active' || slot.currentBooking.status === 'pending' || slot.currentBooking.status === 'approved');

                    const hasUpcoming = slot.upcomingBookings && slot.upcomingBookings.length > 0;

                    return (
                        <motion.div
                            key={slot._id}
                            whileHover={{ y: -5 }}
                            className={`p-4 rounded-xl border-2 transition-all ${isBookedNow
                                ? "bg-blue-50/50 border-blue-100"
                                : "bg-white border-blue-100 hover:border-blue-500 shadow-sm hover:shadow-md"
                                } cursor-pointer`}
                            onClick={() => openBookingModal(slot)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Slot {slot.slotNumber}</span>
                                {isBookedNow ? (
                                    <Badge variant={slot.currentBooking.status === 'active' ? "info" : "warning"}>
                                        {slot.currentBooking.status === 'active' ? "Active" : "Reserved"}
                                    </Badge>
                                ) : hasUpcoming ? (
                                    <Badge variant="warning">Upcoming Bookings</Badge>
                                ) : (
                                    <Badge variant="success">Available</Badge>
                                )}
                            </div>
                            <div className="text-xl font-bold text-gray-900 mb-1">{formatPrice(slot.price)} <span className="text-[10px] text-gray-400 font-medium">+ GST</span></div>
                            <p className="text-xs text-gray-500 mb-4">Exclusive of 18% GST</p>

                            <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                <FiPlus /> Book Now
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">My B2B Banner Bookings</h2>
                </div>
                <DataTable
                    columns={columns}
                    data={bookings}
                    loading={loading}
                    pagination={false}
                />
            </div>

            {/* Booking Modal */}
            <AnimatePresence>
                {showBookingModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50 sticky top-0 z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Book B2B Banner Slot {selectedSlot?.slotNumber}</h3>
                                    <p className="text-sm text-blue-600 font-medium">Promote your B2B business on the marketplace</p>
                                </div>
                                <button
                                    onClick={() => (setShowBookingModal(false), resetForm())}
                                    className="p-2 hover:bg-white rounded-full transition-colors"
                                >
                                    <FiPlus className="rotate-45 text-2xl text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="space-y-4">
                                    {/* Booked Dates Info */}
                                    {(selectedSlot?.currentBooking || (selectedSlot?.upcomingBookings && selectedSlot.upcomingBookings.length > 0)) && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                                                <FiCalendar /> Already Booked Dates (Unavailable):
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedSlot.currentBooking && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                                                        {formatISTDate(selectedSlot.currentBooking.startDate)} to {formatISTDate(selectedSlot.currentBooking.endDate)}
                                                    </span>
                                                )}
                                                {selectedSlot.upcomingBookings?.map(b => (
                                                    <span key={b._id} className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                                                        {formatISTDate(b.startDate)} to {formatISTDate(b.endDate)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Start Date Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                            <FiCalendar className="text-blue-600" />
                                            Start Date
                                            <div className="group relative">
                                                <FiInfo className="text-gray-400 cursor-help" />
                                                <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg z-20">
                                                    You can book dates up to {settings.bookingWindowDays} days in advance. Dates cannot be in the past.
                                                    Booking applies from selected date until midnight.
                                                </div>
                                            </div>
                                        </label>
                                        <div className="flex gap-3">
                                            <input
                                                type="date"
                                                required
                                                min={minDate}
                                                max={maxDate}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                value={formData.startDate}
                                                onChange={handleDateChange}
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Available dates: {new Date(minDate).toLocaleDateString()} to {new Date(maxDate).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Duration Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                            <FiClock className="text-blue-600" />
                                            Duration (Days)
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                max="30"
                                                step="1"
                                                className="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                value={formData.durationDays}
                                                onChange={handleDurationChange}
                                            />
                                            <span className="text-sm text-gray-600">
                                                Day{formData.durationDays !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {calculatedEndDate && (
                                            <p className="mt-2 text-sm text-green-600 font-medium">
                                                Will be active from {formData.startDate} (12:00 AM) to {formatISTDate(calculatedEndDate)} (11:59 PM)
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Base Booking Fee ({formData.durationDays} Day{formData.durationDays !== 1 ? 's' : ''})</span>
                                            <span className="font-bold text-gray-900">{formatPrice(calculatedPrice)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">GST (18%)</span>
                                            <span className="font-bold text-gray-900">{formatPrice(Math.round(calculatedPrice * 0.18))}</span>
                                        </div>
                                        <div className="h-px bg-blue-100/50 my-1" />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Total Amount</p>
                                                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">Final Payable Price</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-blue-600 tracking-tight">{formatPrice(Math.round(calculatedPrice * 1.18))}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">Incl. all taxes</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Method Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Payment Method
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: "razorpay" }))}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.paymentMethod === "razorpay"
                                                    ? "border-blue-600 bg-blue-50 text-blue-600"
                                                    : "border-gray-100 hover:border-gray-200 text-gray-600"
                                                    }`}
                                            >
                                                <FiCreditCard className="text-xl mb-1" />
                                                <span className="text-xs font-semibold uppercase">Razorpay</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const totalForCheck = Math.round(calculatedPrice * 1.18);
                                                    if (walletBalance < totalForCheck) {
                                                        toast.error(`Insufficient wallet balance. Required: ₹${totalForCheck.toLocaleString('en-IN')}`);
                                                        return;
                                                    }
                                                    setFormData(prev => ({ ...prev, paymentMethod: "wallet" }));
                                                }}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.paymentMethod === "wallet"
                                                    ? "border-green-600 bg-green-50 text-green-600"
                                                    : walletBalance < Math.round(calculatedPrice * 1.18)
                                                        ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60"
                                                        : "border-gray-100 hover:border-gray-200 text-gray-600"
                                                    }`}
                                            >
                                                <BiWallet className="text-xl mb-1" />
                                                <span className="text-xs font-semibold uppercase tracking-tight">Wallet (₹{walletBalance.toLocaleString('en-IN')})</span>
                                            </button>
                                        </div>
                                        {formData.paymentMethod === "wallet" && (
                                            <p className="mt-2 text-[10px] text-green-600 font-medium">
                                                * Amount will be deducted from your wallet immediately upon booking.
                                            </p>
                                        )}
                                    </div>

                                    {/* Banner Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Banner Title
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Wholesale Electronics Sale"
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.title}
                                            onChange={(e) =>
                                                setFormData({ ...formData, title: e.target.value })
                                            }
                                        />
                                    </div>

                                    {/* Banner Image */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Banner Image
                                        </label>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors relative group">
                                            {formData.preview ? (
                                                <div className="relative w-full">
                                                    <img
                                                        src={formData.preview}
                                                        alt="Preview"
                                                        className="max-h-40 w-full object-cover rounded"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={removeImage}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                                    >
                                                        <FiPlus className="rotate-45" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-1 text-center">
                                                    <FiImage className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="flex text-sm text-gray-600 justify-center">
                                                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                            <span>Upload a file</span>
                                                            <input
                                                                type="file"
                                                                className="sr-only"
                                                                accept="image/*"
                                                                onChange={handleFileChange}
                                                            />
                                                        </label>
                                                        <p className="pl-1">or drag and drop</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        PNG, JPG up to 2MB
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Image Guidelines */}
                                        <div className="mt-3 bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                                            <FiInfo className="text-blue-500 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-blue-700">
                                                <p className="font-semibold mb-1">Recommended Guidelines:</p>
                                                <ul className="list-disc pl-4 space-y-0.5">
                                                    <li>Aspect Ratio: 3:1 (e.g., 1200x400px)</li>
                                                    <li>Keep text away from edges</li>
                                                    <li>Use high-quality images</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Target URL */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Redirect URL (Pre-filled with your Shop)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiExternalLink className="text-gray-400" />
                                            </div>
                                            <input
                                                type="url"
                                                placeholder="https://example.com/your-product"
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                value={formData.link}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, link: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => (setShowBookingModal(false), resetForm())}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !formData.startDate || !formData.image}
                                        className={`px-8 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                                            formData.paymentMethod === 'wallet' 
                                            ? 'bg-green-600 text-white hover:bg-green-700' 
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    >
                                        {loading ? (
                                            "Processing..."
                                        ) : (
                                            <>
                                                {formData.paymentMethod === 'wallet' ? <BiWallet /> : <FiCreditCard />}
                                                {formData.paymentMethod === 'wallet' ? 'Confirm Booking' : `Pay ${formatPrice(Math.round(calculatedPrice * 1.18))}`}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Wallet Confirmation Modal */}
            <AnimatePresence>
                {showWalletConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowWalletConfirm(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="bg-green-600 p-6 text-white text-center">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BiWallet size={32} />
                                </div>
                                <h3 className="text-xl font-bold">Use Wallet Balance?</h3>
                                <p className="text-green-50 text-sm opacity-90">Instant deduction from your wallet</p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm text-gray-500 font-medium">Slot {selectedSlot?.slotNumber} Booking</span>
                                        <span className="text-sm font-bold text-gray-900">{formData.durationDays} Days</span>
                                    </div>
                                    <div className="h-px bg-gray-200/50 my-2" />
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Base Price</span>
                                            <span className="font-semibold">{formatPrice(calculatedPrice)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">GST (0%)</span>
                                            <span className="font-semibold text-green-600">₹0 (Already Paid)</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-black text-blue-600 pt-2 border-t border-gray-100">
                                            <span>Total</span>
                                            <span>{formatPrice(calculatedPrice)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center px-2">
                                    <span className="text-sm text-gray-500 font-medium">Your Balance</span>
                                    <span className="text-lg font-bold text-gray-900">{formatPrice(walletBalance)}</span>
                                </div>

                                {walletBalance < calculatedPrice ? (
                                    <div className="space-y-3">
                                        <p className="text-center text-xs text-red-500 font-bold uppercase tracking-tight">
                                            Insufficient Balance
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/b2b-vendor/wallet')}
                                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                        >
                                            Recharge Wallet
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowWalletConfirm(false)}
                                            className="py-4 border-2 border-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSubmit()}
                                            disabled={isProcessing}
                                            className="py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2"
                                        >
                                            {isProcessing ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <>Confirm Pay</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default B2BBannerBooking;
