import { useMemo } from "react";
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
import { useVendorStore } from "../store/vendorStore";
import { useOrderStore } from "../../../shared/store/orderStore";

const InventoryReports = () => {
  const { vendor } = useVendorAuthStore();
  const { getVendorProducts } = useVendorStore();
  const { getVendorOrders } = useOrderStore();

  const vendorId = vendor?.id;
  const products = vendorId ? getVendorProducts(vendorId) : [];
  const orders = vendorId ? getVendorOrders(vendorId) : [];

  const inventoryData = useMemo(() => {
    const productMap = {};

    products.forEach((product) => {
      productMap[product.id] = {
        id: product.id,
        name: product.name,
        currentStock: product.stockQuantity || 0,
        price: product.price || 0,
        stockValue: (product.stockQuantity || 0) * (product.price || 0),
        sold: 0,
      };
    });

    orders.forEach((order) => {
      order.vendorItems?.forEach((vi) => {
        if (vi.vendorId === vendorId) {
          vi.items?.forEach((item) => {
            if (productMap[item.id]) {
              productMap[item.id].sold += item.quantity || 1;
            }
          });
        }
      });
    });

    return Object.values(productMap);
  }, [products, orders, vendorId]);

  const lowStockItems = inventoryData.filter((p) => p.currentStock < 10);
  const totalStockValue = inventoryData.reduce(
    (sum, p) => sum + p.stockValue,
    0
  );
  const totalSold = inventoryData.reduce((sum, p) => sum + p.sold, 0);

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
            {inventoryData.length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Total Stock Value</p>
          <p className="text-2xl font-bold text-gray-800">
            {formatPrice(totalStockValue)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Units Sold</p>
          <p className="text-2xl font-bold text-gray-800">{totalSold}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
            <FiAlertCircle className="text-red-600" />
            Low Stock Items
          </p>
          <p className="text-2xl font-bold text-red-600">
            {lowStockItems.length}
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
      <DataTable
        data={inventoryData}
        columns={columns}
        pagination={true}
        itemsPerPage={10}
      />
    </motion.div>
  );
};

export default InventoryReports;
