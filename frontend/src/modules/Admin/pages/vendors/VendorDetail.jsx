import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiMail,
  FiPhone,
  FiMapPin,
  FiShoppingBag,
  FiClock,
  FiEdit,
  FiPackage,
  FiCheckCircle,
  FiXCircle,
  FiTrendingUp,
  FiUser,
  FiFileText,
  FiDownload,
  FiFile,
  FiEye,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { useVendorManagementStore } from "../../store/vendorManagementStore";
import { useAdminVendorWalletStore } from "../../store/adminVendorWalletStore";
import Badge from "../../../../shared/components/Badge";
import DataTable from "../../components/DataTable";
import { formatPrice } from "../../../../shared/utils/helpers";
import toast from "react-hot-toast";
import { IndianRupee } from "lucide-react";

// PDF Preview Component - Uses multiple methods for reliable PDF display
const PdfPreviewFrame = ({ doc, index }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMethod, setViewMethod] = useState('google'); // 'google', 'direct', 'blob'

  // Check if URL is Cloudinary
  const isCloudinary = doc.url.includes('cloudinary.com');

  // Create different viewer URLs
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(doc.url)}&embedded=true`;
  const directUrl = isCloudinary ? `${doc.url}#toolbar=1&navpanes=1&scrollbar=1` : `${doc.url}#view=FitH`;

  // Determine which URL to use
  const getIframeSrc = () => {
    switch (viewMethod) {
      case 'direct':
        return directUrl;
      case 'blob':
        return null; // Will be set via blob URL
      case 'google':
      default:
        return googleViewerUrl;
    }
  };

  const [blobUrl, setBlobUrl] = useState(null);
  const iframeSrc = viewMethod === 'blob' ? blobUrl : getIframeSrc();

  useEffect(() => {
    // Try to load blob URL if using blob method
    if (viewMethod === 'blob') {
      const loadBlob = async () => {
        try {
          const response = await fetch(doc.url, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
          } else {
            throw new Error('Failed to fetch');
          }
        } catch (err) {
          console.error('Blob load failed:', err);
          setViewMethod('google'); // Fallback to Google Viewer
        }
      };
      loadBlob();
    }

    // Set loading timeout
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [viewMethod, doc.url]);

  const handleIframeLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    // Try next method
    if (viewMethod === 'google') {
      setViewMethod('direct');
      setLoading(true);
    } else if (viewMethod === 'direct') {
      setViewMethod('blob');
      setLoading(true);
    } else {
      setError(true);
    }
  };

  if (error || (!iframeSrc && viewMethod !== 'blob')) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 border border-gray-200 rounded">
        <div className="text-center p-4">
          <p className="text-gray-600 mb-3">PDF preview is not available.</p>
          <div className="flex flex-col gap-2 items-center">
            <button
              type="button"
              onClick={() => {
                window.open(doc.url, '_blank', 'noopener,noreferrer');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Open PDF in New Tab
            </button>
            <button
              type="button"
              onClick={() => {
                setError(false);
                setLoading(true);
                setViewMethod('google');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Retry Preview
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!iframeSrc && viewMethod === 'blob') {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading PDF preview...</p>
          </div>
        </div>
      )}
      <iframe
        src={iframeSrc}
        className="w-full h-96 border-0"
        title={`PDF Preview: ${doc.name}`}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        style={{ display: error ? 'none' : 'block' }}
      />
    </div>
  );
};

const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showPdfPreview, setShowPdfPreview] = useState({});
  const {
    selectedVendor,
    isLoading,
    fetchVendorById,
    fetchVendorOrders,
    fetchVendorAnalytics,
    updateVendorStatus,
    updateCommissionRate,
  } = useVendorManagementStore();

  const { fetchVendorWallet } = useAdminVendorWalletStore();

  const [vendor, setVendor] = useState(null);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditingCommission, setIsEditingCommission] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");
  const [commissions, setCommissions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  // Fetch vendor data on component mount
  useEffect(() => {
    const loadVendorData = async () => {
      try {
        const vendorData = await fetchVendorById(id);
        if (vendorData) {
          setVendor(vendorData);
          setCommissionRate(((vendorData.commissionRate || 0) * 100).toFixed(1));

          // Fetch analytics
          const analyticsData = await fetchVendorAnalytics(id);
          if (analyticsData) {
            setAnalytics(analyticsData);
          }

          // Fetch wallet balance
          const walletData = await fetchVendorWallet(id);
          if (walletData) {
            setWalletBalance(walletData.balance || 0);
          }

          // Fetch orders
          const ordersData = await fetchVendorOrders(id, { page: 1, limit: 100 });
          if (ordersData && ordersData.orders) {
            setVendorOrders(ordersData.orders);

            // Calculate commissions from orders
            const commissionRecords = ordersData.orders
              .filter(order => {
                const vendorItem = order.vendorItems?.find(
                  (vi) => vi.vendorId === vendorData.id || vi.vendorId?.toString() === vendorData.id?.toString()
                );
                return vendorItem && vendorItem.subtotal > 0;
              })
              .map(order => {
                const vendorItem = order.vendorItems?.find(
                  (vi) => vi.vendorId === vendorData.id || vi.vendorId?.toString() === vendorData.id?.toString()
                );
                const subtotal = vendorItem?.subtotal || 0;
                const commission = vendorItem?.commission || (subtotal * (vendorData.commissionRate || 0.1));
                const vendorEarnings = vendorItem?.vendorEarnings || (subtotal - commission);

                // Determine status based on order status
                let status = 'pending';
                if (order.status === 'delivered' || order.status === 'completed') {
                  status = 'paid';
                } else if (order.status === 'cancelled' || order.status === 'canceled') {
                  status = 'cancelled';
                }

                return {
                  orderId: order.id || order._id,
                  createdAt: order.createdAt || order.date || new Date().toISOString(),
                  subtotal: subtotal,
                  commission: commission,
                  vendorEarnings: vendorEarnings,
                  status: status,
                };
              });

            setCommissions(commissionRecords);
          }
        } else {
          toast.error("Vendor not found");
          navigate("/admin/vendors");
        }
      } catch (error) {
        toast.error("Failed to load vendor data");
        navigate("/admin/vendors");
      }
    };

    loadVendorData();
  }, [id, fetchVendorById, fetchVendorAnalytics, fetchVendorOrders, navigate]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      const updatedVendor = await updateVendorStatus(vendor.id, newStatus);
      setVendor(updatedVendor);
      toast.success(`Vendor status updated to ${newStatus}`);
    } catch (error) {
      // Error toast is shown by API interceptor
    }
  };

  const handleCommissionUpdate = async () => {
    const rate = parseFloat(commissionRate) / 100;
    if (isNaN(rate) || rate < 0 || rate > 1) {
      toast.error("Please enter a valid commission rate (0-100%)");
      return;
    }
    try {
      const updatedVendor = await updateCommissionRate(vendor.id, rate);
      setVendor(updatedVendor);
      setIsEditingCommission(false);
      toast.success("Commission rate updated successfully");
    } catch (error) {
      // Error toast is shown by API interceptor
    }
  };

  // Get earnings summary from analytics
  const earningsSummary = analytics?.stats || {
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
  };

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const orderColumns = [
    {
      key: "id",
      label: "Order ID",
      sortable: true,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === "delivered"
              ? "success"
              : value === "pending"
                ? "warning"
                : value === "cancelled" || value === "canceled"
                  ? "error"
                  : "info"
          }>
          {value?.toUpperCase() || "N/A"}
        </Badge>
      ),
    },
    {
      key: "total",
      label: "Amount",
      sortable: true,
      render: (_, row) => {
        const vendorItem = row.vendorItems?.find(
          (vi) => vi.vendorId === vendor.id
        );
        return formatPrice(vendorItem?.subtotal || 0);
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => navigate(`/admin/orders/${row.id}`)}
          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          View
        </button>
      ),
    },
  ];

  const commissionColumns = [
    {
      key: "orderId",
      label: "Order ID",
      sortable: true,
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "subtotal",
      label: "Subtotal",
      sortable: true,
      render: (value) => formatPrice(value),
    },
    {
      key: "commission",
      label: "Commission",
      sortable: true,
      render: (value) => (
        <span className="text-red-600">-{formatPrice(value)}</span>
      ),
    },
    {
      key: "vendorEarnings",
      label: "Vendor Earnings",
      sortable: true,
      render: (value) => (
        <span className="text-green-600">{formatPrice(value)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === "paid"
              ? "success"
              : value === "pending"
                ? "warning"
                : "error"
          }>
          {value?.toUpperCase()}
        </Badge>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <FiArrowLeft className="text-lg text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              {vendor.storeName || vendor.name}
            </h1>
            <p className="text-xs text-gray-500">Vendor ID: {vendor.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              vendor.status === "approved"
                ? "success"
                : vendor.status === "pending"
                  ? "warning"
                  : "error"
            }>
            {vendor.status?.toUpperCase()}
          </Badge>
          {vendor.status === "pending" && (
            <button
              onClick={() => handleStatusUpdate("approved")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
              <FiCheckCircle />
              Approve
            </button>
          )}
          {vendor.status === "approved" && (
            <button
              onClick={() => handleStatusUpdate("rejected")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
              <FiXCircle />
              Suspend
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {["overview", "documents", "orders", "commissions", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === tab
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-gray-600 hover:text-gray-800"
                }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Vendor Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">
                    Vendor Information
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <FiUser className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Name</p>
                        <p className="font-semibold text-gray-800">
                          {vendor.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FiMail className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Email</p>
                        <p className="font-semibold text-gray-800">
                          {vendor.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FiPhone className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Phone</p>
                        <p className="font-semibold text-gray-800">
                          {vendor.phone || "N/A"}
                        </p>
                      </div>
                    </div>
                    {vendor.address && (
                      <div className="flex items-start gap-3">
                        <FiMapPin className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-xs text-gray-600">Address</p>
                          <p className="font-semibold text-gray-800">
                            {vendor.address.street || ""}
                            {vendor.address.city && `, ${vendor.address.city}`}
                            {vendor.address.state &&
                              `, ${vendor.address.state}`}
                            {vendor.address.zipCode &&
                              ` ${vendor.address.zipCode}`}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <FiClock className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Join Date</p>
                        <p className="font-semibold text-gray-800">
                          {new Date(vendor.joinDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">
                    Performance
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-xs text-blue-600 mb-1">Total Orders</p>
                      <p className="text-2xl font-bold text-blue-800">
                        {vendorOrders.length}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-green-600 mb-1">
                        Total Earnings
                      </p>
                      <p className="text-2xl font-bold text-green-800">
                        {earningsSummary
                          ? formatPrice(earningsSummary.totalEarnings)
                          : formatPrice(0)}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-xs text-yellow-600 mb-1">
                        Pending Earnings
                      </p>
                      <p className="text-2xl font-bold text-yellow-800">
                        {earningsSummary
                          ? formatPrice(earningsSummary.pendingEarnings)
                          : formatPrice(0)}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs text-purple-600 mb-1">
                        Wallet Balance (Withdrawable)
                      </p>
                      <p className="text-2xl font-bold text-purple-800">
                        {formatPrice(walletBalance)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-1">
                        Commission Rate
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {((vendor.commissionRate || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Vendor Orders
              </h2>
              {vendorOrders.length > 0 ? (
                <DataTable
                  data={vendorOrders}
                  columns={orderColumns}
                  pagination={true}
                  itemsPerPage={10}
                />
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No orders found
                </p>
              )}
            </div>
          )}

          {/* Commissions Tab */}
          {activeTab === "commissions" && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Commission History
              </h2>
              {commissions.length > 0 ? (
                <DataTable
                  data={commissions}
                  columns={commissionColumns}
                  pagination={true}
                  itemsPerPage={10}
                />
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No commission records found
                </p>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Business Documents
              </h2>
              {vendor.documents && vendor.documents.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {vendor.documents.map((doc, index) => {
                    const isImage = doc.type?.startsWith('image/') || 
                                   doc.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const isPDF = doc.type === 'application/pdf' || 
                                 doc.type?.toLowerCase().includes('pdf') || 
                                 doc.url?.toLowerCase().endsWith('.pdf') ||
                                 doc.name?.toLowerCase().includes('pdf');

                    return (
                      <div
                        key={index}
                        className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPDF ? 'bg-red-50' : 'bg-blue-50'}`}>
                              <FiFile className={`text-xl ${isPDF ? 'text-red-500' : 'text-blue-500'}`} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-lg">
                                {doc.name}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* View Button */}
                            {(isPDF || isImage) && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  const toastId = toast.loading(`Opening ${isPDF ? 'PDF' : 'document'}...`);
                                  
                                  try {
                                    // Clean up Cloudinary URL
                                    let viewUrl = doc.url;
                                    
                                    if (viewUrl.includes('cloudinary.com') && viewUrl.includes('/upload/')) {
                                      const parts = viewUrl.split('/upload/');
                                      const baseUrl = parts[0] + '/upload/';
                                      const path = parts[1];
                                      
                                      // Find the first occurrence of version (v + digits)
                                      const versionMatch = path.match(/(^|\/)v\d+/);
                                      
                                      if (versionMatch) {
                                          const versionIndex = versionMatch.index + (versionMatch[0].startsWith('/') ? 1 : 0);
                                          const cleanPath = path.substring(versionIndex);
                                          viewUrl = baseUrl + cleanPath;
                                      }
                                      
                                      // If it's a PDF but doesn't end with .pdf, add it for better browser handling
                                      // IMPORTANT: Only add .pdf if it's NOT a 'raw' resource, as raw resources 404 with extra extensions
                                      if (isPDF && !viewUrl.toLowerCase().endsWith('.pdf') && !viewUrl.includes('/raw/upload/')) {
                                          viewUrl = viewUrl + '.pdf';
                                      }
                                    }

                                    // Direct window open is more reliable than fetch for 401/CORS issues
                                    window.open(viewUrl, '_blank');
                                    toast.success('Document opened in new tab', { id: toastId });
                                  } catch (err) {
                                    console.error('View error:', err);
                                    window.open(doc.url, '_blank');
                                    toast.dismiss(toastId);
                                  }
                                }}
                                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                title="View Document"
                              >
                                <FiEye size={18} />
                              </button>
                            )}
                            {/* Download Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                const toastId = toast.loading('Preparing download...');
                                
                                // For download, use clean URL
                                let downloadUrl = doc.url;
                                
                                if (downloadUrl.includes('cloudinary.com') && downloadUrl.includes('/upload/')) {
                                  const parts = downloadUrl.split('/upload/');
                                  const baseUrl = parts[0] + '/upload/';
                                  const path = parts[1];
                                  
                                  // Find the first occurrence of version (v + digits)
                                  const versionMatch = path.match(/(^|\/)v\d+/);
                                  
                                  if (versionMatch) {
                                      const versionIndex = versionMatch.index + (versionMatch[0].startsWith('/') ? 1 : 0);
                                      const cleanPath = path.substring(versionIndex);
                                      downloadUrl = baseUrl + cleanPath;
                                  }
                                  
                                  // If it's a PDF but doesn't end with .pdf, add it for better browser handling
                                  // IMPORTANT: Only add .pdf if it's NOT a 'raw' resource, as raw resources 404 with extra extensions
                                  if (isPDF && !downloadUrl.toLowerCase().endsWith('.pdf') && !downloadUrl.includes('/raw/upload/')) {
                                      downloadUrl = downloadUrl + '.pdf';
                                  }
                                }

                                // Direct window open is more reliable for Cloudinary downloads
                                window.open(downloadUrl, '_blank');
                                toast.success('Download started', { id: toastId });
                              }}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Download"
                            >
                              <FiDownload size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Display Image */}
                        {isImage && (
                          <div className="mt-4 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                            <img
                              src={doc.url}
                              alt={doc.name}
                              className="w-full max-h-[300px] object-contain mx-auto"
                            />
                          </div>
                        )}

                        {/* Display PDF Preview */}
                        {isPDF && (
                          <div className="mt-4">
                            {!showPdfPreview[index] ? (
                              <button
                                type="button"
                                onClick={() => setShowPdfPreview(prev => ({ ...prev, [index]: true }))}
                                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 transition-all"
                              >
                                Preview PDF Content
                              </button>
                            ) : (
                              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-inner">
                                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">PDF Preview</span>
                                  <button
                                    type="button"
                                    onClick={() => setShowPdfPreview(prev => ({ ...prev, [index]: false }))}
                                    className="text-xs text-red-500 hover:text-red-600 font-bold"
                                  >
                                    Close Preview
                                  </button>
                                </div>
                                <div className="h-[400px]">
                                  <PdfPreviewFrame doc={doc} index={index} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="text-3xl text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No documents uploaded yet</p>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                  Commission Rate
                </h2>
                <div className="flex items-center gap-4">
                  {isEditingCommission ? (
                    <>
                      <input
                        type="number"
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(e.target.value)}
                        min="0"
                        max="100"
                        step="0.1"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-32"
                        placeholder="10.0"
                      />
                      <button
                        onClick={handleCommissionUpdate}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingCommission(false);
                          setCommissionRate(
                            ((vendor.commissionRate || 0) * 100).toFixed(1)
                          );
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-800">
                        {((vendor.commissionRate || 0) * 100).toFixed(1)}%
                      </p>
                      <button
                        onClick={() => setIsEditingCommission(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2">
                        <FiEdit />
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VendorDetail;
