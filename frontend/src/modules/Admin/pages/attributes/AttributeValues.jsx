import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiSearch } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import AnimatedSelect from '../../components/AnimatedSelect';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const AttributeValues = () => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');
  const [attributeValues, setAttributeValues] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingValue, setEditingValue] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [attributeFilter, setAttributeFilter] = useState('all');

  useEffect(() => {
    fetchAttributes();
    fetchAttributeValues();
  }, []);

  useEffect(() => {
    fetchAttributeValues();
  }, [attributeFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttributeValues();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, attributeFilter]);

  const fetchAttributes = async () => {
    try {
      const response = await api.get('/admin/attributes');
      if (response.success && response.data?.attributes) {
        setAttributes(response.data.attributes);
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    }
  };

  const fetchAttributeValues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (attributeFilter !== 'all') {
        params.append('attributeId', attributeFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const queryString = params.toString();
      const url = `/admin/attribute-values${queryString ? `?${queryString}` : ''}`;
      const response = await api.get(url);
      if (response.success && response.data?.attributeValues) {
        const transformed = response.data.attributeValues.map((val) => ({
          id: val._id || val.id,
          attributeId: val.attributeId?._id || val.attributeId?.id || val.attributeId,
          attributeName: val.attributeId?.name || 'Unknown',
          value: val.value,
          displayOrder: val.displayOrder,
          status: val.status,
        }));
        setAttributeValues(transformed);
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (valueData) => {
    try {
      const payload = {
        attributeId: valueData.attributeId,
        value: valueData.value,
        displayOrder: valueData.displayOrder || 1,
        status: valueData.status,
      };

      let response;
      if (editingValue && editingValue.id) {
        response = await api.put(`/admin/attribute-values/${editingValue.id}`, payload);
      } else {
        response = await api.post('/admin/attribute-values', payload);
      }

      if (response.success) {
        toast.success(editingValue && editingValue.id ? 'Attribute value updated' : 'Attribute value added');
        setEditingValue(null);
        fetchAttributeValues();
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete(`/admin/attribute-values/${deleteModal.id}`);
      if (response.success) {
        toast.success('Attribute value deleted');
        setDeleteModal({ isOpen: false, id: null });
        fetchAttributeValues();
      }
    } catch (error) {
      // Error toast is handled by api interceptor
    }
  };

  const columns = [
    {
      key: 'attributeName',
      label: 'Attribute',
      sortable: true,
      render: (value) => <span className="font-medium text-gray-800">{value}</span>,
    },
    {
      key: 'value',
      label: 'Value',
      sortable: true,
      render: (value) => <span className="text-gray-700">{value}</span>,
    },
    {
      key: 'displayOrder',
      label: 'Order',
      sortable: true,
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
            onClick={() => setEditingValue(row)}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Attribute Values</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage values for product attributes</p>
        </div>
        <button
          onClick={() => setEditingValue({ attributeId: '', attributeName: '', value: '', displayOrder: 1, status: 'active' })}
          className="flex items-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm"
        >
          <FiPlus />
          <span>Add Value</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search values..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <AnimatedSelect
            value={attributeFilter}
            onChange={(e) => setAttributeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Attributes' },
              ...attributes.map((attr) => ({
                value: (attr._id || attr.id).toString(),
                label: attr.name,
              })),
            ]}
            className="min-w-[160px]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading attribute values...</div>
        ) : (
          <DataTable
            data={attributeValues}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        )}
      </div>

      <AnimatePresence>
        {editingValue !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setEditingValue(null)}
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
                  {editingValue.id ? 'Edit Attribute Value' : 'Add Attribute Value'}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const selectedAttr = attributes.find(a => (a._id || a.id).toString() === formData.get('attributeId'));
                    handleSave({
                      attributeId: formData.get('attributeId'),
                      attributeName: selectedAttr?.name || '',
                      value: formData.get('value'),
                      displayOrder: parseInt(formData.get('displayOrder')),
                      status: formData.get('status'),
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attribute</label>
                    <AnimatedSelect
                      name="attributeId"
                      value={editingValue.attributeId || ''}
                      onChange={(e) => {
                        const selectedAttr = attributes.find(a => (a._id || a.id).toString() === e.target.value);
                        setEditingValue({
                          ...editingValue,
                          attributeId: e.target.value,
                          attributeName: selectedAttr?.name || '',
                        });
                      }}
                      options={attributes.map((attr) => ({
                        value: (attr._id || attr.id).toString(),
                        label: attr.name,
                      }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <input
                      type="text"
                      name="value"
                      defaultValue={editingValue.value || ''}
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                      <input
                        type="number"
                        name="displayOrder"
                        defaultValue={editingValue.displayOrder || 1}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <AnimatedSelect
                        name="status"
                        value={editingValue.status || 'active'}
                        onChange={(e) => setEditingValue({ ...editingValue, status: e.target.value })}
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                        ]}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingValue(null)}
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
        title="Delete Attribute Value?"
        message="Are you sure you want to delete this attribute value? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

export default AttributeValues;

