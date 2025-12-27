import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiEye, FiVideo, FiBarChart2, FiTrendingUp, FiPlay } from "react-icons/fi";
import DataTable from "../../../../modules/Admin/components/DataTable";
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
    const reelId = reel._id || reel.id || reel;
    window.open(`/app/reels?reel=${reelId}`, '_blank');
  };

  const columns = [
    {
      label: "Video Content",
      key: "thumbnail",
      render: (_, row) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-20 rounded-lg overflow-hidden relative bg-gray-100 shadow-sm group cursor-pointer" onClick={() => handleView(row)}>
            {row.videoUrl ? (
              <video src={row.videoUrl} className="w-full h-full object-cover" muted />
            ) : (
              <img src={row.thumbnail || row.productId?.image} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://via.placeholder.com/64"; }} />
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <FiPlay className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900 line-clamp-1">{row.productName || row.productId?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500 mt-0.5">ID: {row.id || row._id}</p>
          </div>
        </div>
      ),
    },
    {
      label: "Price",
      key: "productPrice",
      render: (_, row) => (
        <span className="font-semibold text-gray-700">
          ₹{(row.productPrice || row.productId?.price || 0).toLocaleString()}
        </span>
      ),
    },
    {
      label: "Engagement",
      key: "engagement",
      render: (_, row) => (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-pink-500" title="Likes">
            <span className="text-lg">♥</span> {row.likes || 0}
          </div>
          <div className="flex items-center gap-1 text-blue-500" title="Comments">
            <span className="text-lg">💬</span> {row.comments || 0}
          </div>
          <div className="flex items-center gap-1 text-purple-500" title="Shares">
            <span className="text-lg">↗</span> {row.shares || 0}
          </div>
        </div>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (_, row) => (
        <Badge
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
      label: "Actions",
      key: "actions",
      render: (_, row) => {
        const reelId = row._id || row.id;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleView(row)}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              title="View Reel"
            >
              <FiEye className="text-lg" />
            </button>
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Edit Reel"
            >
              <FiEdit className="text-lg" />
            </button>
            <button
              onClick={() => handleDelete(reelId)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Reel Library
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your product reels and analyze engagement performance.
          </p>
        </div>
        <button
          onClick={() => navigate("/vendor/reels/add-reel")}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 hover:shadow-purple-300 font-semibold"
        >
          <FiPlus className="text-xl" />
          <span>Create New Reel</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Reels</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {reels.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            <FiVideo />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Content</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {reels.filter((r) => r.status === "active").length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-xl">
            <FiBarChart2 />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Engagement</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-3xl font-bold text-purple-600">
                {reels.reduce((sum, r) => sum + (r.likes || 0) + (r.comments || 0) + (r.shares || 0), 0).toLocaleString()}
              </p>
              <span className="text-xs text-green-500 font-medium flex items-center gap-0.5"><FiTrendingUp /> +12%</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
            <FiTrendingUp />
          </div>
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
    </div>
  );
};

export default AllReels;
