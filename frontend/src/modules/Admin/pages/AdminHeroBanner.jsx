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
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { formatPrice } from "../../../shared/utils/helpers";
import { IndianRupee } from "lucide-react";
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
    minDurationHours: 1,
    maxDurationHours: 720,
    defaultPricePerHour: 1999,
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
  
  // Pricing structure editor state
  const [newPricingEntry, setNewPricingEntry] = useState({ hours: "", price: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [slotsRes, bookingsRes, revenueRes] = await Promise.all([
        getAdminBannerSlots(),
        getAdminBannerBookings(),
        getBannerRevenueStats()
      ]);
      
      const loadedSettings = slotsRes.data.settings || settings;
      setSlots(slotsRes.data.slots || []);
      setSettings(loadedSettings);
      setSettingsForm(loadedSettings);
      setBookings(bookingsRes.data || []);
      setRevenueStats(revenueRes.data || { totalRevenue: 0, percentageChange: 0 });
    } catch (error) {
      console.error("Error loading admin banner data:", error);
      toast.error("Failed to load banner management data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (slotId) => {
    const price = parseFloat(tempPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setLoading(true);
    try {
      await updateBannerSlot(slotId, { price });
      setSlots(slots.map(s => s._id === slotId ? { ...s, price } : s));
      setEditingSlotId(null);
      toast.success("Slot price updated");
    } catch (error) {
      toast.error("Failed to update price");
    } finally {
      setLoading(false);
    }
  };

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
    if (settingsForm.defaultPricePerHour < 0) {
      toast.error("Default price per hour cannot be negative");
      return;
    }
    
    setLoading(true);
    try {
      await updateBannerSettings(settingsForm);
      setSettings(settingsForm);
      setShowSettingsPanel(false);
      toast.success("Banner settings updated successfully");
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
          <span className="font-medium">{val?.businessName || "N/A"}</span>
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
    <div className="p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hero Banner Management</h1>
          <p className="text-gray-500">Manage banner slots, bookings, and display settings</p>
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
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Banner Revenue</p>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
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
                      onChange={(e) => setSettingsForm({ ...settingsForm, minDurationHours: parseInt(e.target.value) || 1 })}
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum: 1 hour</p>
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

                  {/* Default Price Per Hour */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Price Per Hour (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={settingsForm.defaultPricePerHour}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultPricePerHour: parseFloat(e.target.value) || 1999 })}
                    />
                    <p className="mt-1 text-xs text-gray-500">Used when no specific pricing entry exists for a duration</p>
                  </div>
                </div>

                {/* Pricing Structure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pricing Structure
                    <div className="group relative inline-block ml-2">
                      <FiInfo className="text-gray-400 cursor-help" />
                      <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg z-20">
                        Define specific prices for different durations. Prices for durations not listed will be calculated proportionally from the default price.
                      </div>
                    </div>
                  </label>
                  
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Duration (hours)</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Price (₹)</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(settingsForm.pricingStructure || {})
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([hours, price]) => (
                              <tr key={hours} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm">{formatDuration(parseInt(hours))} ({hours}h)</td>
                                <td className="px-4 py-2 text-sm font-medium">{formatPrice(price)}</td>
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
                            ))}
                          {Object.keys(settingsForm.pricingStructure || {}).length === 0 && (
                            <tr>
                              <td colSpan="3" className="px-4 py-4 text-center text-sm text-gray-500">
                                No pricing entries. Prices will use default rate.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
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
                        <FiPlus /> Add
                      </button>
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
              className={`p-4 rounded-xl border-2 bg-white ${
                isActive ? "border-green-100 shadow-sm" : "border-gray-100 opacity-80"
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
              <div className="flex justify-between items-center mb-1">
                {editingSlotId === slot._id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="w-20 px-1 py-0.5 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                      autoFocus
                    />
                    <button 
                      onClick={() => handleUpdatePrice(slot._id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <FiCheckCircle size={14} />
                    </button>
                    <button 
                      onClick={() => setEditingSlotId(null)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiXCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/price">
                    <div className="text-lg font-bold text-gray-900">{formatPrice(slot.price)}</div>
                    <button 
                      onClick={() => {
                        setEditingSlotId(slot._id);
                        setTempPrice(slot.price.toString());
                      }}
                      className="text-gray-400 hover:text-blue-600 opacity-0 group-hover/price:opacity-100 transition-opacity"
                    >
                      <FiEdit3 size={14} />
                    </button>
                  </div>
                )}
              </div>
              
              {isActive ? (
                <div className="mt-3 space-y-2">
                  <img src={booking.bannerImage} alt="" className="w-full h-20 object-cover rounded border" />
                  <p className="text-xs font-medium text-gray-700 truncate">{booking.vendorId?.businessName}</p>
                </div>
              ) : (
                <div className="mt-3 h-28 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <FiCalendar className="text-gray-300 text-xl mb-1" />
                  <p className="text-[10px] text-gray-400 font-medium">AVAILABLE FOR BOOKING</p>
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

    </div>
  );
};

export default AdminHeroBanner;
