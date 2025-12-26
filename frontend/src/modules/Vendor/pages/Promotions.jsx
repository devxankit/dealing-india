import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiTag,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import ExportButton from "../../Admin/components/ExportButton";
import Badge from "../../../shared/components/Badge";
import ConfirmModal from "../../Admin/components/ConfirmModal";
import AnimatedSelect from "../../Admin/components/AnimatedSelect";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { getVendorPromotions } from "../services/promotionService";
import toast from "react-hot-toast";

const Promotions = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedCode, setCopiedCode] = useState(null);

  const vendorId = vendor?.id;

  useEffect(() => {
    if (vendorId) {
      loadPromotions();
    }
  }, [vendorId, currentPage, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadPromotions();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPromotions = async () => {
    if (!vendorId) return;

    setLoading(true);
    try {
      const response = await getVendorPromotions({
        search: searchQuery,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page: currentPage,
        limit: 10,
      });

      // Handle both response structures
      if (response?.promotions) {
        setPromotions(response.promotions);
        setTotalPages(response.pagination?.pages || 1);
      } else if (response?.data?.promotions) {
        setPromotions(response.data.promotions);
        setTotalPages(response.pagination?.pages || 1);
      } else if (Array.isArray(response)) {
        setPromotions(response);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error loading promotions:", error);
      toast.error("Failed to load promotions");
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  // Promotions are already filtered by API
  const filteredPromotions = promotions;

  // Vendors cannot create/edit/delete promotions - they can only view admin-created ones

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Code copied to clipboard");
  };

  const getStatusVariant = (status) => {
    const statusMap = {
      active: "success",
      inactive: "warning",
      expired: "error",
    };
    return statusMap[status] || "warning";
  };

  const columns = [
    {
      key: "code",
      label: "Promo Code",
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-semibold">
              {value || row.code || "N/A"}
            </code>
            {value && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(value || row.code);
                }}
                className="p-1 text-gray-600 hover:text-blue-600">
                {copiedCode === (value || row.code) ? <FiCheck /> : <FiCopy />}
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (value) => (
        <Badge variant="info">
          {value === "percentage" ? "Percentage" : "Fixed Amount"}
        </Badge>
      ),
    },
    {
      key: "value",
      label: "Discount",
      sortable: true,
      render: (value, row) => (
        <span className="font-semibold">
          {row.type === "percentage" ? `${value}%` : formatPrice(value)}
        </span>
      ),
    },
    {
      key: "startDate",
      label: "Period",
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <p>{new Date(value).toLocaleDateString()}</p>
          <p className="text-xs text-gray-500">
            to {new Date(row.endDate).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      key: "usedCount",
      label: "Usage",
      sortable: true,
      render: (value, row) => (
        <span className="text-sm">
          {value || 0} / {row.usageLimit === -1 ? "∞" : (row.usageLimit || "∞")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={getStatusVariant(value)}>{value}</Badge>
      ),
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view promotions</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FiTag className="text-primary-600" />
            Promotions & Offers
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage discounts and promotional offers
          </p>
        </div>
        {/* Vendors can only view promotions, not create them */}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search promotions..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>

          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "expired", label: "Expired" },
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />

          <div className="w-full sm:w-auto">
            <ExportButton
              data={filteredPromotions}
              headers={[
                { label: "Code", accessor: (row) => row.code },
                { label: "Type", accessor: (row) => row.type },
                {
                  label: "Discount",
                  accessor: (row) =>
                    row.type === "percentage"
                      ? `${row.value}%`
                      : formatPrice(row.value),
                },
                { label: "Status", accessor: (row) => row.status },
                {
                  label: "Usage",
                  accessor: (row) =>
                    `${row.usedCount || 0} / ${row.usageLimit === -1 ? "∞" : (row.usageLimit || "∞")}`,
                },
              ]}
              filename="vendor-promotions"
            />
          </div>
        </div>
      </div>

      {/* Promotions Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">Loading promotions...</p>
        </div>
      ) : filteredPromotions.length > 0 ? (
        <DataTable
          data={filteredPromotions}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No promotions available</p>
          <p className="text-sm text-gray-400 mt-2">Promotions are created by admin</p>
        </div>
      )}
    </motion.div>
  );
};

// Vendors cannot create/edit promotions - removed PromotionForm component

export default Promotions;
