import { useState, useMemo } from "react";
import { FiRefreshCw, FiDollarSign } from "react-icons/fi";
import { motion } from "framer-motion";
import RefundTrendsChart from "../../components/Analytics/RefundTrendsChart";
import DataTable from "../../components/DataTable";
import Badge from "../../../../shared/components/Badge";
import ExportButton from "../../components/ExportButton";
import AnimatedSelect from "../../components/AnimatedSelect";
import { formatPrice } from '../../../../shared/utils/helpers';

const RefundReports = () => {
  const [refunds] = useState(() => {
    const now = Date.now();
    const refundsList = [];
    const reasons = [
      "Product defect",
      "Wrong item received",
      "Customer request",
      "Not as described",
      "Size issue",
    ];
    const statuses = [
      "completed",
      "pending",
      "completed",
      "pending",
      "completed",
    ];
    const customers = [
      "John Doe",
      "Jane Smith",
      "Bob Johnson",
      "Alice Brown",
      "Charlie Wilson",
      "Diana Prince",
      "Emma Davis",
      "Frank Miller",
    ];

    // Generate refunds for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(now - i * 86400000);
      const count = Math.floor(Math.random() * 3) + 1; // 1-3 refunds per day

      for (let j = 0; j < count; j++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        refundsList.push({
          id: `REF-${String(refundsList.length + 1).padStart(3, "0")}`,
          orderId: `ORD-${String(Math.floor(Math.random() * 100) + 1).padStart(
            3,
            "0"
          )}`,
          customerName: customers[Math.floor(Math.random() * customers.length)],
          amount: Math.floor(Math.random() * 500) + 50,
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          status,
          requestedDate: new Date(
            date.getTime() - Math.random() * 86400000
          ).toISOString(),
          processedDate:
            status === "completed"
              ? new Date(
                date.getTime() + Math.random() * 86400000
              ).toISOString()
              : null,
        });
      }
    }

    return refundsList;
  });
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRefunds = refunds.filter(
    (refund) => statusFilter === "all" || refund.status === statusFilter
  );

  const totalRefunds = filteredRefunds.reduce(
    (sum, refund) => sum + refund.amount,
    0
  );
  const completedRefunds = filteredRefunds.filter(
    (r) => r.status === "completed"
  ).length;
  const pendingRefunds = filteredRefunds.filter(
    (r) => r.status === "pending"
  ).length;

  const columns = [
    {
      key: "id",
      label: "Refund ID",
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-gray-800">{value}</span>
      ),
    },
    {
      key: "orderId",
      label: "Order ID",
      sortable: true,
    },
    {
      key: "customerName",
      label: "Customer",
      sortable: true,
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value) => (
        <span className="font-bold text-red-600">{formatPrice(value)}</span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      sortable: false,
      render: (value) => (
        <p className="text-sm text-gray-600 max-w-xs truncate">{value}</p>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={value === "completed" ? "success" : "warning"}>
          {value}
        </Badge>
      ),
    },
    {
      key: "requestedDate",
      label: "Requested",
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: "processedDate",
      label: "Processed",
      sortable: true,
      render: (value) =>
        value ? (
          new Date(value).toLocaleString()
        ) : (
          <span className="text-gray-400">Pending</span>
        ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Refund Reports
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Track refund requests and processing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Refunds</p>
            <FiDollarSign className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatPrice(totalRefunds)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Completed</p>
            <FiRefreshCw className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {completedRefunds}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending</p>
            <FiRefreshCw className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{pendingRefunds}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Status" },
              { value: "completed", label: "Completed" },
              { value: "pending", label: "Pending" },
              { value: "rejected", label: "Rejected" },
            ]}
            className="min-w-[140px]"
          />
          <ExportButton
            data={filteredRefunds}
            headers={[
              { label: "Refund ID", accessor: (row) => row.id },
              { label: "Order ID", accessor: (row) => row.orderId },
              { label: "Customer", accessor: (row) => row.customerName },
              {
                label: "Amount",
                accessor: (row) => formatPrice(row.amount),
              },
              { label: "Reason", accessor: (row) => row.reason },
              { label: "Status", accessor: (row) => row.status },
            ]}
            filename="refund-report"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <RefundTrendsChart refundData={filteredRefunds} period="month" />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <DataTable
          data={filteredRefunds}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      </div>
    </motion.div>
  );
};

export default RefundReports;
