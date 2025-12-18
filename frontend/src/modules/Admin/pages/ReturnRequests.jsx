import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiEye, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { motion } from 'framer-motion';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';
import Badge from '../../../shared/components/Badge';
import AnimatedSelect from '../components/AnimatedSelect';
import { formatCurrency, formatDateTime } from '../utils/adminHelpers';
import { mockReturnRequests } from '../../../data/adminMockData';
import toast from 'react-hot-toast';

const ReturnRequests = () => {
  const navigate = useNavigate();
  const [returnRequests, setReturnRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Load return requests from localStorage or use mock data
  useEffect(() => {
    const savedRequests = localStorage.getItem('admin-return-requests');
    if (savedRequests) {
      setReturnRequests(JSON.parse(savedRequests));
    } else {
      setReturnRequests(mockReturnRequests);
      localStorage.setItem('admin-return-requests', JSON.stringify(mockReturnRequests));
    }
  }, []);

  // Save return requests to localStorage
  const saveReturnRequests = (newRequests) => {
    setReturnRequests(newRequests);
    localStorage.setItem('admin-return-requests', JSON.stringify(newRequests));
  };

  // Filtered return requests
  const filteredRequests = useMemo(() => {
    let filtered = returnRequests;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (request) =>
          request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((request) => request.status === selectedStatus);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((request) => new Date(request.requestDate) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter((request) => new Date(request.requestDate) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter((request) => new Date(request.requestDate) >= filterDate);
          break;
        default:
          break;
      }
    }

    return filtered;
  }, [returnRequests, searchQuery, selectedStatus, dateFilter]);

  // Handle status update
  const handleStatusUpdate = (requestId, newStatus, action = '') => {
    const updatedRequests = returnRequests.map((request) => {
      if (request.id === requestId) {
        const updated = {
          ...request,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
        
        if (newStatus === 'approved' && action === 'approve') {
          updated.refundStatus = 'pending';
        } else if (newStatus === 'completed' && action === 'process-refund') {
          updated.refundStatus = 'processed';
        }
        
        return updated;
      }
      return request;
    });
    
    saveReturnRequests(updatedRequests);
    
    const statusMessages = {
      approve: 'Return request approved',
      reject: 'Return request rejected',
      'process-refund': 'Refund processed successfully',
    };
    
    toast.success(statusMessages[action] || 'Status updated successfully');
  };

  // Get status badge variant
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

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'Return ID',
      sortable: true,
      render: (value) => <span className="font-semibold">{value}</span>,
    },
    {
      key: 'orderId',
      label: 'Order ID',
      sortable: true,
      render: (value) => (
        <span className="text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => navigate(`/admin/orders/${value}`)}>
          {value}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (value) => (
        <div>
          <p className="font-medium text-gray-800">{value.name}</p>
          <p className="text-xs text-gray-500">{value.email}</p>
        </div>
      ),
    },
    {
      key: 'requestDate',
      label: 'Request Date',
      sortable: true,
      render: (value) => formatDateTime(value),
    },
    {
      key: 'items',
      label: 'Items',
      sortable: false,
      render: (value) => {
        const count = Array.isArray(value) ? value.length : 0;
        return <span>{count} item{count !== 1 ? 's' : ''}</span>;
      },
    },
    {
      key: 'reason',
      label: 'Reason',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-700">{value}</span>
      ),
    },
    {
      key: 'refundAmount',
      label: 'Refund Amount',
      sortable: true,
      render: (value) => (
        <span className="font-bold text-gray-800">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => <Badge variant={getStatusVariant(value)}>{value}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/return-requests/${row.id}`)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <FiEye />
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to approve this return request?')) {
                    handleStatusUpdate(row.id, 'approved', 'approve');
                  }
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Approve"
              >
                <FiCheck />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to reject this return request?')) {
                    handleStatusUpdate(row.id, 'rejected', 'reject');
                  }
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject"
              >
                <FiX />
              </button>
            </>
          )}
          {row.status === 'approved' && row.refundStatus === 'pending' && (
            <button
              onClick={() => {
                if (window.confirm('Process refund for this return request?')) {
                  handleStatusUpdate(row.id, 'completed', 'process-refund');
                }
              }}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Process Refund"
            >
              <FiRefreshCw />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Get status counts for stats
  const statusCounts = useMemo(() => {
    return {
      all: returnRequests.length,
      pending: returnRequests.filter((r) => r.status === 'pending').length,
      approved: returnRequests.filter((r) => r.status === 'approved').length,
      processing: returnRequests.filter((r) => r.status === 'processing').length,
      completed: returnRequests.filter((r) => r.status === 'completed').length,
      rejected: returnRequests.filter((r) => r.status === 'rejected').length,
    };
  }, [returnRequests]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Return Requests</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage and process customer return requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Total</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-800">{statusCounts.all}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Approved</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{statusCounts.approved}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Processing</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{statusCounts.processing}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{statusCounts.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Rejected</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, order ID, name, or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>

          {/* Status Filter */}
          <AnimatedSelect
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'processing', label: 'Processing' },
              { value: 'completed', label: 'Completed' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />

          {/* Date Filter */}
          <AnimatedSelect
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'Last 30 Days' },
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />

          {/* Export Button */}
          <div className="w-full sm:w-auto">
            <ExportButton
              data={filteredRequests}
              headers={[
                { label: 'Return ID', accessor: (row) => row.id },
                { label: 'Order ID', accessor: (row) => row.orderId },
                { label: 'Customer', accessor: (row) => row.customer.name },
                { label: 'Email', accessor: (row) => row.customer.email },
                { label: 'Request Date', accessor: (row) => formatDateTime(row.requestDate) },
                { label: 'Items', accessor: (row) => row.items.length },
                { label: 'Reason', accessor: (row) => row.reason },
                { label: 'Refund Amount', accessor: (row) => formatCurrency(row.refundAmount) },
                { label: 'Status', accessor: (row) => row.status },
              ]}
              filename="return-requests"
            />
          </div>
        </div>
      </div>

      {/* Return Requests Table */}
      <DataTable
        data={filteredRequests}
        columns={columns}
        pagination={true}
        itemsPerPage={10}
        onRowClick={(row) => navigate(`/admin/return-requests/${row.id}`)}
      />
    </motion.div>
  );
};

export default ReturnRequests;

