import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import AnimatedSelect from '../../components/AnimatedSelect';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const Attributes = () => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/attributes');
      if (response.success && response.data?.attributes) {
        const transformed = response.data.attributes.map((attr) => ({
          id: attr._id || attr.id,
          name: attr.name,
          type: attr.type,
          required: attr.required,
          status: attr.status,
        }));
        setAttributes(transformed);
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (attrData) => {
    try {
      const payload = {
        name: attrData.name,
        type: attrData.type,
        required: attrData.required === true || attrData.required === 'true',
        status: attrData.status,
      };

      let response;
      if (editingAttribute && editingAttribute.id) {
        response = await api.put(`/admin/attributes/${editingAttribute.id}`, payload);
      } else {
        response = await api.post('/admin/attributes', payload);
      }

      if (response.success) {
        toast.success(editingAttribute && editingAttribute.id ? 'Attribute updated' : 'Attribute added');
        setEditingAttribute(null);
        fetchAttributes();
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete(`/admin/attributes/${deleteModal.id}`);
      if (response.success) {
        toast.success('Attribute deleted');
        setDeleteModal({ isOpen: false, id: null });
        fetchAttributes();
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value) => <span className="font-semibold text-gray-800">{value}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          {value}
        </span>
      ),
    },
    {
      key: 'required',
      label: 'Required',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingAttribute(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <FiEdit />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, id: row.id })}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Attributes</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage product attributes</p>
        </div>
        <button
          onClick={() => setEditingAttribute({ name: '', type: 'select', required: false, status: 'active' })}
          className="flex items-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm"
        >
          <FiPlus />
          <span>Add Attribute</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading attributes...</div>
        ) : (
          <DataTable
            data={attributes}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        )}
      </div>

      <AnimatePresence>
        {editingAttribute !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setEditingAttribute(null)}
              className="fixed inset-0 bg-black/50 z-[10000]"
            />

            {/* Modal Content - Mobile: Slide up from bottom, Desktop: Center with scale */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-[10000] flex ${isAppRoute ? 'items-start pt-[10px]' : 'items-end'} sm:items-center justify-center p-4 pointer-events-none`}
            >
              <motion.div
                variants={{
                  hidden: {
                    y: isAppRoute ? '-100%' : '100%',
                    scale: 0.95,
                    opacity: 0
                  },
                  visible: {
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    transition: {
                      type: 'spring',
                      damping: 22,
                      stiffness: 350,
                      mass: 0.7
                    }
                  },
                  exit: {
                    y: isAppRoute ? '-100%' : '100%',
                    scale: 0.95,
                    opacity: 0,
                    transition: {
                      type: 'spring',
                      damping: 30,
                      stiffness: 400
                    }
                  }
                }}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
                className={`bg-white ${isAppRoute ? 'rounded-b-3xl' : 'rounded-t-3xl'} sm:rounded-xl shadow-xl p-6 max-w-md w-full pointer-events-auto`}
                style={{ willChange: 'transform' }}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingAttribute.id ? 'Edit Attribute' : 'Add Attribute'}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleSave({
                      name: formData.get('name'),
                      type: formData.get('type'),
                      required: formData.get('required') === 'true',
                      status: formData.get('status'),
                    });
                  }}
                  className="space-y-4"
                >
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingAttribute.name || ''}
                    placeholder="Attribute Name"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <AnimatedSelect
                    name="type"
                    value={editingAttribute.type || 'select'}
                    onChange={(e) => setEditingAttribute({ ...editingAttribute, type: e.target.value })}
                    options={[
                      { value: 'select', label: 'Select' },
                      { value: 'text', label: 'Text' },
                      { value: 'number', label: 'Number' },
                      { value: 'boolean', label: 'Boolean' },
                    ]}
                    required
                  />
                  <AnimatedSelect
                    name="required"
                    value={editingAttribute.required ? 'true' : 'false'}
                    onChange={(e) => setEditingAttribute({ ...editingAttribute, required: e.target.value === 'true' })}
                    options={[
                      { value: 'false', label: 'Optional' },
                      { value: 'true', label: 'Required' },
                    ]}
                    required
                  />
                  <AnimatedSelect
                    name="status"
                    value={editingAttribute.status || 'active'}
                    onChange={(e) => setEditingAttribute({ ...editingAttribute, status: e.target.value })}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                    required
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAttribute(null)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Attribute?"
        message="Are you sure you want to delete this attribute? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

export default Attributes;

