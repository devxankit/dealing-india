import { useState, useMemo } from 'react';
import { FiDownload, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import { motion } from 'framer-motion';
import DataTable from '../../components/DataTable';
import ExportButton from '../../components/ExportButton';
import { formatPrice } from '../../../../shared/utils/helpers';
import { formatDateTime } from '../../utils/adminHelpers';
import { useSalesReport } from '../../../../shared/hooks/useAdminAnalytics';

const SalesReport = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const { data: reportResponse, isLoading } = useSalesReport(dateRange);

  const orders = useMemo(() => reportResponse?.data?.orders || reportResponse?.orders || [], [reportResponse]);
  const summary = useMemo(() => reportResponse?.data?.summary || reportResponse?.summary || {
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
  }, [reportResponse]);

  const { totalSales, totalOrders, averageOrderValue } = summary;

  const columns = [
    {
      key: 'id',
      label: 'Order ID',
      sortable: true,
      render: (value) => <span className="font-semibold text-gray-800">{value}</span>,
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-medium text-gray-800">{value?.name || row.customer?.name || ''}</p>
          <p className="text-xs text-gray-500">{value?.email || row.customer?.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: 'total',
      label: 'Amount',
      sortable: true,
      render: (value) => (
        <span className="font-bold text-gray-800">{formatPrice(value)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${value === 'delivered' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
          {value}
        </span>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Sales Report</h1>
        <p className="text-sm sm:text-base text-gray-600">View detailed sales analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Sales</p>
            <FiTrendingUp className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatPrice(totalSales)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Orders</p>
            <FiCalendar className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Average Order Value</p>
            <FiTrendingUp className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatPrice(averageOrderValue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-end">
            <ExportButton
              data={orders}
              headers={[
                { label: 'Order ID', accessor: (row) => row.id },
                { label: 'Customer', accessor: (row) => row.customer?.name || '' },
                { label: 'Date', accessor: (row) => formatDateTime(row.date) },
                { label: 'Amount', accessor: (row) => formatPrice(row.total) },
                { label: 'Status', accessor: (row) => row.status },
              ]}
              filename="sales-report"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading sales report...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found for the selected date range</p>
          </div>
        ) : (
          <DataTable
            data={orders}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        )}
      </div>
    </motion.div>
  );
};

export default SalesReport;

