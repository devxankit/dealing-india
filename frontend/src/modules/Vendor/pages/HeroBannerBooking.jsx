import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "",
    link: "",
    image: null,
    preview: null,
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
      setSlots(slotsRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error("Error loading banner data:", error);
      toast.error("Failed to load banner slots");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Basic type validation
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file (PNG, JPG)");
        return;
      }

      // Size validation (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }

      // Dimension validation (optional but recommended)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image) {
      toast.error("Please upload a banner image");
      return;
    }

    setLoading(true);
    try {
      const bookingFormData = new FormData();
      bookingFormData.append("slotId", selectedSlot._id);
      bookingFormData.append("title", formData.title);
      bookingFormData.append("link", formData.link);
      bookingFormData.append("image", formData.image);
      bookingFormData.append("amount", selectedSlot.price);
      
      // Setting a default 30-day period for now as per requirements
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      
      bookingFormData.append("startDate", start.toISOString());
      bookingFormData.append("endDate", end.toISOString());

      const response = await createBannerBooking(bookingFormData);
      
      if (response.success && response.data.razorpayOrder) {
        toast.success("Booking initiated! Opening payment gateway...");
        await handleRazorpayPayment(
          response.data._id, 
          response.data.razorpayOrder, 
          selectedSlot.price,
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
      // Get Razorpay key from response or environment
      const keyId = razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      if (!keyId) {
        toast.error("Payment gateway not configured. Please contact support.");
        return;
      }

      // Initialize Razorpay checkout
      await initializeRazorpayCheckout({
        key: keyId,
        amount: amount,
        currency: 'INR',
        name: 'Appzeto',
        description: `Hero Banner Booking - ${bookingId}`,
        orderId: razorpayOrder.id,
        prefill: {
          name: '', // Vendor name can be added if available
          email: '', // Vendor email can be added if available
          contact: '', // Vendor phone can be added if available
        },
        handler: async (paymentResponse) => {
          try {
            // Format payment response
            const paymentData = handlePaymentSuccess(paymentResponse);
            
            // Confirm payment with backend
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
    });
    setSelectedSlot(null);
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
              onClick={() => !isBooked && (setSelectedSlot(slot), setShowBookingModal(true))}
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
              <p className="text-xs text-gray-500 mb-4">per 30 days display</p>
              
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Book Hero Banner Slot {selectedSlot?.slotNumber}</h3>
                  <p className="text-sm text-blue-600 font-medium">Price: {formatPrice(selectedSlot?.price)}</p>
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
                    disabled={loading}
                    className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? "Processing..." : `Pay ${formatPrice(selectedSlot?.price)}`}
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
