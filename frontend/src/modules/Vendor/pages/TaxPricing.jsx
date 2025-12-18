import { useState, useEffect } from "react";
import { FiDollarSign, FiTrendingUp, FiPackage } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import ExportButton from "../../Admin/components/ExportButton";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { useVendorStore } from "../store/vendorStore";
import toast from "react-hot-toast";

const TaxPricing = () => {
  const { vendor } = useVendorAuthStore();
  const { getVendorProducts } = useVendorStore();
  const [products, setProducts] = useState([]);
  const [bulkAction, setBulkAction] = useState({
    type: "percentage",
    value: 0,
  });
  const [selectedProducts, setSelectedProducts] = useState([]);

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;
    const vendorProducts = getVendorProducts(vendorId);
    setProducts(vendorProducts);
  }, [vendorId, getVendorProducts]);

  const handleBulkUpdate = () => {
    if (!bulkAction.value || bulkAction.value <= 0) {
      toast.error("Please enter a valid value");
      return;
    }

    const updated = products.map((p) => {
      if (selectedProducts.includes(p.id)) {
        const newPrice =
          bulkAction.type === "percentage"
            ? p.price * (1 + bulkAction.value / 100)
            : p.price + bulkAction.value;
        return { ...p, price: Math.max(0, newPrice) };
      }
      return p;
    });

    setProducts(updated);
    const savedProducts = JSON.parse(
      localStorage.getItem("admin-products") || "[]"
    );
    const updatedAll = savedProducts.map((p) => {
      const updatedProduct = updated.find((up) => up.id === p.id);
      return updatedProduct || p;
    });
    localStorage.setItem("admin-products", JSON.stringify(updatedAll));
    setSelectedProducts([]);
    toast.success("Prices updated successfully");
  };

  const handleTaxUpdate = (productId, taxRate) => {
    const updated = products.map((p) =>
      p.id === productId ? { ...p, taxRate: parseFloat(taxRate) } : p
    );
    setProducts(updated);
    const savedProducts = JSON.parse(
      localStorage.getItem("admin-products") || "[]"
    );
    const updatedAll = savedProducts.map((p) => {
      const updatedProduct = updated.find((up) => up.id === p.id);
      return updatedProduct || p;
    });
    localStorage.setItem("admin-products", JSON.stringify(updatedAll));
    toast.success("Tax rate updated");
  };

  const columns = [
    {
      key: "name",
      label: "Product",
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-semibold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">ID: {row.id}</p>
        </div>
      ),
    },
    {
      key: "price",
      label: "Current Price",
      sortable: true,
      render: (value) => (
        <span className="font-bold">{formatPrice(value)}</span>
      ),
    },
    {
      key: "taxRate",
      label: "Tax Rate (%)",
      sortable: false,
      render: (value, row) => (
        <input
          type="number"
          value={row.taxRate || 0}
          onChange={(e) => handleTaxUpdate(row.id, e.target.value)}
          className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
          min="0"
          max="100"
          step="0.1"
        />
      ),
    },
    {
      key: "price",
      label: "Price with Tax",
      sortable: false,
      render: (value, row) => {
        const tax = (value * (row.taxRate || 0)) / 100;
        return (
          <span className="font-semibold text-green-600">
            {formatPrice(value + tax)}
          </span>
        );
      },
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view pricing</p>
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
          <FiDollarSign className="text-primary-600" />
          Tax & Pricing Management
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Manage product prices and tax rates
        </p>
      </div>

      {/* Bulk Pricing */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FiTrendingUp />
          Bulk Price Update
        </h3>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={bulkAction.type}
            onChange={(e) =>
              setBulkAction({ ...bulkAction, type: e.target.value })
            }
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
          <input
            type="number"
            value={bulkAction.value}
            onChange={(e) =>
              setBulkAction({
                ...bulkAction,
                value: parseFloat(e.target.value) || 0,
              })
            }
            placeholder={
              bulkAction.type === "percentage"
                ? "Enter percentage"
                : "Enter amount"
            }
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleBulkUpdate}
            disabled={selectedProducts.length === 0}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            Update Selected ({selectedProducts.length})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <DataTable
        data={products}
        columns={columns}
        pagination={true}
        itemsPerPage={10}
        selectable={true}
        selectedItems={selectedProducts}
        onSelectionChange={setSelectedProducts}
      />
    </motion.div>
  );
};

export default TaxPricing;
