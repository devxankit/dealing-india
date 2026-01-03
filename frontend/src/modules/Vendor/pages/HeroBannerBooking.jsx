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
  confirmBannerPayment
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
    minDurationHours: 1,
    maxDurationHours: 720,
    defaultPricePerHour: 1999,
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
    durationHours: 1,
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
      
      // Handle both old and new response formats
      if (slotsRes.data?.slots) {
        setSlots(slotsRes.data.slots);
        setSettings(slotsRes.data.settings || settings);
      } else {
        setSlots(slotsRes.data || []);
      }
      
      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error("Error loading banner data:", error);
      toast.error("Failed to load banner slots");
    } finally {
      setLoading(false);
    }
  };

  // Calculate price based on duration
  const calculatedPrice = useMemo(() => {
    if (!settings.pricingStructure || Object.keys(settings.pricingStructure).length === 0) {
      // Fallback to default pricing
      return (formData.durationHours || 1) * (settings.defaultPricePerHour || 1999);
    }
    
    const durationKey = formData.durationHours.toString();
    const pricingStructure = settings.pricingStructure;
    
    // If exact match exists
    if (pricingStructure[durationKey] !== undefined) {
      return pricingStructure[durationKey];
    }
    
    // Find closest lower bound
    const sortedDurations = Object.keys(pricingStructure)
      .map(Number)
      .sort((a, b) => a - b);
    
    let basePrice = settings.defaultPricePerHour || 1999;
    let baseHours = 1;
    
    for (let i = sortedDurations.length - 1; i >= 0; i--) {
      if (sortedDurations[i] <= formData.durationHours) {
        baseHours = sortedDurations[i];
        basePrice = pricingStructure[baseHours.toString()];
        break;
      }
    }
    
    // Calculate proportional price
    const pricePerHour = basePrice / baseHours;
    return Math.round(pricePerHour * formData.durationHours);
  }, [formData.durationHours, settings]);

  // Get min and max dates for date picker
  const { minDate, maxDate } = useMemo(() => {
    const now = new Date();
    const min = now.toISOString().split('T')[0];
    const max = new Date(now.getTime() + (settings.bookingWindowDays * 24 * 60 * 60 * 1000));
    const maxStr = max.toISOString().split('T')[0];
    return { minDate: min, maxDate: maxStr };
  }, [settings.bookingWindowDays]);

  // Format duration for display
  const formatDuration = (hours) => {
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    if (hours < 168) return `${Math.round(hours / 24)} ${hours < 48 ? 'day' : 'days'}`;
    if (hours < 720) return `${Math.round(hours / 168)} ${hours < 336 ? 'week' : 'weeks'}`;
    return `${Math.round(hours / 720)} ${hours < 1440 ? 'month' : 'months'}`;
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

  const handleDurationChange = (e) => {
    const hours = parseInt(e.target.value) || 1;
    const clampedHours = Math.max(settings.minDurationHours, Math.min(settings.maxDurationHours, hours));
    setFormData({
      ...formData,
      durationHours: clampedHours,
    });
  };

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
    const selectedDate = new Date(formData.startDate);
    const now = new Date();
    const maxDate = new Date(now.getTime() + (settings.bookingWindowDays * 24 * 60 * 60 * 1000));
    
    if (selectedDate < now) {
      toast.error("Start date cannot be in the past");
      return;
    }
    
    if (selectedDate > maxDate) {
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
      bookingFormData.append("startDate", new Date(formData.startDate).toISOString());
      bookingFormData.append("durationHours", formData.durationHours);

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
          ondismiss: () => {
            toast.error("Payment cancelled");
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
      durationHours: 1,
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
      durationHours: settings.minDurationHours || 1,
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
      accessor: "durationHours",
      render: (val) => <span className="text-sm text-gray-600">{formatDuration(val || 24)}</span>,
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
      render: (val) => new Date(val).toLocaleDateString(),
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
              className={`p-4 rounded-xl border-2 transition-all ${
                isBooked 
                ? "bg-gray-50 border-gray-200 opacity-75" 
                : "bg-white border-blue-100 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md"
              }`}
              onClick={() => !isBooked && openBookingModal(slot)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Slot {slot.slotNumber}</span>
                {isBooked ? (
                  <Badge variant="error">Booked</Badge>
                ) : (
                  <Badge variant="success">Available</Badge>
                )}
              </div>
              <div className="text-xl font-bold text-gray-900 mb-1">{formatPrice(slot.price)}</div>
              <p className="text-xs text-gray-500 mb-4">Starting from {formatPrice(settings.defaultPricePerHour || 1999)}/hour</p>
              
              {!isBooked && (
                <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <FiPlus /> Book Now
                </button>
              )}
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
                  {/* Start Date Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <FiCalendar className="text-blue-600" />
                      Start Date
                      <div className="group relative">
                        <FiInfo className="text-gray-400 cursor-help" />
                        <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg z-20">
                          You can book dates up to {settings.bookingWindowDays} days in advance. Dates cannot be in the past.
                        </div>
                      </div>
                    </label>
                    <input
                      type="date"
                      required
                      min={minDate}
                      max={maxDate}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.startDate}
                      onChange={handleDateChange}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Available dates: {new Date(minDate).toLocaleDateString()} to {new Date(maxDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Duration Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <FiClock className="text-blue-600" />
                      Duration
                      <div className="group relative">
                        <FiInfo className="text-gray-400 cursor-help" />
                        <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg z-20">
                          Duration must be between {settings.minDurationHours} hour{settings.minDurationHours !== 1 ? 's' : ''} and {formatDuration(settings.maxDurationHours)}. Price is calculated based on your selected duration.
                        </div>
                      </div>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        required
                        min={settings.minDurationHours}
                        max={settings.maxDurationHours}
                        step="1"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.durationHours}
                        onChange={handleDurationChange}
                      />
                      <span className="text-sm text-gray-600 whitespace-nowrap">
                        hours ({formatDuration(formData.durationHours)})
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Range: {settings.minDurationHours} - {settings.maxDurationHours} hours ({formatDuration(settings.minDurationHours)} - {formatDuration(settings.maxDurationHours)})
                    </p>
                  </div>

                  {/* Price Display */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Total Price</p>
                        <p className="text-xs text-gray-500 mt-1">
                          For {formatDuration(formData.durationHours)} starting {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'selected date'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{formatPrice(calculatedPrice)}</p>
                        {formData.durationHours > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatPrice(Math.round(calculatedPrice / formData.durationHours))}/hour
                          </p>
                        )}
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
