import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiSearch,
  FiEye,
  FiClock,
  FiCheckCircle,
  FiPackage,
  FiTruck,
  FiXCircle,
  FiShoppingBag,
  FiTrendingUp,
} from 'react-icons/fi';
import { IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
import DataTable from "../../../Admin/components/DataTable";
import ExportButton from "../../../Admin/components/ExportButton";
import Badge from "../../../../shared/components/Badge";
import AnimatedSelect from "../../../Admin/components/AnimatedSelect";
import StatCard from "../../../../shared/components/StatCard";
import { formatPrice } from '../../../../shared/utils/helpers';
import { useVendorAuthStore } from '../../store/vendorAuthStore';
import { useVendorStore } from '../../store/vendorStore';
import { getVendorOrders, getVendorOrderStats } from '../../../../shared/services/orderService';
import { useCommissionStore } from '../../../../shared/store/commissionStore';
import toast from 'react-hot-toast';

const AllOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendor } = useVendorAuthStore();
  const { getVendorStats } = useVendorStore();
  const { getVendorEarningsSummary } = useCommissionStore();
  const [vendorOrders, setVendorOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalEarnings: 0,
    statusCount: 0,
    statusRevenue: 0,
    statusItems: 0,
  });

  // Update selected status based on URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/vendor/orders/hold-order')) setSelectedStatus('on_hold');
    else if (path.includes('/vendor/orders/pending-order')) setSelectedStatus('pending');
    else if (path.includes('/vendor/orders/ready-to-ship')) setSelectedStatus('ready_to_ship');
    else if (path.includes('/vendor/orders/dispatch-order')) setSelectedStatus('dispatched');
    else if (path.includes('/vendor/orders/shipped-seller')) setSelectedStatus('shipped_seller');
    else if (path.includes('/vendor/orders/canceled-order')) setSelectedStatus('cancelled');
    else setSelectedStatus('all');
  }, [location.pathname]);

  const vendorId = vendor?.id;

  // Fetch vendor orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      if (!vendorId) {
        setVendorOrders([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const filters = {
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          page: 1,
          limit: 1000, // Get all orders for vendor
        };
        const response = await getVendorOrders(filters);

        // Handle potentially wrapped or unwrapped response
        const data = response.data || response;
        const ordersData = data.orders || response.orders || [];

        if (ordersData) {
          setVendorOrders(Array.isArray(ordersData) ? ordersData : []);
        } else {
          setVendorOrders([]);
        }
      } catch (error) {
        console.error('Error fetching vendor orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [vendorId, selectedStatus]);

  // Get vendor-specific order data
  const getVendorOrderData = (order) => {
    if (order.vendorItems && Array.isArray(order.vendorItems) && order.vendorItems.length > 0) {
      const vendorItem = order.vendorItems[0]; // Vendor orders already filtered, use first vendorItem
      return {
        itemCount: vendorItem.items?.length || 0,
        subtotal: vendorItem.subtotal || 0,
        commission: vendorItem.commission || 0,
      };
    }
    // Fallback
    return {
      itemCount: order.items?.length || 0,
      subtotal: order.total || 0,
      commission: 0,
    };
  };

  // Calculate statistics based on current status
  useEffect(() => {
    const calculateStats = async () => {
      if (!vendorId) return;

      try {
        // Fetch order stats from API
        const statsData = await getVendorOrderStats();
        const orderStats = statsData || {};

        // Filter orders by current status
        const statusFilteredOrders = selectedStatus === 'all'
          ? vendorOrders
          : vendorOrders.filter((o) => o.status?.toLowerCase() === selectedStatus.toLowerCase());

        // Calculate status-specific stats
        const statusCount = statusFilteredOrders.length;
        const statusRevenue = statusFilteredOrders.reduce((sum, order) => {
          const vendorData = getVendorOrderData(order);
          return sum + (vendorData.subtotal || 0);
        }, 0);

        const statusItems = statusFilteredOrders.reduce((sum, order) => {
          const vendorData = getVendorOrderData(order);
          return sum + (vendorData.itemCount || 0);
        }, 0);

        // Get vendor statistics for "all orders" page
        const vendorStats = getVendorStats(vendorId);
        const earningsSummary = getVendorEarningsSummary(vendorId);

        setStats({
          totalProducts: vendorStats?.totalProducts || 0,
          totalOrders: orderStats.total || vendorOrders.length,
          pendingOrders: (orderStats.pending || 0) + (orderStats.processing || 0) + (orderStats.on_hold || 0),
          totalEarnings: earningsSummary?.totalEarnings || 0,
          // Status-specific stats
          statusCount,
          statusRevenue,
          statusItems,
        });
      } catch (error) {
        console.error('Error calculating stats:', error);
      }
    };

    calculateStats();
  }, [vendorId, vendorOrders, selectedStatus, getVendorStats, getVendorEarningsSummary]);

  const filteredOrders = useMemo(() => {
    let filtered = vendorOrders;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const orderCode = (order.orderCode || order.id || order._id || '').toString().toLowerCase();
        const trackingNumber = (order.tracking?.trackingNumber || order.trackingNumber || '').toLowerCase();
        return orderCode.includes(searchLower) || trackingNumber.includes(searchLower);
      });
    }

    // Status filtering is already done in API call, but keep this for client-side search
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((order) =>
        order.status?.toLowerCase() === selectedStatus.toLowerCase()
      );
    }

    return filtered;
  }, [vendorOrders, searchQuery, selectedStatus]);

  const columns = [
    {
      key: 'orderCode',
      label: 'Order ID',
      sortable: true,
      render: (value, row) => (
        <span className="font-semibold text-gray-800">{value || row.id || row._id || row.orderCode}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (value, row) => (
        <span className="text-sm text-gray-600">
          {new Date(value || row.orderDate || row.createdAt || row.date).toLocaleDateString()}
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
      render: (_, row) => {
        const orderId = row._id || row.id || row.orderCode;
        return (
          <button
            onClick={() => navigate(`/vendor/orders/${orderId}`)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <FiEye />
          </button>
        );
      },
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view orders</p>
      </div>
    );
  }

  // Get status-specific cards based on current page
  const getStatCards = () => {
    const statusLabels = {
      'all': 'All Orders',
      'on_hold': 'Hold Orders',
      'pending': 'Pending Orders',
      'ready_to_ship': 'Ready to Ship',
      'dispatched': 'Dispatched Orders',
      'shipped_seller': 'Shipped Orders',
      'cancelled': 'Canceled Orders',
    };

    const currentLabel = statusLabels[selectedStatus] || 'Orders';

    if (selectedStatus === 'all') {
      // All Orders page - show general stats
      return [
        {
          icon: FiPackage,
          label: "Total Products",
          value: stats.totalProducts,
          color: "bg-blue-500",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          link: "/vendor/products",
        },
        {
          icon: FiShoppingBag,
          label: "Total Orders",
          value: stats.totalOrders,
          color: "bg-green-500",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          link: "/vendor/orders",
        },
        {
          icon: FiTrendingUp,
          label: "Pending Orders",
          value: stats.pendingOrders,
          color: "bg-orange-500",
          bgColor: "bg-orange-50",
          textColor: "text-orange-700",
          link: "/vendor/orders/pending-order",
        },
        {
          icon: IndianRupee,
          label: "Total Earnings",
          value: formatPrice(stats.totalEarnings || 0),
          color: "bg-purple-500",
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
          link: "/vendor/earnings",
        },
      ];
    } else {
      // Status-specific pages - show relevant stats for that status
      return [
        {
          icon: FiShoppingBag,
          label: currentLabel,
          value: stats.statusCount,
          color: "bg-blue-500",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
        },
        {
          icon: FiPackage,
          label: "Total Items",
          value: stats.statusItems,
          color: "bg-green-500",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
        },
        {
          icon: IndianRupee,
          label: "Total Revenue",
          value: formatPrice(stats.statusRevenue || 0),
          color: "bg-purple-500",
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
        },
        {
          icon: FiTrendingUp,
          label: "Average Order Value",
          value: stats.statusCount > 0
            ? formatPrice(stats.statusRevenue / stats.statusCount)
            : formatPrice(0),
          color: "bg-orange-500",
          bgColor: "bg-orange-50",
          textColor: "text-orange-700",
        },
      ];
    }
  };

  const statCards = getStatCards();

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
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
                { value: 'on_hold', label: 'Hold' },
                { value: 'ready_to_ship', label: 'Ready to Ship' },
                { value: 'dispatched', label: 'Dispatched' },
                { value: 'shipped_seller', label: 'Shipped (Seller)' },
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
                  { label: 'Order ID', accessor: (row) => row.orderCode || row.id || row._id },
                  { label: 'Date', accessor: (row) => new Date(row.orderDate || row.createdAt || row.date).toLocaleDateString() },
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
            onRowClick={(row) => {
              const orderId = row._id || row.id || row.orderCode;
              navigate(`/vendor/orders/${orderId}`);
            }}
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

