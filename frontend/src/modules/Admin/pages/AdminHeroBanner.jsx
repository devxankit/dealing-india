import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSettings,
  FiCalendar,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiInfo,
  FiEdit3,
  FiCreditCard,
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiTrash2,
  FiImage,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { formatPrice } from "../../../shared/utils/helpers";
import { IndianRupee, LayoutDashboard, Settings2, Image as ImageIcon } from "lucide-react";
import {
  getAdminBannerSlots,
  getAdminBannerBookings,
  updateBannerSettings,
  updateBannerSlot,
  approveBannerBooking,
  rejectBannerBooking,
  getBannerRevenueStats
} from "../../Vendor/services/heroBannerService";
import Badge from "../../../shared/components/Badge";
import DataTable from "../components/DataTable";

const AdminHeroBanner = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState({
    universalDisplayTime: 2000,
    bookingWindowDays: 30,
    minDurationHours: 24,
    maxDurationHours: 720,
    defaultPricePerDay: 1999,
    pricingStructure: {}
  });
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    percentageChange: 0
  });
  const [loading, setLoading] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [tempPrice, setTempPrice] = useState("");

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    universalDisplayTime: 2000,
    bookingWindowDays: 30,
    minDurationHours: 1,
    maxDurationHours: 720,
    defaultPricePerHour: 1999,
    pricingStructure: {}
  });

  const [slotForm, setSlotForm] = useState({
    price: "",
    dayPrice: "",
    weekPrice: ""
  });

  // Pricing structure editor state
  const [newPricingEntry, setNewPricingEntry] = useState({ hours: "", price: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const bannerType = "hero";
      const [slotsRes, bookingsRes, revenueRes] = await Promise.all([
        getAdminBannerSlots({ params: { bannerType } }),
        getAdminBannerBookings({ params: { bannerType } }),
        getBannerRevenueStats({ params: { bannerType } })
      ]);

      console.log("Admin Slots Response:", slotsRes);

      // Handle slots response structure
      if (slotsRes?.data?.success || slotsRes?.success || slotsRes?.data) {
        const slotsData = slotsRes?.data?.data || slotsRes?.data || slotsRes;
        const slotsList = slotsData.slots || (Array.isArray(slotsData) ? slotsData : []);
        setSlots(slotsList);

        if (slotsData.settings) {
          const fetchedSettings = {
            ...slotsData.settings,
            defaultBanner: slotsData.settings.defaultBanner || { image: '', link: '', title: '' }
          };
          setSettings(fetchedSettings);
          setSettingsForm(fetchedSettings);
        }
      } else {
        setSlots([]);
      }

      // Handle bookings response
      const bookingsData = bookingsRes?.data?.data || bookingsRes?.data || bookingsRes;
      if (Array.isArray(bookingsData)) {
        setBookings(bookingsData);
      } else if (bookingsData?.bookings && Array.isArray(bookingsData.bookings)) {
        setBookings(bookingsData.bookings);
      } else {
        setBookings([]);
      }

      // Handle revenue stats response
      if (revenueRes?.data?.success) {
        setRevenueStats(revenueRes.data.data || { totalRevenue: 0, percentageChange: 0 });
      } else if (revenueRes?.success && revenueRes?.data) {
        setRevenueStats(revenueRes.data || { totalRevenue: 0, percentageChange: 0 });
      } else {
        setRevenueStats(revenueRes?.data || { totalRevenue: 0, percentageChange: 0 });
      }

    } catch (error) {
      console.error("Error loading admin banner data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSlotFull = async (slotId) => {
    // Validate inputs
    const basePrice = parseFloat(slotForm.price);
    if (isNaN(basePrice) || basePrice < 0) {
      toast.error("Invalid base daily price");
      return;
    }

    const dayPrice = slotForm.dayPrice !== "" ? parseFloat(slotForm.dayPrice) : null;
    const weekPrice = slotForm.weekPrice !== "" ? parseFloat(slotForm.weekPrice) : null;

    if (slotForm.dayPrice !== "" && (isNaN(dayPrice) || dayPrice < 0)) {
      toast.error("Invalid day price");
      return;
    }
    if (slotForm.weekPrice !== "" && (isNaN(weekPrice) || weekPrice < 0)) {
      toast.error("Invalid week price");
      return;
    }

    // Construct pricing structure
    const updatedPricingStructure = {};
    if (dayPrice !== null) updatedPricingStructure['24'] = dayPrice;
    if (weekPrice !== null) updatedPricingStructure['168'] = weekPrice;

    setLoading(true);
    try {
      // Send updates
      // We send both price and structure. Note: backend updateSlot handles partial updates,
      // but here we want to set structure explicitly. 
      // Current backend `updateSlot` merges/sets logic: 
      // "if (slotData.pricingStructure !== undefined) slot.pricingStructure = slotData.pricingStructure;"
      // This REPLACES the structure, which is what we want for a "Form Save" action.

      await updateBannerSlot(slotId, {
        price: basePrice,
        pricingStructure: updatedPricingStructure
      });

      // Optimistic update
      setSlots(slots.map(s => s._id === slotId ? {
        ...s,
        price: basePrice,
        pricingStructure: updatedPricingStructure
      } : s));

      setEditingSlotId(null);
      toast.success("Slot settings saved successfully");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to save slot settings");
    } finally {
      setLoading(false);
    }
  };

  /* REMOVED handleUpdatePrice (legacy) */

  const handleApproveBanner = async (bookingId) => {
    setLoading(true);
    try {
      await approveBannerBooking(bookingId);
      toast.success("Banner approved and is now live!");
      await loadData();
    } catch (error) {
      console.error("Error approving banner:", error);
      toast.error(error.response?.data?.message || "Failed to approve banner");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBanner = async (bookingId, reason = '') => {
    setLoading(true);
    try {
      await rejectBannerBooking(bookingId, reason);
      toast.success("Banner rejected successfully");
      await loadData();
    } catch (error) {
      console.error("Error rejecting banner:", error);
      toast.error(error.response?.data?.message || "Failed to reject banner");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    // Validation
    if (settingsForm.universalDisplayTime < 500) {
      toast.error("Display time must be at least 500ms");
      return;
    }
    if (settingsForm.bookingWindowDays < 1 || settingsForm.bookingWindowDays > 365) {
      toast.error("Booking window must be between 1 and 365 days");
      return;
    }
    if (settingsForm.minDurationHours < 1) {
      toast.error("Minimum duration must be at least 1 hour");
      return;
    }
    if (settingsForm.maxDurationHours < settingsForm.minDurationHours) {
      toast.error("Maximum duration must be greater than or equal to minimum duration");
      return;
    }
    if (settingsForm.defaultPricePerDay < 0) {
      toast.error("Default price per day cannot be negative");
      return;
    }

    setLoading(true);
    try {
      // If we're updating default banners, wrap them in the correct field
      const updateData = { ...settingsForm };

      // The settingsForm might contain fields for standard settings + default banner fields
      // Backend expects: defaultBanner: { image, link, title }

      setSettings(settingsForm);
      setShowSettingsPanel(false);
      toast.success(`Banner settings updated successfully`);
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error(error.response?.data?.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPricingEntry = () => {
    const hours = parseInt(newPricingEntry.hours);
    const price = parseFloat(newPricingEntry.price);

    if (isNaN(hours) || hours < 1) {
      toast.error("Please enter a valid number of hours");
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }
    if (hours < settingsForm.minDurationHours || hours > settingsForm.maxDurationHours) {
      toast.error(`Hours must be between ${settingsForm.minDurationHours} and ${settingsForm.maxDurationHours}`);
      return;
    }

    const newStructure = { ...settingsForm.pricingStructure };
    newStructure[hours.toString()] = price;

    setSettingsForm({
      ...settingsForm,
      pricingStructure: newStructure
    });

    setNewPricingEntry({ hours: "", price: "" });
  };

  const handleRemovePricingEntry = (hours) => {
    const newStructure = { ...settingsForm.pricingStructure };
    delete newStructure[hours.toString()];

    setSettingsForm({
      ...settingsForm,
      pricingStructure: newStructure
    });
  };

  const formatDuration = (hours) => {
    if (hours < 24) return `${hours}h`;
    if (hours < 168) return `${Math.round(hours / 24)}d`;
    if (hours < 720) return `${Math.round(hours / 168)}w`;
    return `${Math.round(hours / 720)}mo`;
  };

  const columns = [
    {
      header: "Reference ID",
      accessor: "referenceId",
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    {
      header: "Vendor",
      accessor: "vendorId",
      render: (val) => (
        <div className="flex flex-col">
          <span className="font-medium">{val?.storeName || val?.name || "N/A"}</span>
          <span className="text-xs text-gray-500">{val?.email}</span>
        </div>
      ),
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
      render: (val) => <span className="text-sm text-gray-600">{formatDuration(val || 24)}</span>,
    },
    {
      header: "Amount",
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
      header: "Payment",
      accessor: "paymentStatus",
      render: (val) => (
        <Badge variant={val === "paid" ? "success" : "error"}>
          {val.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Approval",
      accessor: "adminApprovalStatus",
      render: (val) => (
        <Badge variant={val === "approved" ? "success" : val === "pending" ? "warning" : "error"}>
          {val ? val.toUpperCase() : "PENDING"}
        </Badge>
      ),
    },
    {
      header: "Booking Date",
      accessor: "createdAt",
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      header: "Actions",
      accessor: "_id",
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/hero-banners/details/${row._id}`)}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            title="View Details"
          >
            <FiEye className="text-lg" />
          </button>
          {row.paymentStatus === "paid" && row.adminApprovalStatus === "pending" && (
            <>
              <button
                onClick={() => handleApproveBanner(row._id)}
                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                title="Approve Banner"
                disabled={loading}
              >
                <FiCheckCircle className="text-lg" />
              </button>
              <button
                onClick={() => {
                  const reason = prompt("Enter rejection reason (optional):");
                  if (reason !== null) {
                    handleRejectBanner(row._id, reason);
                  }
                }}
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                title="Reject Banner"
                disabled={loading}
              >
                <FiXCircle className="text-lg" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6" >
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hero Banner Management
          </h1>
          <p className="text-gray-500">Manage B2B platform banner slots and bookings</p>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate('/admin/banners')}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <ImageIcon size={16} /> Manage Defaults
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FiClock className="text-xl" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Display Time</p>
              <p className="text-lg font-bold text-gray-900">{settings.universalDisplayTime}ms</p>
            </div>
          </div>
          <div className="h-10 w-px bg-gray-100"></div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <IndianRupee className="text-xl" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Bookings</p>
              <p className="text-lg font-bold text-gray-900">{bookings.filter(b => b.status === 'active').length}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-gray-100"></div>

          <button
            onClick={() => navigate('/admin/wallet')}
            className="flex items-center gap-4 hover:bg-gray-50 px-4 py-2 rounded-2xl transition-all group border border-transparent hover:border-gray-100 shadow-sm hover:shadow-md"
          >
            <div className="p-2.5 bg-gray-900 text-white rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300">
              <FiCreditCard className="text-xl" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Revenue</p>
              <p className="text-xl font-black text-gray-900 leading-none mt-1">
                {loading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  formatPrice(revenueStats.totalRevenue || 0)
                )}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Banner Settings Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden" >
        <button
          onClick={() => setShowSettingsPanel(!showSettingsPanel)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FiSettings className="text-blue-600 text-xl" />
            <div className="text-left">
              <h3 className="font-bold text-gray-900">Banner Settings & Pricing</h3>
              <p className="text-sm text-gray-500">Configure booking window, duration limits, and pricing structure</p>
            </div>
          </div>
          {showSettingsPanel ? (
            <FiChevronUp className="text-gray-400" />
          ) : (
            <FiChevronDown className="text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {showSettingsPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 border-t border-gray-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Universal Display Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Universal Display Time (ms)
                    </label>
                    <input
                      type="number"
                      min="500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={settingsForm.universalDisplayTime}
                      onChange={(e) => setSettingsForm({ ...settingsForm, universalDisplayTime: parseInt(e.target.value) || 2000 })}
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum: 500ms</p>
                  </div>

                  {/* Booking Window */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Booking Window (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={settingsForm.bookingWindowDays}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bookingWindowDays: parseInt(e.target.value) || 30 })}
                    />
                    <p className="mt-1 text-xs text-gray-500">Range: 1-365 days</p>
                  </div>

                  {/* Min Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Duration (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={settingsForm.minDurationHours}
                      onChange={(e) => setSettingsForm({ ...settingsForm, minDurationHours: parseInt(e.target.value) || 24 })}
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum: 24 hours (1 day)</p>
                  </div>

                  {/* Max Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Duration (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={settingsForm.maxDurationHours}
                      onChange={(e) => setSettingsForm({ ...settingsForm, maxDurationHours: parseInt(e.target.value) || 720 })}
                    />
                    <p className="mt-1 text-xs text-gray-500">Maximum: 720 hours (30 days)</p>
                  </div>

                  {/* Default Banner Configuration INFO */}
                  <div className="md:col-span-2 p-6 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col items-center text-center space-y-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                      <FiImage size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">System Default Banners</h4>
                      <p className="text-sm text-gray-600 max-w-md mt-1">
                        Default banners (fallbacks) are now managed globally. You can set multiple rotating banners for the platform.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/admin/banners')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <FiSettings /> Manage System Banners
                    </button>
                  </div>

                  {/* Default Price Per Day */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Price Per Day (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={settingsForm.defaultPricePerDay}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultPricePerDay: parseFloat(e.target.value) || 1999 })}
                    />
                    <p className="mt-1 text-xs text-gray-500">Used when no specific pricing entry exists for a duration</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pricing Structure & Discounts
                    <div className="group relative inline-block ml-2">
                      <FiInfo className="text-gray-400 cursor-help" />
                      <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg z-20">
                        Define fixed prices for specific durations to offer bulk discounts. <br />
                        For example, set "168 hours (1 week)" to a lower price than "7 x Daily Rate".
                      </div>
                    </div>
                  </label>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Duration</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Price (₹)</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Effective Rate</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(settingsForm.pricingStructure || {})
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([hours, price]) => {
                              const hoursNum = parseInt(hours);
                              const dailyRate = price / (hoursNum / 24);
                              const isDiscounted = dailyRate < settingsForm.defaultPricePerDay;

                              return (
                                <tr key={hours} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm">
                                    <span className="font-medium">{formatDuration(hoursNum)}</span>
                                    <span className="text-xs text-gray-500 ml-1">({hours}h)</span>
                                  </td>
                                  <td className="px-4 py-2 text-sm font-medium">{formatPrice(price)}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`text-xs ${isDiscounted ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                                      {formatPrice(Math.round(dailyRate))}/day
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <button
                                      onClick={() => handleRemovePricingEntry(hours)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                      title="Remove"
                                    >
                                      <FiTrash2 className="text-sm" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          {Object.keys(settingsForm.pricingStructure || {}).length === 0 && (
                            <tr>
                              <td colSpan="4" className="px-4 py-4 text-center text-sm text-gray-500">
                                No custom rates defined. Standard daily rate ({formatPrice(settingsForm.defaultPricePerDay)}/day) applies to all.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setNewPricingEntry({ hours: "24", price: "" })}
                          className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          + 1 Day Rate
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPricingEntry({ hours: "168", price: "" })}
                          className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          + 1 Week Rate
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPricingEntry({ hours: "720", price: "" })}
                          className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          + 1 Month Rate
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          placeholder="Hours"
                          min={settingsForm.minDurationHours}
                          max={settingsForm.maxDurationHours}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          value={newPricingEntry.hours}
                          onChange={(e) => setNewPricingEntry({ ...newPricingEntry, hours: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Price (₹)"
                          min="0"
                          step="0.01"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          value={newPricingEntry.price}
                          onChange={(e) => setNewPricingEntry({ ...newPricingEntry, price: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={handleAddPricingEntry}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
                        >
                          <FiPlus /> Add Rate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsForm(settings);
                      setShowSettingsPanel(false);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateSettings}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <FiCheckCircle /> Save Settings
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-10">
        {slots.map((slot) => {
          const booking = slot.currentBooking;
          const isActive = booking && booking.status === 'active';

          return (
            <div
              key={slot._id}
              className={`p-4 rounded-xl border-2 bg-white transition-all ${editingSlotId === slot._id ? "border-blue-500 ring-2 ring-blue-100" :
                isActive ? "border-green-100 shadow-sm" : "border-gray-100 opacity-90"
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Slot {slot.slotNumber}</span>
                {isActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="warning">Empty</Badge>
                )}
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-gray-900">{formatPrice(slot.price)} <span className="text-xs font-normal text-gray-400">/day</span></div>
                  <button
                    onClick={() => {
                      if (editingSlotId === slot._id) {
                        setEditingSlotId(null);
                      } else {
                        setEditingSlotId(slot._id);
                        // Initialize form with current slot data
                        // Note: pricingStructure keys are strings '24', '168'
                        const structure = slot.pricingStructure || {};
                        setSlotForm({
                          price: slot.price,
                          dayPrice: structure['24'] || "",
                          weekPrice: structure['168'] || ""
                        });
                      }
                    }}
                    className={`p-1.5 rounded-full transition-colors ${editingSlotId === slot._id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                    title="Edit Slot Settings"
                  >
                    <FiSettings size={14} />
                  </button>
                </div>
                {slot.pricingStructure && Object.keys(slot.pricingStructure).length > 0 && (
                  <p className="text-[10px] text-green-600 font-medium mt-1">
                    <FiCheckCircle className="inline mr-1" />
                    Custom Rates Active ({Object.keys(slot.pricingStructure).length})
                  </p>
                )}
              </div>

              <AnimatePresence>
                {editingSlotId === slot._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-3 border-t border-dashed border-gray-200 pt-3"
                  >
                    <div className="space-y-4">
                      {/* Base Price Input */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Daily Price (Base)</label>
                        <input
                          type="number"
                          className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g 1999"
                          value={slotForm.price}
                          onChange={(e) => setSlotForm({ ...slotForm, price: e.target.value })}
                        />
                      </div>

                      {/* Custom Rates Inputs */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Discounted Rates</label>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-gray-400 block mb-0.5">1 Day (24h)</label>
                            <input
                              type="number"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                              placeholder="Default"
                              value={slotForm.dayPrice}
                              onChange={(e) => setSlotForm({ ...slotForm, dayPrice: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-400 block mb-0.5">1 Week (168h)</label>
                            <input
                              type="number"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                              placeholder="Default"
                              value={slotForm.weekPrice}
                              onChange={(e) => setSlotForm({ ...slotForm, weekPrice: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleUpdateSlotFull(slot._id)}
                          className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingSlotId(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isActive ? (
                <div className="mt-2 space-y-2">
                  <img src={booking.bannerImage} alt="" className="w-full h-20 object-cover rounded border" />
                  <p className="text-xs font-medium text-gray-700 truncate">{booking.vendorId?.storeName || booking.vendorId?.name}</p>
                </div>
              ) : (
                <div className="mt-2 h-20 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <FiCalendar className="text-gray-300 text-lg mb-1" />
                  <p className="text-[9px] text-gray-400 font-medium">AVAILABLE</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">All Bookings</h2>
          <div className="flex gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search bookings..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <FiInfo className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={bookings}
          loading={loading}
          pagination={false}
        />
      </div>

    </div >
  );
};

export default AdminHeroBanner;
