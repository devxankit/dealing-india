import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
  FiFileText,
  FiDownload,
  FiVolume2,
  FiCreditCard
} from "react-icons/fi";
import VendorWalletTab from "../components/earnings/VendorWalletTab";

import { motion } from "framer-motion";
import Badge from "../../../shared/components/Badge";
import ExportButton from "../../Admin/components/ExportButton";
import AnimatedSelect from "../../Admin/components/AnimatedSelect";
import { formatPrice } from "../../../shared/utils/helpers";
import { IndianRupee } from "lucide-react";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { useCommissionStore } from "../../../shared/store/commissionStore";
import { useOrderStore } from "../../../shared/store/orderStore";
import { useVendorOrderStore } from "../store/vendorOrderStore";

import {
  getAvailableBannerSlots,
  createBannerBooking,
  getMyBannerBookings,
  confirmBannerPayment
} from "../services/heroBannerService";

const Earnings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendor } = useVendorAuthStore();
  const {
    getVendorCommissions,
    fetchEarningsStats,
    stats,
    fetchSettlements,
    settlements: storeSettlements,
  } = useCommissionStore();
  const { orders, fetchVendorOrders } = useVendorOrderStore();

  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/commission-history")) return "commission";
    if (path.includes("/settlement-history")) return "settlement";
    if (path.includes("/advertisement-payment")) return "advertisement";
    if (path.includes("/wallet")) return "wallet";
    return "overview"; // Default to overview

  };

  const [activeTab, setActiveTab] = useState(getActiveTab());
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [commissions, setCommissions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;

    // Fetch stats and orders
    fetchEarningsStats();
    fetchVendorOrders(vendorId); // Ensure we have latest orders
    fetchSettlements(); // Fetch real settlements from backend

    // Fetch advertisement payments
    const fetchAds = async () => {
      try {
        const response = await getMyBannerBookings();
        if (response.success) {
          setAdvertisements(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching ad payments:", error);
      }
    };
    fetchAds();
  }, [
    vendorId,
    fetchEarningsStats,
    fetchSettlements,
    fetchVendorOrders
  ]);

  // Update settlements when store updates
  useEffect(() => {
    setSettlements(storeSettlements || []);
  }, [storeSettlements]);

  // Derive commissions from real orders
  useEffect(() => {
    if (orders && orders.length > 0) {
      const derivedCommissions = orders.map(order => {
        // Find vendor specific breakdown or items
        // Logic similar to VendorDetail.jsx
        // Assuming order has vendorItems populated or vendorBreakdown
        // For now, let's look for vendorItems which should be populated by getVendorOrders

        // Check if vendorItems is array or object (backend response varies)
        let myItems = [];
        if (Array.isArray(order.vendorItems)) {
          // Multi-vendor structure
          const vItem = order.vendorItems.find(vi => vi.vendorId === vendorId || vi.vendorId?._id === vendorId);
          if (vItem) myItems = vItem.items || [];
        } else if (order.items) {
          // Single vendor or filtered items
          myItems = order.items.filter(i => i.productId?.vendorId === vendorId || i.vendorId === vendorId);
        }

        // Calculate totals
        const subtotal = myItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
        const commissionRate = vendor?.commissionRate ?? 0.1; // Fallback to 10%
        // If backend provides pre-calculated breakdown, use it.
        // But getVendorOrders might not have full breakdown populated deep.
        // Let's rely on simple calculation or if order.vendorBreakdown exists.

        // Allow override from vendorBreakdown if available
        let commission = subtotal * commissionRate;
        let vendorEarnings = subtotal - commission;

        if (order.vendorBreakdown) {
          const vb = order.vendorBreakdown.find(v => v.vendorId === vendorId);
          if (vb) {
            commission = vb.commission;
            vendorEarnings = (vb.subtotal || subtotal) - vb.commission;
          }
        }

        return {
          id: `COMM-${order._id || order.id}`,
          orderId: order.orderCode || order._id,
          vendorId: vendorId,
          subtotal: subtotal,
          commission: commission,
          vendorEarnings: vendorEarnings,
          status: (order.status === 'delivered' || order.status === 'completed') ? 'paid' : (order.status === 'cancelled' ? 'cancelled' : 'pending'),
          createdAt: order.createdAt || order.date
        };
      });
      setCommissions(derivedCommissions);
    }
  }, [orders, vendorId, vendor]);

  // Update internal state when store stats change
  useEffect(() => {
    setEarningsSummary(stats);
  }, [stats]);

  const filteredCommissions = useMemo(() => {
    if (selectedStatus === "all") return commissions;
    return commissions.filter((c) => c.status === selectedStatus);
  }, [commissions, selectedStatus]);

  // Get order details for commission
  const getOrderDetails = (orderId) => {
    return orders.find((o) => o.id === orderId);
  };

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view earnings</p>
      </div>
    );
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "overview") {
      navigate("/vendor/earnings");
    } else if (tab === "commission") {
      navigate("/vendor/earnings/commission-history");
    } else if (tab === "settlement") {
      navigate("/vendor/earnings/settlement-history");
    } else if (tab === "advertisement") {
      navigate("/vendor/earnings/advertisement-payment");
    } else if (tab === "wallet") {
      navigate("/vendor/earnings/wallet");
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Earnings
          </h1>
          <p className="text-gray-600">
            View your earnings and commission history
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto scrollbar-hide -mx-1 px-1">
            <button
              onClick={() => handleTabChange("wallet")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${activeTab === "wallet"
                ? "border-purple-600 text-purple-600 font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-800"
                }`}>
              <FiCreditCard />
              <span>Wallet</span>
            </button>
            <button
              onClick={() => handleTabChange("overview")}

              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${activeTab === "overview"
                ? "border-purple-600 text-purple-600 font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-800"
                }`}>
              <IndianRupee />
              <span>Overview</span>
            </button>
            <button
              onClick={() => handleTabChange("commission")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${activeTab === "commission"
                ? "border-purple-600 text-purple-600 font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-800"
                }`}>
              <FiFileText />
              <span>Commission History</span>
            </button>
            <button
              onClick={() => handleTabChange("settlement")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${activeTab === "settlement"
                ? "border-purple-600 text-purple-600 font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-800"
                }`}>
              <FiCheckCircle />
              <span>Settlement History</span>
            </button>
            <button
              onClick={() => handleTabChange("advertisement")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${activeTab === "advertisement"
                ? "border-purple-600 text-purple-600 font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-800"
                }`}>
              <FiVolume2 />
              <span>Advertisement Payment</span>
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6">
          {/* Earnings Summary Cards - Show on Overview tab */}
          {activeTab === "overview" && (
            <div className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 shadow-sm border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-green-700 font-medium">
                      Total Earnings
                    </p>
                    <IndianRupee className="text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {earningsSummary
                      ? formatPrice(earningsSummary.totalEarnings)
                      : formatPrice(0)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">All time</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 shadow-sm border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-yellow-700 font-medium">
                      Pending
                    </p>
                    <FiClock className="text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-800">
                    {earningsSummary
                      ? formatPrice(earningsSummary.pendingEarnings)
                      : formatPrice(0)}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Awaiting settlement
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 shadow-sm border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-blue-700 font-medium">Paid</p>
                    <FiCheckCircle className="text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    {earningsSummary
                      ? formatPrice(earningsSummary.totalEarnings - earningsSummary.pendingEarnings)
                      : formatPrice(0)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Settled</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 shadow-sm border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-purple-700 font-medium">
                      Total Orders
                    </p>
                    <FiTrendingUp className="text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-800">
                    {earningsSummary ? earningsSummary.totalOrders : 0}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">With earnings</p>
                </div>
              </div>
            </div>
          )}

          {/* Commission History Section */}
          {(activeTab === "overview" || activeTab === "commission") && (
            <div className={activeTab === "overview" ? "mb-6" : ""}>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-1">
                      Commission History
                    </h2>
                    <p className="text-sm text-gray-600">
                      View all your commission records
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <AnimatedSelect
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "pending", label: "Pending" },
                        { value: "paid", label: "Paid" },
                        { value: "cancelled", label: "Cancelled" },
                      ]}
                      className="min-w-[140px]"
                    />
                    <ExportButton
                      data={filteredCommissions}
                      headers={[
                        { label: "Order ID", accessor: (row) => row.orderId },
                        {
                          label: "Date",
                          accessor: (row) =>
                            new Date(row.createdAt).toLocaleDateString(),
                        },
                        {
                          label: "Subtotal",
                          accessor: (row) => formatPrice(row.subtotal),
                        },
                        {
                          label: "Commission",
                          accessor: (row) => formatPrice(row.commission),
                        },
                        {
                          label: "Your Earnings",
                          accessor: (row) => formatPrice(row.vendorEarnings),
                        },
                        { label: "Status", accessor: (row) => row.status },
                      ]}
                      filename="vendor-commissions"
                    />
                  </div>
                </div>

                {filteredCommissions.length > 0 ? (
                  <div className="space-y-3">
                    {filteredCommissions.map((commission) => {
                      const order = getOrderDetails(commission.orderId);
                      return (
                        <div
                          key={commission.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-800">
                                {commission.orderId}
                              </h3>
                              <Badge
                                variant={
                                  commission.status === "paid"
                                    ? "success"
                                    : commission.status === "pending"
                                      ? "warning"
                                      : "error"
                                }>
                                {commission.status?.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Date</p>
                                <p className="font-semibold text-gray-800">
                                  {new Date(
                                    commission.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Subtotal</p>
                                <p className="font-semibold text-gray-800">
                                  {formatPrice(commission.subtotal)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Commission</p>
                                <p className="font-semibold text-red-600">
                                  -{formatPrice(commission.commission)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Your Earnings</p>
                                <p className="font-semibold text-green-600">
                                  {formatPrice(commission.vendorEarnings)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {order && (
                              <button
                                onClick={() =>
                                  navigate(
                                    `/vendor/orders/${commission.orderId}`
                                  )
                                }
                                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                View Order
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiFileText className="text-4xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">
                      No commission records found
                    </p>
                    <p className="text-sm text-gray-400">
                      {selectedStatus !== "all"
                        ? "Try selecting a different status"
                        : "Commissions will appear here once you receive orders"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settlement History Section */}
          {(activeTab === "overview" || activeTab === "settlement") &&
            settlements.length > 0 && (
              <div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 mb-1">
                        Settlement History
                      </h2>
                      <p className="text-sm text-gray-600">
                        View your payment settlements
                      </p>
                    </div>
                    <ExportButton
                      data={settlements}
                      headers={[
                        { label: "Settlement ID", accessor: (row) => row.id },
                        {
                          label: "Date",
                          accessor: (row) =>
                            new Date(row.createdAt).toLocaleDateString(),
                        },
                        {
                          label: "Amount",
                          accessor: (row) => formatPrice(row.amount),
                        },
                        {
                          label: "Payment Method",
                          accessor: (row) => row.paymentMethod,
                        },
                        {
                          label: "Transaction ID",
                          accessor: (row) => row.transactionId || row._id?.toString().slice(-8).toUpperCase() || "N/A",
                        },
                      ]}
                      filename="vendor-settlements"
                    />
                  </div>

                  <div className="space-y-3">
                    {settlements.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-800">
                              {settlement.id}
                            </h3>
                            <Badge variant="success">PAID</Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Date Paid</p>
                              <p className="font-semibold text-gray-800">
                                {new Date(
                                  settlement.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Amount</p>
                              <p className="font-semibold text-green-600">
                                {formatPrice(settlement.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Payment Method</p>
                              <p className="font-semibold text-gray-800 capitalize">
                                {settlement.paymentMethod?.replace("_", " ") ||
                                  "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Transaction ID</p>
                              <p className="font-semibold text-gray-800 text-xs">
                                {settlement.transactionId || settlement._id?.toString().slice(-8).toUpperCase() || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          {activeTab === "settlement" && settlements.length === 0 && (
            <div className="text-center py-12">
              <FiCheckCircle className="text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No settlement records found</p>
              <p className="text-sm text-gray-400">
                Settlements will appear here once your commissions are paid
              </p>
            </div>
          )}

          {/* Advertisement Payment Section */}
          {activeTab === "advertisement" && (
            <div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-1">
                      Advertisement Payments
                    </h2>
                    <p className="text-sm text-gray-600">
                      View your payments for banner advertisements
                    </p>
                  </div>
                  <ExportButton
                    data={advertisements}
                    headers={[
                      { label: "Booking ID", accessor: (row) => row.referenceId || row._id },
                      {
                        label: "Date",
                        accessor: (row) =>
                          new Date(row.createdAt).toLocaleDateString(),
                      },
                      {
                        label: "Amount",
                        accessor: (row) => formatPrice(row.amount),
                      },
                      {
                        label: "Status",
                        accessor: (row) => row.status,
                      },
                    ]}
                    filename="advertisement-payments"
                  />
                </div>

                {advertisements.length > 0 ? (
                  <div className="space-y-3">
                    {advertisements.map((ad) => (
                      <div
                        key={ad._id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-800">
                              {ad.referenceId || `AD-${ad._id.substring(0, 8)}`}
                            </h3>
                            <Badge
                              variant={
                                ad.status === "active" || ad.status === "approved"
                                  ? "success"
                                  : ad.status === "pending"
                                    ? "warning"
                                    : "error"
                              }>
                              {ad.status?.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Payment Date</p>
                              <p className="font-semibold text-gray-800">
                                {new Date(ad.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Amount Paid</p>
                              <p className="font-semibold text-blue-600">
                                {formatPrice(ad.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Banner Slot</p>
                              <p className="font-semibold text-gray-800">
                                Slot {ad.slotId?.slotNumber || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Duration</p>
                              <p className="font-semibold text-gray-800">
                                {ad.durationHours} Hours
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/vendor/hero-banner-booking`)}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          View Booking
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiVolume2 className="text-4xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No advertisement payment records found</p>
                    <p className="text-sm text-gray-400">
                      Payment history for your advertisements will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wallet Section */}
          {activeTab === "wallet" && (
            <VendorWalletTab />
          )}
        </div>
      </div>

    </motion.div>
  );
};

export default Earnings;
