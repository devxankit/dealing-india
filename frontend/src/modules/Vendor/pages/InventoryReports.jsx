import { useState, useEffect } from "react";
import {
  FiBarChart,
  FiPackage,
  FiTrendingDown,
  FiAlertCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import ExportButton from "../../Admin/components/ExportButton";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { getVendorInventoryReport } from "../services/inventoryService";
import toast from "react-hot-toast";

const InventoryReports = () => {
  const { vendor } = useVendorAuthStore();
  const [inventoryData, setInventoryData] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStockValue: 0,
    totalSold: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);

  const vendorId = vendor?.id;

  // Fetch inventory report from API
  useEffect(() => {
    const fetchInventoryReport = async () => {
      if (!vendorId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getVendorInventoryReport();

        if (response.success && response.data) {
          setInventoryData(response.data.inventory || []);
          setStats(response.data.stats || {
            totalProducts: 0,
            totalStockValue: 0,
            totalSold: 0,
            lowStockItems: 0,
          });
        }
      } catch (error) {
        console.error("Error fetching inventory report:", error);
        toast.error("Failed to load inventory report");
        setInventoryData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryReport();
  }, [vendorId]);

  const columns = [
    { key: "name", label: "Product", sortable: true },
    {
      key: "currentStock",
      label: "Current Stock",
      sortable: true,
      render: (value) => (
        <span
          className={
            value < 10 ? "text-red-600 font-semibold" : "text-gray-800"
          }>
          {value}
        </span>
      ),
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (value) => formatPrice(value),
    },
    {
      key: "stockValue",
      label: "Stock Value",
      sortable: true,
      render: (value) => formatPrice(value),
    },
    { key: "sold", label: "Units Sold", sortable: true },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view reports</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <FiBarChart className="text-primary-600" />
          Inventory Reports
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          View inventory analysis and stock reports
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Total Products</p>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "..." : stats.totalProducts}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Total Stock Value</p>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "..." : formatPrice(stats.totalStockValue)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Units Sold</p>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "..." : stats.totalSold}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
            <FiAlertCircle className="text-red-600" />
            Low Stock Items
          </p>
          <p className="text-2xl font-bold text-red-600">
            {loading ? "..." : stats.lowStockItems}
          </p>
        </div>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex justify-end">
          <ExportButton
            data={inventoryData}
            headers={[
              { label: "Product", accessor: (row) => row.name },
              { label: "Current Stock", accessor: (row) => row.currentStock },
              { label: "Price", accessor: (row) => formatPrice(row.price) },
              {
                label: "Stock Value",
                accessor: (row) => formatPrice(row.stockValue),
              },
              { label: "Units Sold", accessor: (row) => row.sold },
            ]}
            filename="vendor-inventory-report"
          />
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">Loading inventory report...</p>
        </div>
      ) : inventoryData.length > 0 ? (
        <DataTable
          data={inventoryData}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No inventory data found</p>
        </div>
      )}
    </motion.div>
  );
};

export default InventoryReports;
