import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiTrash2, FiFilter, FiPackage, FiTrendingDown, FiXCircle, FiLayers, FiAlertCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import ExportButton from "../../components/ExportButton";
import Badge from "../../../../shared/components/Badge";
import ConfirmModal from "../../components/ConfirmModal";
import AnimatedSelect from "../../components/AnimatedSelect";
import StatCard from "../../../../shared/components/StatCard";
import { formatPrice } from "../../../../shared/utils/helpers";

import { useCategoryStore } from "../../../../shared/store/categoryStore";
import { useVendorManagementStore } from "../../store/vendorManagementStore";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api.js";

const ManageProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { categories, initialize: initCategories } = useCategoryStore();
  const { vendors, fetchVendors } = useVendorManagementStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    productId: null,
  });

  useEffect(() => {
    initCategories();
    fetchVendors({ limit: 1000 }); // Fetch all vendors for the dropdown
    loadProducts();
  }, []);

  // Helper to transform MongoDB _id to id and flatten relationships
  const transformProduct = (product) => {
    if (!product) return null;
    return {
      ...product,
      id: product._id || product.id,
      categoryId: product.categoryId?._id || product.categoryId?.id || product.categoryId,
      subcategoryId: product.subcategoryId?._id || product.subcategoryId?.id || product.subcategoryId,
      subSubCategoryId: product.subSubCategoryId?._id || product.subSubCategoryId?.id || product.subSubCategoryId,
      vendorId: product.vendorId?._id || product.vendorId?.id || product.vendorId,
    };
  };

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/admin/products", {
        params: {
          limit: 1000, // Get all products for client-side filtering
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
      const transformedProducts = (response.data.products || []).map(transformProduct);
      setProducts(transformedProducts);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((product) => product.stock === selectedStatus);
    }

    if (selectedCategory !== "all") {
      // Find the selected category and its subcategories/sub-subcategories
      const findChildIds = (catId) => {
        const ids = [catId];
        const category = categories.find(c => String(c.id || c._id) === String(catId));

        if (category?.subcategories) {
          category.subcategories.forEach(sub => {
            ids.push(String(sub.id || sub._id));
            if (sub.subSubCategories) {
              sub.subSubCategories.forEach(ssub => {
                ids.push(String(ssub.id || ssub._id));
              });
            }
          });
        }
        return ids;
      };

      const allowedCategoryIds = findChildIds(selectedCategory);

      filtered = filtered.filter((product) => {
        const prodCatId = String(product.categoryId || "");
        const prodSubCatId = String(product.subcategoryId || "");
        const prodSubSubCatId = String(product.subSubCategoryId || "");

        return allowedCategoryIds.includes(prodCatId) ||
          allowedCategoryIds.includes(prodSubCatId) ||
          allowedCategoryIds.includes(prodSubSubCatId);
      });
    }

    if (selectedVendor !== "all") {
      filtered = filtered.filter((product) => {
        const vendorId = String(product.vendorId || "");
        return vendorId === selectedVendor;
      });
    }

    return filtered;
  }, [products, searchQuery, selectedStatus, selectedCategory, selectedVendor, categories]);

  // Calculate product statistics based on filtered results
  const productStats = useMemo(() => {
    const totalProducts = filteredProducts.length;

    // Calculate total quantities based on stock status
    const inStockProducts = filteredProducts
      .filter((p) => p.stock === "in_stock")
      .reduce((sum, p) => sum + (Number(p.stockQuantity) || 0), 0);

    const lowStockProducts = filteredProducts
      .filter((p) => p.stock === "low_stock")
      .reduce((sum, p) => sum + (Number(p.stockQuantity) || 0), 0);

    const outOfStockProducts = filteredProducts
      .filter((p) => p.stock === "out_of_stock")
      .reduce((sum, p) => sum + (Number(p.stockQuantity) || 0), 0);

    const totalCategories = categories.filter((cat) => cat.isActive !== false).length;
    const totalValue = filteredProducts.reduce((sum, p) => sum + ((p.price || 0) * (Number(p.stockQuantity) || 0)), 0);

    return {
      totalProducts,
      inStockProducts,
      lowStockProducts,
      outOfStockProducts,
      totalCategories,
      totalValue,
    };
  }, [filteredProducts, categories]);

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (value, row) => row.id || row._id || value,
    },
    {
      key: "name",
      label: "Product Name",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.image}
            alt={value}
            className="w-10 h-10 object-cover rounded-lg"
            onError={(e) => {
              e.target.src = getPlaceholderImage(50, 50, "Product");
            }}
          />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (value) => formatPrice(value),
    },
    {
      key: "stockQuantity",
      label: "Stock",
      sortable: true,
      render: (value) => value.toLocaleString(),
    },
    {
      key: "stock",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === "in_stock"
              ? "success"
              : value === "low_stock"
                ? "warning"
                : "error"
          }>
          {value.replace("_", " ").toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ isOpen: true, productId: row.id });
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  const confirmDelete = async () => {
    try {
      const productId = deleteModal.productId?.toString() || deleteModal.productId;
      await api.delete(`/admin/products/${productId}`);
      await loadProducts(); // Reload products
      setDeleteModal({ isOpen: false, productId: null });
      toast.success("Product deleted successfully");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete product";
      toast.error(errorMessage);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Manage Products
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            View, edit, and manage your product catalog
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FiPackage}
          label="Total Products"
          value={productStats.totalProducts}
          color="bg-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-700"
        />
        <StatCard
          icon={FiTrendingDown}
          label="In Stock"
          value={productStats.inStockProducts}
          color="bg-green-500"
          bgColor="bg-green-50"
          textColor="text-green-700"
        />
        <StatCard
          icon={FiAlertCircle}
          label="Low Stock"
          value={productStats.lowStockProducts}
          color="bg-orange-500"
          bgColor="bg-orange-50"
          textColor="text-orange-700"
        />
        <StatCard
          icon={FiXCircle}
          label="Out of Stock"
          value={productStats.outOfStockProducts}
          color="bg-red-500"
          bgColor="bg-red-50"
          textColor="text-red-700"
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={FiLayers}
          label="Total Categories"
          value={productStats.totalCategories}
          color="bg-purple-500"
          bgColor="bg-purple-50"
          textColor="text-purple-700"
        />
        <StatCard
          icon={FiPackage}
          label="Inventory Value"
          value={formatPrice(productStats.totalValue)}
          color="bg-teal-500"
          bgColor="bg-teal-50"
          textColor="text-teal-700"
        />
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
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
              />
            </div>

            <AnimatedSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: "all", label: "All Status" },
                { value: "in_stock", label: "In Stock" },
                { value: "low_stock", label: "Low Stock" },
                { value: "out_of_stock", label: "Out of Stock" },
              ]}
              className="w-full sm:w-auto min-w-[140px]"
            />

            <AnimatedSelect
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: "all", label: "All Categories" },
                ...categories
                  .filter((cat) => cat.isActive !== false)
                  .map((cat) => ({ value: String(cat.id), label: cat.name })),
              ]}
              className="w-full sm:w-auto min-w-[160px]"
            />

            <AnimatedSelect
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              options={[
                { value: "all", label: "All Vendors" },
                ...vendors.map((vendor) => ({
                  value: String(vendor.id || vendor._id),
                  label: vendor.storeName || vendor.name || "Unknown Vendor",
                })),
              ]}
              className="w-full sm:w-auto min-w-[180px]"
            />

            <div className="w-full sm:w-auto">
              <ExportButton
                data={filteredProducts}
                headers={[
                  { label: "ID", accessor: (row) => row.id },
                  { label: "Name", accessor: (row) => row.name },
                  {
                    label: "Price",
                    accessor: (row) => formatPrice(row.price),
                  },
                  { label: "Stock", accessor: (row) => row.stockQuantity },
                  { label: "Status", accessor: (row) => row.stock },
                ]}
                filename="products"
              />
            </div>
          </div>
        </div>

        {/* DataTable */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : (
          <DataTable
            data={filteredProducts}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, productId: null })}
        onConfirm={confirmDelete}
        title="Delete Product?"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

export default ManageProducts;
