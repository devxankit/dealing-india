import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiEye, FiVideo, FiBarChart2, FiTrendingUp, FiPlay } from "react-icons/fi";
import DataTable from "../../../../modules/Admin/components/DataTable";
import Badge from "../../../../shared/components/Badge";
import ConfirmModal from "../../../../modules/Admin/components/ConfirmModal";
import AnimatedSelect from "../../../../modules/Admin/components/AnimatedSelect";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import {
  getVendorReels,
  deleteVendorReel,
} from "../../../../shared/utils/reelHelpers";
import toast from "react-hot-toast";

const AllReels = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const [reels, setReels] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    reelId: null,
  });

  const vendorId = vendor?.id;

  useEffect(() => {
    if (vendorId) {
      loadReels();
    }
  }, [vendorId]);

  const loadReels = () => {
    if (!vendorId) return;
    const vendorReels = getVendorReels(vendorId);
    setReels(vendorReels);
  };

  const filteredReels = useMemo(() => {
    let filtered = reels;

    if (searchQuery) {
      filtered = filtered.filter((reel) =>
        reel.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reel.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((reel) => reel.status === selectedStatus);
    }

    return filtered;
  }, [reels, searchQuery, selectedStatus]);

  const handleDelete = (reelId) => {
    setDeleteModal({ isOpen: true, reelId });
  };

  const confirmDelete = () => {
    if (deleteModal.reelId) {
      deleteVendorReel(deleteModal.reelId);
      loadReels();
      toast.success("Reel deleted successfully");
      setDeleteModal({ isOpen: false, reelId: null });
    }
  };

  const handleEdit = (reelId) => {
    navigate(`/vendor/reels/edit-reel/${reelId}`);
  };

  const handleView = (reelId) => {
    window.open(`/app/reels?reel=${reelId}`, '_blank');
  };

  const columns = [
    {
      label: "Video Content",
      key: "thumbnail",
      render: (_, row) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-20 rounded-lg overflow-hidden relative bg-gray-100 shadow-sm group cursor-pointer" onClick={() => handleView(row.id)}>
            {row.videoUrl ? (
              <video src={row.videoUrl} className="w-full h-full object-cover" muted />
            ) : (
              <img src={row.thumbnail} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <FiPlay className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900 line-clamp-1">{row.productName}</p>
            <p className="text-xs text-gray-500 mt-0.5">ID: {row.id}</p>
          </div>
        </div>
      ),
    },
    {
      label: "Price",
      key: "productPrice",
      render: (_, row) => (
        <span className="font-semibold text-gray-700">
          ₹{row.productPrice?.toLocaleString()}
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
      label: "Actions",
      key: "actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleView(row.id)}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
            title="View Reel"
          >
            <FiEye className="text-lg" />
          </button>
          <button
            onClick={() => handleEdit(row.id)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Edit Reel"
          >
            <FiEdit className="text-lg" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Delete Reel"
          >
            <FiTrash2 className="text-lg" />
          </button>
        </div>
      ),
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

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/30">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search by product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>
          <div className="w-full sm:w-48">
            <AnimatedSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "draft", label: "Draft" },
                { value: "archived", label: "Archived" },
              ]}
              className="bg-white border-gray-200 text-gray-900"
            />
          </div>
        </div>

        {/* Table */}
        <DataTable
          data={filteredReels}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          hideSearch={true}
        />
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
