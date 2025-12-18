import { useState, useEffect } from "react";
import {
  FiFile,
  FiUpload,
  FiDownload,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import ConfirmModal from "../../Admin/components/ConfirmModal";
import Badge from "../../../shared/components/Badge";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import toast from "react-hot-toast";

const Documents = () => {
  const { vendor } = useVendorAuthStore();
  const [documents, setDocuments] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [showUpload, setShowUpload] = useState(false);

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;
    const saved = localStorage.getItem(`vendor-${vendorId}-documents`);
    if (saved) setDocuments(JSON.parse(saved));
  }, [vendorId]);

  const handleUpload = (docData) => {
    const updated = [
      ...documents,
      {
        ...docData,
        id: Date.now(),
        vendorId,
        uploadedAt: new Date().toISOString(),
        status: "pending",
      },
    ];
    setDocuments(updated);
    localStorage.setItem(
      `vendor-${vendorId}-documents`,
      JSON.stringify(updated)
    );
    setShowUpload(false);
    toast.success("Document uploaded");
  };

  const handleDelete = () => {
    const updated = documents.filter((d) => d.id !== deleteModal.id);
    setDocuments(updated);
    localStorage.setItem(
      `vendor-${vendorId}-documents`,
      JSON.stringify(updated)
    );
    setDeleteModal({ isOpen: false, id: null });
    toast.success("Document deleted");
  };

  const columns = [
    { key: "name", label: "Document Name", sortable: true },
    { key: "category", label: "Category", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge
          variant={
            value === "approved"
              ? "success"
              : value === "rejected"
                ? "error"
                : "warning"
          }>
          {value}
        </Badge>
      ),
    },
    {
      key: "expiryDate",
      label: "Expiry Date",
      render: (value) => (value ? new Date(value).toLocaleDateString() : "N/A"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
            <FiDownload />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, id: row.id })}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view documents</p>
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
            <FiFile className="text-primary-600" />
            Documents
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage business documents and certificates
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          <FiUpload />
          <span>Upload Document</span>
        </button>
      </div>

      <DataTable data={documents} columns={columns} pagination={true} />

      {showUpload && (
        <DocumentUploadForm
          onSave={handleUpload}
          onClose={() => setShowUpload(false)}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document?"
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

const DocumentUploadForm = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "License",
    expiryDate: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">Upload Document</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Document Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg">
              <option>License</option>
              <option>Certificate</option>
              <option>Tax Document</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              Expiry Date (optional)
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) =>
                setFormData({ ...formData, expiryDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              Upload File
            </label>
            <input
              type="file"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg">
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Documents;
