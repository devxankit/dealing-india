import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheck,
  FiX,
  FiPhone,
  FiMail,
  FiPackage,
  FiCalendar,
  FiRefreshCw,
  FiShoppingBag,
  FiAlertCircle,
  FiEdit
} from 'react-icons/fi';
import { getPlaceholderImage } from '../../../shared/utils/helpers';
import { motion } from 'framer-motion';
import Badge from '../../../shared/components/Badge';
import AnimatedSelect from '../components/AnimatedSelect';
import { formatCurrency, formatDateTime } from '../utils/adminHelpers';
import { IndianRupee } from 'lucide-react';
import { getAdminReturns, updateReturnStatusAdmin, processRefundAdmin } from '../../../shared/services/returnService';
import toast from 'react-hot-toast';

const ReturnRequestDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [returnRequest, setReturnRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchReturnRequest();
  }, [id]);

  const fetchReturnRequest = async () => {
    try {
      setLoading(true);
      // Reusing getAdminReturns and filtering for now
      const response = await getAdminReturns();

      let data = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (response && Array.isArray(response.returns)) {
        data = response.returns;
      } else if (response && response.success && Array.isArray(response.data)) {
        data = response.data;
      }

      const found = data.find(r => r._id === id);
      if (found) {
        setReturnRequest(found);
        setStatus(found.status);
      } else {
        toast.error('Return request not found');
        navigate('/admin/return-requests');
      }
    } catch (error) {
      console.error('Error fetching return request:', error);
      toast.error('Failed to fetch return request details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus, action = '') => {
    try {
      let response;
      if (action === 'process-refund') {
        response = await processRefundAdmin(id);
      } else {
        response = await updateReturnStatusAdmin(id, { status: newStatus });
      }

      // Robust response handling
      const updatedData = response.data || response;

      // Handle cases where updatedData might be nested or direct
      // If update returns the full object, use it.
      if (updatedData && (updatedData._id || updatedData.id)) {
        setReturnRequest(updatedData);
        setStatus(updatedData.status);
      } else {
        // If response is just success message, re-fetch or optimistically update
        setReturnRequest(prev => ({ ...prev, status: newStatus }));
        setStatus(newStatus);
      }

      setIsEditing(false);

      const statusMessages = {
        approve: 'Return request approved',
        reject: 'Return request rejected',
        'process-item': 'Item marked as received (Processing)',
        'process-refund': 'Refund processed successfully',
      };

      toast.success(statusMessages[action] || 'Status updated successfully');

    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleStatusSave = () => {
    if (status !== returnRequest.status) {
      handleStatusUpdate(status);
    } else {
      setIsEditing(false);
    }
  };

  const getStatusVariant = (status) => {
    const statusMap = {
      pending: 'pending',
      approved: 'approved',
      rejected: 'rejected',
      processing: 'processing',
      completed: 'completed',
    };
    return statusMap[status] || 'pending';
  };

  if (!returnRequest) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="text-lg text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{returnRequest.returnCode || returnRequest._id}</h1>
            <p className="text-xs text-gray-500">Requested on {formatDateTime(returnRequest.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <AnimatedSelect
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
                className="min-w-[140px]"
              />
              <button
                onClick={handleStatusSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
              >
                <FiCheck className="text-sm" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setStatus(returnRequest.status);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold"
              >
                <FiX className="text-sm" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <Badge variant={getStatusVariant(returnRequest.status)}>{returnRequest.status}</Badge>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold"
              >
                <FiEdit className="text-sm" />
                Edit Status
              </button>
              {returnRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to approve this return request?')) {
                        handleStatusUpdate('approved', 'approve');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                  >
                    <FiCheck className="text-sm" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to reject this return request?')) {
                        handleStatusUpdate('rejected', 'reject');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                  >
                    <FiX className="text-sm" />
                    Reject
                  </button>
                </>
              )}
              {returnRequest.status === "approved" && (
                <button
                  onClick={() => {
                    if (window.confirm("Confirm receipt of return items? This will mark status as Processing.")) {
                      handleStatusUpdate("processing", "process-item");
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold">
                  <FiPackage className="text-sm" />
                  Item Received
                </button>
              )}
              {returnRequest.status === 'processing' && returnRequest.refundStatus === 'pending' && (
                <button
                  onClick={() => {
                    if (window.confirm('Process refund for this return request?')) {
                      handleStatusUpdate('completed', 'process-refund');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                >
                  <FiRefreshCw className="text-sm" />
                  Process Refund
                </button>
              )}
              {/* Admin Override: Allow refund on 'approved' directly if needed (legacy behavior or admin power) */}
              {returnRequest.status === 'approved' && returnRequest.refundStatus === 'pending' && (
                <button
                  onClick={() => {
                    if (window.confirm('Directly process refund (Skipping Processing Step)?')) {
                      handleStatusUpdate('completed', 'process-refund');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold ml-2"
                  title="Direct Refund"
                >
                  <FiRefreshCw className="text-sm" />
                  Refund Now
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Return Overview */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiPackage className="text-primary-600 text-base" />
              Return Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Refund Amount</p>
                <p className="font-bold text-gray-800 text-lg">{formatCurrency(returnRequest.refundAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Items</p>
                <p className="font-semibold text-gray-800">{returnRequest.items.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Refund Status</p>
                <Badge variant={returnRequest.refundStatus === 'processed' ? 'success' : returnRequest.refundStatus === 'failed' ? 'error' : 'pending'} className="text-xs">
                  {returnRequest.refundStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Original Order Link */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiShoppingBag className="text-primary-600 text-base" />
              Original Order
            </h2>
            <Link
              to={`/admin/orders/${returnRequest.orderId?._id || returnRequest.orderId}`}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm"
            >
              <span>View Order: {returnRequest.orderId?.orderId || returnRequest.orderId}</span>
              <FiArrowLeft className="rotate-180 text-xs" />
            </Link>
          </div>

          {/* Return Items */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiPackage className="text-primary-600 text-base" />
              Items Being Returned ({returnRequest.items.length})
            </h2>
            <div className="space-y-2">
              {returnRequest.items.map((item, index) => (
                <div key={item._id || index} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  {item.productId?.images?.[0] && (
                    <img
                      src={item.productId.images[0]}
                      alt={item.productId.name || 'Product'}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.src = getPlaceholderImage(100, 100, 'Product');
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{item.productId?.name || 'Unknown Product'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-600">
                        {formatCurrency(item.price || 0)} × {item.quantity || 1}
                      </p>
                      {item.reason && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          {item.reason}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-sm text-gray-800">
                    {formatCurrency((item.price || 0) * (item.quantity || 1))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Return Reason */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiAlertCircle className="text-primary-600 text-base" />
              Return Reason
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">Reason</p>
                <p className="font-semibold text-sm text-gray-800">{returnRequest.reason}</p>
              </div>
              {returnRequest.description && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{returnRequest.description}</p>
                </div>
              )}
              {returnRequest.rejectionReason && (
                <div>
                  <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{returnRequest.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiMail className="text-primary-600 text-base" />
              Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Name</p>
                <p className="font-semibold text-sm text-gray-800">{returnRequest.customer?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <a
                  href={`mailto:${returnRequest.customer?.email}`}
                  className="font-semibold text-xs text-blue-600 hover:text-blue-800 break-all"
                >
                  {returnRequest.customer?.email}
                </a>
              </div>
              {returnRequest.customer?.phone && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <FiPhone className="text-xs" />
                    Phone
                  </p>
                  <a
                    href={`tel:${returnRequest.customer?.phone}`}
                    className="font-semibold text-sm text-gray-800 hover:text-blue-600"
                  >
                    {returnRequest.customer?.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Refund Summary */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <IndianRupee className="text-primary-600 text-base" />
              Refund Summary
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Total</span>
                <span className="font-semibold">
                  {formatCurrency(
                    returnRequest.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
                  )}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="font-bold text-gray-800">Refund Amount</span>
                <span className="font-bold text-lg text-gray-800">{formatCurrency(returnRequest.refundAmount)}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Refund Status</p>
                <Badge variant={returnRequest.refundStatus === 'processed' ? 'success' : returnRequest.refundStatus === 'failed' ? 'error' : 'pending'} className="text-xs">
                  {returnRequest.refundStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiCalendar className="text-primary-600 text-base" />
              Status Timeline
            </h2>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">Request Submitted</p>
                  <p className="text-xs text-gray-500">{formatDateTime(returnRequest.createdAt)}</p>
                </div>
              </div>
              {returnRequest.statusHistory?.map((history, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${history.status === 'approved' ? 'bg-blue-500' :
                    history.status === 'processing' ? 'bg-yellow-500' :
                      history.status === 'completed' ? 'bg-green-500' :
                        history.status === 'rejected' ? 'bg-red-500' : 'bg-gray-400'
                    }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 capitalize">{history.status}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(history.timestamp)}</p>
                    {history.comment && <p className="text-xs text-gray-500 italic">Note: {history.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Quick Actions</h2>
            <div className="space-y-1.5">
              <Link
                to={`/admin/orders/${returnRequest.orderId?._id || returnRequest.orderId}`}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold"
              >
                <FiShoppingBag className="text-sm" />
                View Original Order
              </Link>
              <button
                onClick={() => window.location.href = `mailto:${returnRequest.customer?.email}`}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-xs font-semibold"
              >
                <FiMail className="text-sm" />
                Email Customer
              </button>
              {returnRequest.customer?.phone && (
                <button
                  onClick={() => window.location.href = `tel:${returnRequest.customer?.phone}`}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-xs font-semibold"
                >
                  <FiPhone className="text-sm" />
                  Call Customer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReturnRequestDetail;
