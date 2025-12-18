import { useState, useEffect } from "react";
import { FiLayers, FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import ConfirmModal from "../../Admin/components/ConfirmModal";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import toast from "react-hot-toast";

const ProductAttributes = () => {
  const { vendor } = useVendorAuthStore();
  const [attributes, setAttributes] = useState([]);
  const [editingAttr, setEditingAttr] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;
    const saved = localStorage.getItem(`vendor-${vendorId}-attributes`);
    if (saved) setAttributes(JSON.parse(saved));
  }, [vendorId]);

  const handleSave = (attrData) => {
    const updated =
      editingAttr && editingAttr.id
        ? attributes.map((a) =>
          a.id === editingAttr.id
            ? { ...attrData, id: editingAttr.id, vendorId }
            : a
        )
        : [...attributes, { ...attrData, id: Date.now(), vendorId }];
    setAttributes(updated);
    localStorage.setItem(
      `vendor-${vendorId}-attributes`,
      JSON.stringify(updated)
    );
    setEditingAttr(null);
    toast.success(editingAttr ? "Attribute updated" : "Attribute added");
  };

  const handleDelete = () => {
    const updated = attributes.filter((a) => a.id !== deleteModal.id);
    setAttributes(updated);
    localStorage.setItem(
      `vendor-${vendorId}-attributes`,
      JSON.stringify(updated)
    );
    setDeleteModal({ isOpen: false, id: null });
    toast.success("Attribute deleted");
  };

  const columns = [
    { key: "name", label: "Attribute Name", sortable: true },
    { key: "type", label: "Type", sortable: true },
    {
      key: "values",
      label: "Values",
      render: (value) => (Array.isArray(value) ? value.join(", ") : value),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditingAttr(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
            <FiEdit />
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
        <p className="text-gray-500">Please log in to view attributes</p>
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
            <FiLayers className="text-primary-600" />
            Product Attributes
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage product attributes and values
          </p>
        </div>
        <button
          onClick={() => setEditingAttr({})}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          <FiPlus />
          <span>Add Attribute</span>
        </button>
      </div>

      <DataTable data={attributes} columns={columns} pagination={true} />

      {editingAttr !== null && (
        <AttributeForm
          attribute={editingAttr}
          onSave={handleSave}
          onClose={() => setEditingAttr(null)}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Attribute"
        message="Are you sure you want to delete this attribute?"
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

const AttributeForm = ({ attribute, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: attribute?.name || "",
    type: attribute?.type || "text",
    values: attribute?.values || [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">
          {attribute?.id ? "Edit Attribute" : "Add Attribute"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Name</label>
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
            <label className="block text-sm font-semibold mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg">
              <option value="text">Text</option>
              <option value="select">Select</option>
              <option value="multiselect">Multi-Select</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              Values (comma-separated)
            </label>
            <input
              type="text"
              value={
                Array.isArray(formData.values)
                  ? formData.values.join(", ")
                  : formData.values
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  values: e.target.value.split(",").map((v) => v.trim()),
                })
              }
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
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductAttributes;
