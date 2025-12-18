import { useState, useEffect } from 'react';
import { FiSearch, FiCheck, FiX, FiMessageSquare } from 'react-icons/fi';
import { motion } from 'framer-motion';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';
import Badge from '../../../shared/components/Badge';
import AnimatedSelect from '../components/AnimatedSelect';
import { formatDateTime } from '../utils/adminHelpers';
import toast from 'react-hot-toast';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    // Mock reviews data
    const mockReviews = [
      {
        id: 1,
        productId: 1,
        productName: 'Classic White T-Shirt',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        rating: 5,
        comment: 'Great product! Very satisfied.',
        status: 'approved',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        productId: 2,
        productName: 'Slim Fit Blue Jeans',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        rating: 4,
        comment: 'Good quality, fits well.',
        status: 'pending',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    const savedReviews = localStorage.getItem('admin-reviews');
    setReviews(savedReviews ? JSON.parse(savedReviews) : mockReviews);
  }, []);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      !searchQuery ||
      review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' || review.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleApprove = (id) => {
    const updatedReviews = reviews.map((r) =>
      r.id === id ? { ...r, status: 'approved' } : r
    );
    setReviews(updatedReviews);
    localStorage.setItem('admin-reviews', JSON.stringify(updatedReviews));
    toast.success('Review approved');
  };

  const handleReject = (id) => {
    const updatedReviews = reviews.map((r) =>
      r.id === id ? { ...r, status: 'rejected' } : r
    );
    setReviews(updatedReviews);
    localStorage.setItem('admin-reviews', JSON.stringify(updatedReviews));
    toast.success('Review rejected');
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
    },
    {
      key: 'productName',
      label: 'Product',
      sortable: true,
    },
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-semibold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{row.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={i < value ? 'text-yellow-400' : 'text-gray-300'}>
              ★
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'comment',
      label: 'Comment',
      sortable: false,
      render: (value) => <p className="max-w-xs truncate">{value}</p>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === 'approved'
              ? 'success'
              : value === 'pending'
              ? 'warning'
              : 'error'
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => handleApprove(row.id)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Approve"
              >
                <FiCheck />
              </button>
              <button
                onClick={() => handleReject(row.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject"
              >
                <FiX />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Reviews</h1>
          <p className="text-gray-600">Manage product reviews and ratings</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <AnimatedSelect
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'approved', label: 'Approved' },
              { value: 'pending', label: 'Pending' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            className="min-w-[140px]"
          />
          <ExportButton
            data={filteredReviews}
            headers={[
              { label: 'ID', accessor: (row) => row.id },
              { label: 'Product', accessor: (row) => row.productName },
              { label: 'Customer', accessor: (row) => row.customerName },
              { label: 'Rating', accessor: (row) => row.rating },
              { label: 'Comment', accessor: (row) => row.comment },
              { label: 'Status', accessor: (row) => row.status },
            ]}
            filename="reviews"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <DataTable
          data={filteredReviews}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      </div>
    </motion.div>
  );
};

export default Reviews;

