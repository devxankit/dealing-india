import { useState, useEffect } from "react";
import {
  FiSettings,
  FiCalendar,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiDollarSign,
  FiInfo,
  FiEdit3,
} from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { formatPrice } from "../../../shared/utils/helpers";
import {
  getAdminBannerSlots,
  getAdminBannerBookings,
  updateBannerSettings,
  updateBannerSlot,
  MOCK_BANNERS
} from "../../Vendor/services/heroBannerService";
import Badge from "../../../shared/components/Badge";
import DataTable from "../components/DataTable";

const AdminHeroBanner = () => {
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [mockBanners] = useState(MOCK_BANNERS);
  const [settings, setSettings] = useState({ universalDisplayTime: 2000 });
  const [loading, setLoading] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempDisplayTime, setTempDisplayTime] = useState(2000);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [tempPrice, setTempPrice] = useState("");

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getAdminBannerSlots();
      setSlots(response.data.slots || []);
      setSettings(response.data.settings || { universalDisplayTime: 2000 });
      setTempDisplayTime(response.data.settings?.universalDisplayTime || 2000);
      
      const bookingsRes = await getAdminBannerBookings();
      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error("Error loading admin banner data:", error);
      toast.error("Failed to load banner management data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (tempDisplayTime < 500) {
      toast.error("Display time must be at least 500ms");
      return;
    }
    
    setLoading(true);
    try {
      await updateBannerSettings({ universalDisplayTime: tempDisplayTime });
      setSettings({ ...settings, universalDisplayTime: tempDisplayTime });
      setIsEditingSettings(false);
      toast.success("Universal display time updated");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
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
      header: "Booking Date",
      accessor: "createdAt",
      render: (val) => new Date(val).toLocaleDateString(),
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
              {isEditingSettings ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    value={tempDisplayTime}
                    onChange={(e) => setTempDisplayTime(parseInt(e.target.value))}
                  />
                  <span className="text-xs text-gray-500">ms</span>
                  <button 
                    onClick={handleUpdateSettings}
                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    <FiCheckCircle />
                  </button>
                  <button 
                    onClick={() => (setIsEditingSettings(false), setTempDisplayTime(settings.universalDisplayTime))}
                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    <FiXCircle />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-gray-900">{settings.universalDisplayTime}ms</p>
                  <button 
                    onClick={() => setIsEditingSettings(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <FiSettings className="text-xs" /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="h-10 w-px bg-gray-100"></div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <FiDollarSign className="text-xl" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Bookings</p>
              <p className="text-lg font-bold text-gray-900">{bookings.filter(b => b.status === 'active').length}</p>
            </div>
          </div>
        </div>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-10">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Banner Configurations (Mock)</h2>
            <p className="text-sm text-gray-500">Full metadata and backend settings for active banners</p>
          </div>
          <Badge variant="info">SYSTEM VIEW</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3">Banner / Slot</th>
                <th className="px-6 py-3">Vendor Info</th>
                <th className="px-6 py-3">Performance</th>
                <th className="px-6 py-3">Configurations</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockBanners.map((banner) => (
                <tr key={banner.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={banner.image} className="h-12 w-20 object-cover rounded border shadow-sm" alt="" />
                      <div>
                        <p className="font-bold text-gray-900">{banner.title}</p>
                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Slot {banner.slot}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{banner.vendor}</p>
                    <p className="text-xs text-gray-500">{new Date(banner.startDate).toLocaleDateString()} - {new Date(banner.endDate).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Clicks:</span>
                        <span className="font-bold">{banner.clicks}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Impressions:</span>
                        <span className="font-bold">{banner.impressions}</span>
                      </div>
                      <div className="w-20 bg-gray-100 h-1 rounded-full mt-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full" 
                          style={{ width: `${Math.min(100, (banner.clicks / banner.impressions) * 1000)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {Object.entries(banner.metadata).map(([k, v]) => (
                        <span key={k} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-bold border border-blue-100">
                          {k.toUpperCase()}: {v}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={banner.status === 'active' ? 'success' : 'warning'}>
                      {banner.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Edit Metadata">
                        <FiEdit3 size={16} />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors" title="View Full Details">
                        <FiEye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
