import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiEye, FiVideo } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../../../modules/Admin/components/DataTable";
import ExportButton from "../../../../modules/Admin/components/ExportButton";
import Badge from "../../../../shared/components/Badge";
import ConfirmModal from "../../../../modules/Admin/components/ConfirmModal";
import AnimatedSelect from "../../../../modules/Admin/components/AnimatedSelect";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import {
  getVendorReels as getVendorReelsAPI,
  deleteVendorReel as deleteVendorReelAPI,
} from "../../services/reelService";
import toast from "react-hot-toast";

const AllReels = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    reelId: null,
  });

  const vendorId = vendor?.id;

  useEffect(() => {
    if (vendorId) {
      loadReels();
    }
  }, [vendorId, currentPage, selectedStatus]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadReels();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadReels = async () => {
    if (!vendorId) return;

    setLoading(true);
    try {
      const response = await getVendorReelsAPI({
        search: searchQuery,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        page: currentPage,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      // Handle both response structures
      if (response?.reels) {
        setReels(response.reels);
        setTotalPages(response.pagination?.pages || 1);
      } else if (response?.data?.reels) {
        setReels(response.data.reels);
        setTotalPages(response.pagination?.pages || 1);
      } else if (Array.isArray(response)) {
        setReels(response);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error loading reels:", error);
      toast.error("Failed to load reels");
      setReels([]);
    } finally {
      setLoading(false);
    }
  };

  // Reels are already filtered by API
  const filteredReels = reels;

  const handleDelete = (reelId) => {
    setDeleteModal({ isOpen: true, reelId });
  };

  const confirmDelete = async () => {
    if (!deleteModal.reelId) return;

    try {
      await deleteVendorReelAPI(deleteModal.reelId);
      toast.success("Reel deleted successfully");
      setDeleteModal({ isOpen: false, reelId: null });
      loadReels();
    } catch (error) {
      console.error("Error deleting reel:", error);
      toast.error("Failed to delete reel");
    }
  };

  const handleEdit = (reel) => {
    navigate(`/vendor/reels/edit-reel/${reel._id || reel.id}`);
  };

  const handleView = (reel) => {
    // Navigate to view reel in app
    const reelId = reel._id || reel.id;
    window.open(`/app/reels?reel=${reelId}`, '_blank');
  };

  const columns = [
    {
      header: "Thumbnail",
      accessor: "thumbnail",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.thumbnail || row.productId?.image}
            alt={row.productName}
            className="w-16 h-16 object-cover rounded-lg"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/64";
            }}
          />
        </div>
      ),
    },
    {
      header: "Product",
      accessor: "productName",
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {row.productName || row.productId?.name || 'Unknown'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {row.vendorName || ''}
          </p>
        </div>
      ),
    },
    {
      header: "Price",
      accessor: "productPrice",
      cell: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          ₹{row.productPrice?.toLocaleString() || row.productId?.price?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      header: "Engagement",
      accessor: "engagement",
      cell: (row) => (
        <div className="text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            👍 {row.likes || 0} | 💬 {row.comments || 0} | 🔗 {row.shares || 0}
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <Badge
          value={row.status || "active"}
          variant={
            row.status === "active"
              ? "success"
              : row.status === "draft"
              ? "warning"
              : "error"
          }
        >
          {(row.status || "active").toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      cell: (row) => {
        const reelId = row._id || row.id;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleView(row)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="View Reel"
            >
              <FiEye className="text-lg" />
            </button>
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              title="Edit Reel"
            >
              <FiEdit className="text-lg" />
            </button>
            <button
              onClick={() => handleDelete(reelId)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete Reel"
            >
              <FiTrash2 className="text-lg" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            All Reels
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your product reels and video content
          </p>
        </div>
        <button
          onClick={() => navigate("/vendor/reels/add-reel")}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <FiPlus className="text-lg" />
          <span>Add Reel</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input
            type="text"
            placeholder="Search reels by product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Status Filter */}
        <AnimatedSelect
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
            { value: "archived", label: "Archived" },
          ]}
          className="w-full sm:w-48"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Reels</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {reels.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Active Reels</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {reels.filter((r) => r.status === "active").length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Views</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {reels.reduce((sum, r) => sum + (r.views || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">Loading reels...</p>
          </div>
        ) : filteredReels.length > 0 ? (
          <DataTable
            data={filteredReels}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No reels found</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, reelId: null })}
        onConfirm={confirmDelete}
        title="Delete Reel"
        message="Are you sure you want to delete this reel? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </motion.div>
  );
};

export default AllReels;

