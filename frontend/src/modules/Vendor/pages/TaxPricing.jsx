import { useState, useEffect } from "react";
import { FiPackage } from "react-icons/fi";
import { IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import {
  getVendorProductsPricing,
  updateProductTaxRate,
  getActiveTaxRules,
  bulkApplyTaxRate,
} from "../services/taxPricingService";
import toast from "react-hot-toast";
import AnimatedSelect from "../../Admin/components/AnimatedSelect";

const TaxPricing = () => {
  const { vendor } = useVendorAuthStore();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [selectedTaxRule, setSelectedTaxRule] = useState("");
  const [taxApplyMode, setTaxApplyMode] = useState("selected"); // "selected" or "all"

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch products
        const response = await getVendorProductsPricing({ limit: 1000 });
        if (response?.products) {
          setProducts(response.products);
        } else if (response?.data?.products) {
          setProducts(response.data.products);
        } else if (Array.isArray(response)) {
          setProducts(response);
        }
        
        // Fetch admin tax rules
        const rules = await getActiveTaxRules();
        setTaxRules(rules || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
        setProducts([]);
        setTaxRules([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [vendorId]);

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

  const handleBulkApplyTax = async () => {
    if (!selectedTaxRule) {
      toast.error("Please select a tax rule");
      return;
    }

    const selectedRule = taxRules.find((r) => r.id === selectedTaxRule || r._id === selectedTaxRule);
    if (!selectedRule) {
      toast.error("Selected tax rule not found");
      return;
    }

    try {
      let productIds = [];
      if (taxApplyMode === "selected") {
        if (selectedProducts.length === 0) {
          toast.error("Please select at least one product");
          return;
        }
        productIds = selectedProducts;
      } else {
        // All products - empty array means all
        productIds = [];
      }

      const result = await bulkApplyTaxRate(selectedRule.rate, productIds);
      
      if (result.count > 0) {
        // Refresh products list
        const response = await getVendorProductsPricing({ limit: 1000 });
        if (response?.products) {
          setProducts(response.products);
        } else if (response?.data?.products) {
          setProducts(response.data.products);
        }
        toast.success(`Tax rate ${selectedRule.rate}% applied to ${result.count} products`);
        setSelectedTaxRule("");
        setSelectedProducts([]);
      } else {
        toast.error("No products were updated");
      }
    } catch (error) {
      console.error("Error applying tax rate:", error);
      toast.error(error.response?.data?.message || "Failed to apply tax rate");
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
      key: "priceWithTax",
      label: "Price with Tax",
      sortable: false,
      render: (value, row) => {
        const price = row.price || 0;
        const taxRate = row.taxRate || 0;
        const tax = (price * taxRate) / 100;
        const priceWithTax = price + tax;
        return (
          <span className="font-semibold text-green-600">
            {formatPrice(priceWithTax)}
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
          <IndianRupee className="text-primary-600" />
          Tax & Pricing Management
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Manage product prices and tax rates
        </p>
      </div>

      {/* Bulk Tax Apply - Admin Tax Rules */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FiPackage />
          Apply Admin Tax Rules
        </h3>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Tax Rule
              </label>
              <select
                value={selectedTaxRule}
                onChange={(e) => setSelectedTaxRule(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select a tax rule...</option>
                {taxRules.map((rule) => (
                  <option key={rule.id || rule._id} value={rule.id || rule._id}>
                    {rule.name} ({rule.rate}%)
                  </option>
                ))}
              </select>
              {selectedTaxRule && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {taxRules.find((r) => (r.id || r._id) === selectedTaxRule)?.rate}% tax rate
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Apply To
              </label>
              <select
                value={taxApplyMode}
                onChange={(e) => setTaxApplyMode(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="selected">Selected Products</option>
                <option value="all">All Products</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleBulkApplyTax}
            disabled={!selectedTaxRule || (taxApplyMode === "selected" && selectedProducts.length === 0)}
            className="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {taxApplyMode === "all" 
              ? "Apply to All Products" 
              : `Apply to Selected (${selectedProducts.length})`}
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
