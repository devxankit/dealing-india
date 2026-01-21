import { useState, useEffect, useMemo } from "react";
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
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { formatPrice } from "../../../shared/utils/helpers";
import {
  getAvailableBannerSlots,
  createBannerBooking,
  getMyBannerBookings,
  confirmBannerPayment,
  cancelBannerBooking
} from "../services/heroBannerService";
import { initializeRazorpayCheckout, handlePaymentSuccess } from "../../../shared/services/paymentService";
import Badge from "../../../shared/components/Badge";
import DataTable from "../../Admin/components/DataTable";

const HeroBannerBooking = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState({
    bookingWindowDays: 30,
    minDurationHours: 24,
    maxDurationHours: 720,
    defaultPricePerDay: 1999,
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
    durationDays: 1, // Changed from durationHours
    durationType: "day", // Only support day/week/month now
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [slotsRes, bookingsRes] = await Promise.all([
        getAvailableBannerSlots(),
        getMyBannerBookings()
      ]);

      setLoading(false);


      // Backend returns: { success: true, data: { slots: [], settings: {} } }
      // Interceptor returns that object as `slotsRes`
      // So we need to access slotsRes.data.slots

      const payload = slotsRes.data || slotsRes; // Fallback in case structure changes

      if (payload && Array.isArray(payload.slots)) {
        setSlots(payload.slots);
        setSettings(payload.settings || settings);
      } else {
        setSlots([]);
        console.warn("Unexpected slots response structure", slotsRes);
      }

      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error("Error loading banner data:", error);
      toast.error("Failed to load banner slots");
    } finally {
      setLoading(false);
    }
  };

  // Calculate price based on duration and selected slot price
  const calculatedPrice = useMemo(() => {
    const slotPricePerDay = selectedSlot?.price || settings.defaultPricePerDay || 1999;
    const durationDays = formData.durationDays || 1;

    // Use simple daily rate logic
    // Price = Slot Price * Days
    // If pricing structure exists (e.g. bulk discount for 7 days), we can check it
    // But currently backend pricing structure is based on hours ('24', '168')
    // Let's keep it simple: slotPrice is "Per Day".

    // Check if there is a bulk discount structure available in settings
    let finalPricePerDay = slotPricePerDay;

    // If settings has pricing structure, we might want to apply it
    // But aligning 'day' logic with 'hours' structure is tricky if keys are hours.
    // If user buys 7 days (168 hours), do they get discount?
    // Let's ignore complex structure for now unless explicitly requested. 
    // User requested: "100% price... 1 day" -> Just Full Day Price.

    return Math.round(finalPricePerDay * durationDays);
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

  // Format duration for display
  const formatDuration = (days) => {
    if (days === 1) return "1 Day";
    return `${days} Days`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file (PNG, JPG)");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
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

  const handleTimeChange = (e) => {
    setFormData({
      ...formData,
      startTime: e.target.value,
    });
  };

  const handleDurationChange = (e) => {
    let val = parseInt(e.target.value) || 1;
    // ensure int
    val = Math.max(1, Math.round(val));

    setFormData(prev => ({
      ...prev,
      durationDays: val
    }));
  };

  // Removed handleDurationTypeChange and updateDuration as we only support Days now (effectively)
  // or simple int input


  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.image) {
      toast.error("Please upload a banner image");
      return;
    }

    if (!formData.startDate) {
      toast.error("Please select a start date");
      return;
    }

    // Validate date is within booking window
    // Combine date and time
    // Combine date and time (defaulting to 00:00 for validation purposes, actual expiry is midnight)
    // Actually, backend now handles expiry.
    const startDateTimeString = `${formData.startDate}T00:00:00`;
    const localSelectedDate = new Date(startDateTimeString); // Local time for validation
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

    setLoading(true);
    try {
      const bookingFormData = new FormData();
      bookingFormData.append("slotId", selectedSlot._id);
      bookingFormData.append("title", formData.title);
      bookingFormData.append("link", formData.link);
      bookingFormData.append("image", formData.image);
      // Send date-only string (YYYY-MM-DD) - backend will interpret as UTC midnight
      // This ensures the selected date is stored correctly without timezone shifts
      bookingFormData.append("startDate", formData.startDate);
      bookingFormData.append("durationDays", formData.durationDays);
      bookingFormData.append("bannerType", "hero");

      const response = await createBannerBooking(bookingFormData);

      if (response.success && response.data.razorpayOrder) {
        toast.success("Booking initiated! Opening payment gateway...");
        await handleRazorpayPayment(
          response.data._id,
          response.data.razorpayOrder,
          calculatedPrice,
          response.data.razorpayKeyId
        );
      } else if (response.success) {
        toast.error("Booking created but payment gateway failed. Please contact support.");
        setShowBookingModal(false);
        resetForm();
        loadData();
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(error.response?.data?.message || "Failed to create booking");
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
        name: 'Appzeto',
        description: `Hero Banner Booking - ${bookingId}`,
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
            loadData();
          } catch (error) {
            console.error("Payment confirmation error:", error);
            toast.error(error.response?.data?.message || "Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              toast.error("Payment cancelled");
              await cancelBannerBooking(bookingId);
              loadData(); // Refresh list to remove the temp booking
            } catch (err) {
              console.error("Error cancelling booking:", err);
            }
          },
        },
      });
    } catch (error) {
      console.error("Razorpay payment error:", error);
      toast.error(error.message || "Failed to open payment gateway. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      link: "",
      image: null,
      preview: null,
      startDate: "",
      // startTime reset removed
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
      // startTime remove
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
        <img src={val} alt="Banner" className="h-10 w-20 object-cover rounded border" />
      ),
    },
    {
      header: "Slot",
      accessor: "slotId",
      render: (val) => `Slot ${val?.slotNumber || "N/A"}`,
    },
    {
      header: "Duration",
      accessor: "durationHours", // Still reading durationHours from backend response for now? Or switch to generic render
      render: (val, row) => {
        // If backend returns durationDays, use it. If durationHours, convert.
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
            onClick={() => navigate(`/vendor/hero-banner-booking/details/${row._id}`)}
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
          <h1 className="text-2xl font-bold text-gray-900">Hero Banner Booking</h1>
          <p className="text-gray-500 text-sm">Book slots and manage your banner advertisements</p>
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
                  <Badge variant="info">Active Now</Badge>
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
          <h2 className="text-lg font-bold text-gray-900">My Bookings</h2>
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
                  <h3 className="text-xl font-bold text-gray-900">Book Hero Banner Slot {selectedSlot?.slotNumber}</h3>
                  <p className="text-sm text-blue-600 font-medium">Calculate your price based on duration</p>
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
                  {/* Start Date Selection - Only Date, No Time */}
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
                        max="30" // Reasonable cap
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
                      placeholder="e.g. Summer Collection Sale"
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
                          <li>Aspect Ratio: 211:35 (e.g., 2110x350px)</li>
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
                        <FiCreditCard /> Pay {formatPrice(calculatedPrice)}
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

export default HeroBannerBooking;
