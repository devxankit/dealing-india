import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiEye,
  FiClock,
  FiCheckCircle,
  FiPackage,
  FiTruck,
  FiXCircle,
  FiShoppingBag,
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import DataTable from "../../../Admin/components/DataTable";
import ExportButton from "../../../Admin/components/ExportButton";
import Badge from "../../../../shared/components/Badge";
import AnimatedSelect from "../../../Admin/components/AnimatedSelect";
import { formatPrice } from '../../../../shared/utils/helpers';
import { useVendorAuthStore } from '../../store/vendorAuthStore';
import { useOrderStore } from '../../../../shared/store/orderStore';
import toast from 'react-hot-toast';

const AllOrders = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const { orders } = useOrderStore();
  const [vendorOrders, setVendorOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const vendorId = vendor?.id;

  // Filter orders to only show those containing vendor's products
  useEffect(() => {
    if (!vendorId || !orders) {
      setVendorOrders([]);
      return;
    }

    const filtered = orders.filter((order) => {
      // Check if order has vendorItems array
      if (order.vendorItems && Array.isArray(order.vendorItems)) {
        return order.vendorItems.some((vi) => vi.vendorId === vendorId);
      }
      // Fallback: check if items have vendorId
      if (order.items && Array.isArray(order.items)) {
        return order.items.some((item) => item.vendorId === vendorId);
      }
      return false;
    });

    setVendorOrders(filtered);
  }, [vendorId, orders]);

  const filteredOrders = useMemo(() => {
    let filtered = vendorOrders;

    if (searchQuery) {
      filtered = filtered.filter((order) =>
        order.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((order) =>
        order.status?.toLowerCase() === selectedStatus.toLowerCase()
      );
    }

    return filtered;
  }, [vendorOrders, searchQuery, selectedStatus]);

  // Get vendor-specific order data
  const getVendorOrderData = (order) => {
    if (order.vendorItems && Array.isArray(order.vendorItems)) {
      const vendorItem = order.vendorItems.find((vi) => vi.vendorId === vendorId);
      if (vendorItem) {
        return {
          itemCount: vendorItem.items?.length || 0,
          subtotal: vendorItem.subtotal || 0,
          commission: vendorItem.commission || 0,
        };
      }
    }
    // Fallback
    const vendorItems = order.items?.filter((item) => item.vendorId === vendorId) || [];
    return {
      itemCount: vendorItems.length,
      subtotal: vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      commission: 0,
    };
  };

  const columns = [
    {
      key: 'id',
      label: 'Order ID',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-gray-800">{value}</span>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      sortable: false,
      render: (_, row) => {
        const vendorData = getVendorOrderData(row);
        return (
          <span className="text-sm text-gray-700">
            {vendorData.itemCount} item(s)
          </span>
        );
      },
    },
    {
      key: 'subtotal',
      label: 'Amount',
      sortable: true,
      render: (_, row) => {
        const vendorData = getVendorOrderData(row);
        return (
          <span className="font-semibold text-gray-800">
            {formatPrice(vendorData.subtotal)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === 'delivered'
              ? 'success'
              : value === 'pending'
                ? 'warning'
                : value === 'cancelled' || value === 'canceled'
                  ? 'error'
                  : 'info'
          }>
          {value?.toUpperCase() || 'N/A'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => navigate(`/vendor/orders/${row.id}`)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <FiEye />
        </button>
      ),
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view orders</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            All Orders
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            View and manage all your orders
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {/* Filters Section */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1 w-full sm:min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID or Tracking..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
              />
            </div>

            <AnimatedSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'processing', label: 'Processing' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              className="w-full sm:w-auto min-w-[140px]"
            />

            <div className="w-full sm:w-auto">
              <ExportButton
                data={filteredOrders}
                headers={[
                  { label: 'Order ID', accessor: (row) => row.id },
                  { label: 'Date', accessor: (row) => new Date(row.date).toLocaleDateString() },
                  { label: 'Items', accessor: (row) => getVendorOrderData(row).itemCount },
                  { label: 'Amount', accessor: (row) => formatPrice(getVendorOrderData(row).subtotal) },
                  { label: 'Status', accessor: (row) => row.status },
                ]}
                filename="vendor-orders"
              />
            </div>
          </div>
        </div>

        {/* DataTable */}
        {filteredOrders.length > 0 ? (
          <DataTable
            data={filteredOrders}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
            onRowClick={(row) => navigate(`/vendor/orders/${row.id}`)}
          />
        ) : (
          <div className="text-center py-12">
            <FiShoppingBag className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No orders found</p>
            <p className="text-sm text-gray-400">
              {searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Orders containing your products will appear here'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AllOrders;

