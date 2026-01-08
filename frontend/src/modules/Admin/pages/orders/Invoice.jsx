import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiDownload, FiPrinter } from "react-icons/fi";
import { motion } from "framer-motion";
import { formatPrice } from "../../../../shared/utils/helpers";
import { getAdminOrderById } from "../../../../shared/services/orderService";
import { useSettingsStore } from "../../../../shared/store/settingsStore";
import toast from "react-hot-toast";
import logoImage from "../../../../../data/logos/ChatGPT Image Dec 2, 2025, 03_01_19 PM.png";

const Invoice = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettingsStore();
  const storeLogo = settings?.general?.storeLogo || logoImage;
  // Force store name to Dealing India as requested
  const storeName = "Dealing India";
  const storeAddress = settings?.general?.address || "";
  const storePhone = settings?.general?.contactPhone || "";
  const storeEmail = settings?.general?.contactEmail || "";

  useEffect(() => {
    // Set document title for print header
    document.title = "Invoice - Dealing India";

    const fetchOrder = async () => {
      if (!id) {
        navigate("/admin/orders/all-orders");
        return;
      }

      try {
        setLoading(true);
        const response = await getAdminOrderById(id);
        if (response.success && response.data?.order) {
          setOrder(response.data.order);
        } else {
          toast.error("Order not found");
          navigate("/admin/orders/all-orders");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error("Failed to load order");
        navigate("/admin/orders/all-orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Cleanup title on unmount
    return () => {
      document.title = "Dealing India Admin";
    };
  }, [id, navigate]);

  if (loading || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Get order items
  const items = Array.isArray(order.items) ? order.items : [];

  // Calculate totals from pricing object or fallback
  const pricing = order.pricing || {};
  const subtotal = pricing.subtotal ?? (order.subtotal || 0);
  const tax = pricing.tax ?? (order.tax || 0);
  const discount = pricing.discount ?? (order.discount || 0);
  const shipping = pricing.shipping ?? (order.shipping || 0);
  const platformFee = pricing.platformFee ?? 0;
  const finalTotal = pricing.total ?? (order.total || (subtotal + tax + shipping + platformFee - discount));

  // Format payment method
  const formatPaymentMethod = (method) => {
    if (!method) return "N/A";
    const methodMap = {
      card: "Credit Card",
      cod: "Cash on Delivery",
      wallet: "Wallet",
      creditCard: "Credit Card",
      cash: "Cash on Delivery",
    };
    return (
      methodMap[method.toLowerCase()] ||
      method.charAt(0).toUpperCase() + method.slice(1)
    );
  };

  const handleDownload = () => {
    window.print();
    toast.success("Preparing invoice for download...");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Header - Hidden in print */}
      <div className="no-print">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6">
          <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <FiArrowLeft className="text-lg text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Invoice
                </h1>
                <p className="text-xs text-gray-500">Order #{order.orderCode || order.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold">
                <FiDownload />
                Download
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold">
                <FiPrinter />
                Print
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Invoice Content - Only this prints */}
      <div className="invoice-content bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200">
        {/* Logo and Invoice Header */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
            {/* Logo */}
            <div className="flex items-center justify-start sm:justify-start">
              <img
                src={storeLogo}
                alt={storeName}
                className="h-24 sm:h-32 md:h-40 w-auto object-contain"
                onError={(e) => {
                  e.target.src = logoImage;
                }}
              />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700 mb-1">Order Status</p>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold capitalize mb-3">
                {order.status}
              </span>
              <p className="text-sm font-semibold text-gray-700 mb-1">Payment Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize ${order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {order.paymentStatus || 'pending'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-start">
            {/* Store Information */}
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-800 mb-1">{storeName}</h3>
              <div className="text-sm text-gray-600 space-y-0.5">
                {storeAddress && <p>{storeAddress}</p>}
                {storePhone && <p>Phone: {storePhone}</p>}
                {storeEmail && <p>Email: {storeEmail}</p>}
              </div>
            </div>

            {/* Invoice Title */}
            <div className="mt-2 text-right">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">INVOICE</h2>
              <p className="text-gray-600">
                Order #<span className="font-semibold">{order.orderCode || order.id}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Date: {new Date(order.orderDate || order.createdAt || order.date).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div className="address-grid grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase">
              Bill To
            </h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold">{order.customerSnapshot?.name || order.customerId?.name || order.customer?.name || "N/A"}</p>
              <p>{order.customerSnapshot?.email || order.customerId?.email || order.customer?.email || "N/A"}</p>
              {(order.customerSnapshot?.phone || order.customerId?.phone || order.customer?.phone) && (
                <p>{order.customerSnapshot?.phone || order.customerId?.phone || order.customer?.phone}</p>
              )}
            </div>
          </div>
          {order.shippingAddress && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase">
                Ship To
              </h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-semibold">
                  {order.shippingAddress.name || order.customerSnapshot?.name || order.customerId?.name || "N/A"}
                </p>
                {order.shippingAddress.address && (
                  <p>{order.shippingAddress.address}</p>
                )}
                {(order.shippingAddress.city ||
                  order.shippingAddress.state ||
                  order.shippingAddress.zipCode) && (
                    <p>
                      {[
                        order.shippingAddress.city,
                        order.shippingAddress.state,
                        order.shippingAddress.zipCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                {order.shippingAddress.country && (
                  <p>{order.shippingAddress.country}</p>
                )}
                {order.shippingAddress.phone && (
                  <p>Phone: {order.shippingAddress.phone}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Item
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length > 0 ? items.map((item, index) => {
                const itemName = item.name || item.productId?.name || `Item ${index + 1}`;
                const itemPrice = item.price || 0;
                const itemQuantity = item.quantity || 1;
                const itemTotal = itemPrice * itemQuantity;
                const itemId = item._id || item.id || item.productId?._id || index;

                return (
                  <tr key={itemId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {itemName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">
                      {itemQuantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {formatPrice(itemPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 text-right">
                      {formatPrice(itemTotal)}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full sm:w-80 space-y-2">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            {/* Tax moved here and always visible */}
            <div className="flex justify-between text-sm text-gray-700">
              <span>Tax:</span>
              <span className="font-semibold">{formatPrice(tax)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount:</span>
                <span className="font-semibold">-{formatPrice(discount)}</span>
              </div>
            )}
            {shipping > 0 && (
              <div className="flex justify-between text-sm text-gray-700">
                <span>Shipping:</span>
                <span className="font-semibold">{formatPrice(shipping)}</span>
              </div>
            )}
            {platformFee > 0 && (
              <div className="flex justify-between text-sm text-gray-700">
                <span>Platform Fee:</span>
                <span className="font-semibold">{formatPrice(platformFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-800 pt-3 border-t border-gray-200">
              <span>Total:</span>
              <span>{formatPrice(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment & Tracking Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-800 mb-1">Payment Method:</p>
            <p className="text-gray-600">
              {formatPaymentMethod(order.paymentMethod)}
            </p>
          </div>
          {(order.tracking?.trackingNumber || order.trackingNumber) && (
            <div>
              <p className="font-semibold text-gray-800 mb-1">
                Tracking Number:
              </p>
              <p className="text-gray-600 font-mono">{order.tracking?.trackingNumber || order.trackingNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.25in;
            size: A4;
          }
          
          body * {
            visibility: hidden;
          }
          
          .invoice-content,
          .invoice-content * {
            visibility: visible;
          }
          
          .invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 1rem !important; /* Reduced padding */
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          
          /* Force grid layout for address section in print */
          .address-grid {
             display: grid !important;
             grid-template-columns: 1fr 1fr !important;
             gap: 2rem !important;
          }

          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          
          button {
            display: none !important;
          }
          
          .invoice-content table {
            page-break-inside: avoid;
          }
          
          .invoice-content tr {
            page-break-inside: avoid;
          }
          
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        
        @media screen {
          .invoice-content {
            margin-top: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Invoice;
