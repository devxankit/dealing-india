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

const B2BBannerBooking = () => {
    const navigate = useNavigate();
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

    const [formData, setFormData] = useState({
        title: "",
        link: "",
        image: null,
        preview: null,
        startDate: "",
        durationDays: 1,
        durationType: "day",
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

        // Use UTC midnight to avoid timezone shifts
        const start = new Date(`${formData.startDate}T00:00:00.000Z`);
        const days = parseInt(formData.durationDays) || 1;
        const end = new Date(start);
        // End at 23:59:59 of the last day (UTC)
        end.setUTCDate(end.getUTCDate() + days - 1);
        end.setUTCHours(23, 59, 59, 999);

        return end;
    }, [formData.startDate, formData.durationDays]);

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
        e.preventDefault();

        if (!formData.image) {
            toast.error("Please upload a banner image");
            return;
        }

        if (!formData.startDate) {
            toast.error("Please select a start date");
            return;
        }

        // Handle date to avoid timezone conversion issues
        // User selects date like "2026-01-21" - we want to store exactly that date
        // Send date-only string to backend, which will interpret it as UTC midnight
        // This ensures the date stored matches what user selected

        // For validation, use local date comparison (user's perspective)
        const localSelectedDate = new Date(`${formData.startDate}T00:00:00`); // Local time for validation
        const now = new Date();
        const maxDateObj = new Date(now.getTime() + (settings.bookingWindowDays * 24 * 60 * 60 * 1000));

        // Compare using local dates for user-friendly validation
        if (localSelectedDate < now) {
            toast.error("Start time cannot be in the past");
            return;
        }

        if (localSelectedDate > maxDateObj) {
            toast.error(`Start date cannot be more than ${settings.bookingWindowDays} days in the future`);
            return;
        }

        setLoading(true);

        try {
            // Validate required fields before creating FormData
            if (!selectedSlot || !selectedSlot._id) {
                toast.error("Please select a slot");
                setLoading(false);
                return;
            }

            if (!formData.image) {
                toast.error("Please upload a banner image");
                setLoading(false);
                return;
            }

            // Create FormData for the booking
            const formDataToSend = new FormData();
            formDataToSend.append('slotId', selectedSlot._id);
            // Send date-only string (YYYY-MM-DD) - backend will interpret as UTC midnight
            // This ensures the selected date is stored correctly without timezone shifts
            formDataToSend.append('startDate', formData.startDate);
            formDataToSend.append('durationDays', formData.durationDays.toString());
            formDataToSend.append('title', formData.title || '');
            formDataToSend.append('link', formData.link || '/');
            formDataToSend.append('image', formData.image);
            formDataToSend.append('paymentMethod', 'razorpay'); // Default to razorpay, can be changed to 'wallet' later
            formDataToSend.append('bannerType', 'b2b'); // Explicitly set bannerType for B2B vendors

            // Verify FormData contents
            console.log('Creating booking with data:', {
                slotId: selectedSlot._id,
                startDate: formData.startDate, // Date-only string (YYYY-MM-DD)
                durationDays: formData.durationDays,
                hasImage: !!formData.image,
                imageName: formData.image?.name,
                imageSize: formData.image?.size,
                imageType: formData.image?.type
            });

            // Log FormData entries (for debugging)
            console.log('FormData entries:');
            for (let pair of formDataToSend.entries()) {
                console.log(pair[0] + ': ' + (pair[1] instanceof File ? `File(${pair[1].name}, ${pair[1].size} bytes)` : pair[1]));
            }

            const response = await createBannerBooking(formDataToSend);

            console.log('Booking response:', response);
            console.log('Response type:', typeof response);
            console.log('Response keys:', Object.keys(response || {}));

            // API interceptor returns response.data directly, so response is already unwrapped
            // Response structure: { success: true, message: '...', data: { ... } }
            const responseData = response;

            console.log('Response data:', responseData);
            console.log('Response success:', responseData?.success);

            if (responseData?.success) {
                // Data is in responseData.data
                const bookingData = responseData.data;

                console.log('Booking data:', bookingData);
                console.log('Has razorpayOrder:', !!bookingData?.razorpayOrder);
                console.log('Booking ID:', bookingData?._id);

                // If wallet payment was used, it's already paid
                if (bookingData.paymentStatus === 'paid' && bookingData.paymentMethod === 'wallet') {
                    toast.success("Banner booking created successfully using wallet! Awaiting admin approval.");
                    await loadData();
                    setShowBookingModal(false);
                    resetForm();
                } else if (bookingData.razorpayOrder) {
                    // For Razorpay, open payment gateway
                    toast.success("Booking initiated! Opening payment gateway...");
                    await handleRazorpayPayment(
                        bookingData._id,
                        bookingData.razorpayOrder,
                        calculatedPrice,
                        bookingData.razorpayKeyId
                    );
                } else {
                    // Booking created but payment gateway failed
                    toast.error("Booking created but payment gateway failed. Please contact support.");
                    await loadData();
                    setShowBookingModal(false);
                    resetForm();
                }
            } else {
                toast.error(responseData?.message || 'Failed to create banner booking');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            console.error('Error details:', {
                message: error?.message,
                response: error?.response,
                responseData: error?.response?.data,
                status: error?.response?.status,
                config: error?.config
            });

            // Show detailed error message
            let errorMessage = 'Failed to create banner booking';

            if (error?.response?.data) {
                errorMessage = error.response.data.message
                    || error.response.data.error
                    || error.response.data
                    || errorMessage;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            // Check for specific error cases
            if (error?.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error?.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Invalid booking data. Please check all fields.';
            } else if (error?.response?.status === 403) {
                errorMessage = error.response.data?.message || 'You do not have permission to create this booking.';
            } else if (error?.isNetworkError) {
                errorMessage = 'Network error. Please check your connection and try again.';
            }

            toast.error(errorMessage, { duration: 5000 });

            // Log full error for debugging
            if (error?.response?.data) {
                console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
            }
        } finally {
            setLoading(false);
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
            durationType: "day"
        });
        setSelectedSlot(null);
    };

    const openBookingModal = (slot) => {
        setSelectedSlot(slot);
        setFormData({
            title: "",
            link: "",
            image: null,
            preview: null,
            startDate: "",
            durationDays: 1,
            durationType: "day"
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
            header: "Start Date",
            accessor: "startDate",
            render: (val) => new Date(val).toISOString().split('T')[0],
        },
        {
            header: "Created At",
            accessor: "createdAt",
            render: (val) => new Date(val).toLocaleDateString(),
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
                {slots.map((slot) => {
                    const isBooked = slot.currentBooking &&
                        (slot.currentBooking.status === 'active' || slot.currentBooking.status === 'pending');

                    return (
                        <motion.div
                            key={slot._id}
                            whileHover={{ y: -5 }}
                            className={`p-4 rounded-xl border-2 transition-all ${isBooked
                                ? "bg-blue-50/50 border-blue-100"
                                : "bg-white border-blue-100 hover:border-blue-500 shadow-sm hover:shadow-md"
                                } cursor-pointer`}
                            onClick={() => openBookingModal(slot)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Slot {slot.slotNumber}</span>
                                {isBooked ? (
                                    <Badge variant={slot.currentBooking.status === 'active' ? "info" : "warning"}>
                                        {new Date(slot.currentBooking.startDate) > new Date() ? "Reserved" : "Occupied"}
                                    </Badge>
                                ) : (
                                    <Badge variant="success">Available</Badge>
                                )}
                            </div>
                            <div className="text-xl font-bold text-gray-900 mb-1">{formatPrice(slot.price)}</div>
                            <p className="text-xs text-gray-500 mb-4">Starting from {formatPrice(slot.price)}/day</p>

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
                                                Valid until: {calculatedEndDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} (Midnight)
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Total Price</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    For {formData.durationDays} Day{formData.durationDays !== 1 ? 's' : ''} starting {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'selected date'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-blue-600">{formatPrice(calculatedPrice)}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    FIXED DAILY RATE
                                                </p>
                                            </div>
                                        </div>
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
                                            Target URL (Optional)
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
                                        className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {loading ? (
                                            "Processing..."
                                        ) : (
                                            <>
                                                <FiCreditCard /> Book for {formatPrice(calculatedPrice)}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default B2BBannerBooking;
