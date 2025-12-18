import { useState, useEffect } from "react";
import {
  FiSearch,
  FiDollarSign,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import Badge from "../../../../shared/components/Badge";
import AnimatedSelect from "../../components/AnimatedSelect";
import { formatPrice } from "../../../../shared/utils/helpers";
import { formatCurrency, formatDateTime } from "../../utils/adminHelpers";
import { mockOrders } from "../../../../data/adminMockData";

const CashCollection = () => {
  const [collections, setCollections] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    // Generate cash collections from orders
    const generatedCollections = mockOrders
      .filter((order) => order.paymentMethod === "cash")
      .map((order) => ({
        id: `CC-${order.id}`,
        orderId: order.id,
        customerName: order.customer.name,
        amount: order.total,
        deliveryBoy: "John Doe",
        status: order.status === "delivered" ? "collected" : "pending",
        collectionDate: order.status === "delivered" ? order.date : null,
        orderDate: order.date,
      }));
    setCollections(generatedCollections);
  }, []);

  const filteredCollections = collections.filter((collection) => {
    const matchesSearch =
      !searchQuery ||
      collection.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.customerName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      collection.deliveryBoy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || collection.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalCollected = filteredCollections
    .filter((c) => c.status === "collected")
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPending = filteredCollections
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.amount, 0);

  const columns = [
    {
      key: "orderId",
      label: "Order ID",
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-gray-800">{value}</span>
      ),
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
        <div className="flex items-center gap-2">
          <FiDollarSign className="text-green-600" />
          <span className="font-bold text-gray-800">{formatPrice(value)}</span>
        </div>
      ),
    },
    {
      key: "deliveryBoy",
      label: "Delivery Boy",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={value === "collected" ? "success" : "warning"}>
          {value}
        </Badge>
      ),
    },
    {
      key: "orderDate",
      label: "Order Date",
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: "collectionDate",
      label: "Collection Date",
      sortable: true,
      render: (value) =>
        value ? (
          formatDateTime(value)
        ) : (
          <span className="text-gray-400">Pending</span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) =>
        row.status === "pending" ? (
          <button
            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
            onClick={() => {
              setCollections(
                collections.map((c) =>
                  c.id === row.id
                    ? {
                        ...c,
                        status: "collected",
                        collectionDate: new Date().toISOString(),
                      }
                    : c
                )
              );
            }}>
            Mark Collected
          </button>
        ) : (
          <span className="text-green-600">
            <FiCheckCircle />
          </span>
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
          Cash Collection
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Track cash on delivery collections
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalCollected)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Pending Collection</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(totalPending)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, customer, or delivery boy..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Status" },
              { value: "collected", label: "Collected" },
              { value: "pending", label: "Pending" },
            ]}
            className="min-w-[140px]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <DataTable
          data={filteredCollections}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      </div>
    </motion.div>
  );
};

export default CashCollection;
