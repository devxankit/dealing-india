import { useState, useEffect } from "react";
import { FiDollarSign, FiTrendingUp, FiPackage } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import {
  getVendorProductsPricing,
  updateProductTaxRate,
  bulkUpdateProductPrices,
} from "../services/taxPricingService";
import toast from "react-hot-toast";

const TaxPricing = () => {
  const { vendor } = useVendorAuthStore();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bulkAction, setBulkAction] = useState({
    type: "percentage",
    value: 0,
  });
  const [selectedProducts, setSelectedProducts] = useState([]);

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await getVendorProductsPricing({ limit: 1000 });
        // Handle both response structures
        if (response?.products) {
          setProducts(response.products);
        } else if (response?.data?.products) {
          setProducts(response.data.products);
        } else if (Array.isArray(response)) {
          setProducts(response);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Failed to load products");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [vendorId]);

  const handleBulkUpdate = async () => {
    if (!bulkAction.value || bulkAction.value <= 0) {
      toast.error("Please enter a valid value");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    try {
      const updates = selectedProducts.map((productId) => {
        const product = products.find(
          (p) => (p._id?.toString() || p.id?.toString()) === productId.toString()
        );
        if (!product) return null;

        const newPrice =
          bulkAction.type === "percentage"
            ? product.price * (1 + bulkAction.value / 100)
            : product.price + bulkAction.value;

        return {
          productId: product._id?.toString() || product.id?.toString(),
          price: Math.max(0, newPrice),
        };
      }).filter(Boolean);

      const result = await bulkUpdateProductPrices(updates);
      
      if (result.updated && result.updated.length > 0) {
        // Update local state with updated products
        const updatedMap = new Map(
          result.updated.map((p) => [p._id?.toString() || p.id?.toString(), p])
        );
        setProducts((prev) =>
          prev.map((p) => {
            const id = p._id?.toString() || p.id?.toString();
            return updatedMap.get(id) || p;
          })
        );
        toast.success(`Updated ${result.updated.length} products`);
      }

      if (result.failed && result.failed.length > 0) {
        toast.error(`Failed to update ${result.failed.length} products`);
      }

      setSelectedProducts([]);
      setBulkAction({ type: "percentage", value: 0 });
    } catch (error) {
      console.error("Error updating prices:", error);
      toast.error(error.response?.data?.message || "Failed to update prices");
    }
  };

  const handleTaxUpdate = async (productId, taxRate) => {
    try {
      const product = await updateProductTaxRate(productId, parseFloat(taxRate) || 0);
      setProducts((prev) =>
        prev.map((p) => {
          const id = p._id?.toString() || p.id?.toString();
          return id === productId.toString() ? { ...p, taxRate: product.taxRate } : p;
        })
      );
      toast.success("Tax rate updated");
    } catch (error) {
      console.error("Error updating tax rate:", error);
      toast.error(error.response?.data?.message || "Failed to update tax rate");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Product",
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-semibold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">
            ID: {row._id?.toString() || row.id?.toString()}
          </p>
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
          onChange={(e) =>
            handleTaxUpdate(row._id?.toString() || row.id?.toString(), e.target.value)
          }
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
      {isLoading ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : (
        <DataTable
          data={products}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
          selectable={true}
          selectedItems={selectedProducts}
          onSelectionChange={setSelectedProducts}
          rowKey={(row) => row._id?.toString() || row.id?.toString()}
        />
      )}
    </motion.div>
  );
};

export default TaxPricing;
