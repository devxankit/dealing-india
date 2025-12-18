import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../../components/ConfirmModal';
import AnimatedSelect from '../../components/AnimatedSelect';
import toast from 'react-hot-toast';

const AttributeSets = () => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');
  const [attributeSets, setAttributeSets] = useState([
    { id: 1, name: 'Color Set', attributes: ['Red', 'Blue', 'Green'], status: 'active' },
    { id: 2, name: 'Size Set', attributes: ['S', 'M', 'L', 'XL'], status: 'active' },
    { id: 3, name: 'Material Set', attributes: ['Cotton', 'Polyester', 'Wool'], status: 'active' },
  ]);
  const [editingSet, setEditingSet] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const handleSave = (setData) => {
    if (editingSet && editingSet.id) {
      setAttributeSets(attributeSets.map((s) => (s.id === editingSet.id ? { ...setData, id: editingSet.id } : s)));
      toast.success('Attribute set updated');
    } else {
      const newId = attributeSets.length > 0 ? Math.max(...attributeSets.map(s => s.id)) + 1 : 1;
      setAttributeSets([...attributeSets, { ...setData, id: newId }]);
      toast.success('Attribute set added');
    }
    setEditingSet(null);
  };

  const handleDelete = () => {
    setAttributeSets(attributeSets.filter((s) => s.id !== deleteModal.id));
    setDeleteModal({ isOpen: false, id: null });
    toast.success('Attribute set deleted');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Attribute Sets</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage product attribute sets</p>
        </div>
        <button
          onClick={() => setEditingSet({ status: 'active', name: '', attributes: [] })}
          className="flex items-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm"
        >
          <FiPlus />
          <span>Add Attribute Set</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {attributeSets.map((set) => (
          <div key={set.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-2">{set.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {set.attributes.map((attr, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {attr}
                    </span>
                  ))}
                </div>
                <span className={`inline-block mt-3 px-2 py-1 rounded text-xs font-medium ${set.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                  {set.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingSet(set)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <FiEdit />
                </button>
                <button
                  onClick={() => setDeleteModal({ isOpen: true, id: set.id })}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editingSet !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setEditingSet(null)}
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
                  {editingSet.id ? 'Edit Attribute Set' : 'Add Attribute Set'}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const attributes = formData.get('attributes').split(',').map(a => a.trim()).filter(a => a);
                    handleSave({
                      name: formData.get('name'),
                      attributes,
                      status: formData.get('status'),
                    });
                  }}
                  className="space-y-4"
                >
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingSet.name || ''}
                    placeholder="Attribute Set Name"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <textarea
                    name="attributes"
                    defaultValue={editingSet.attributes?.join(', ') || ''}
                    placeholder="Attributes (comma-separated)"
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <AnimatedSelect
                    name="status"
                    value={editingSet.status || 'active'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingSet(prev => ({ ...prev, status: val }));
                    }}
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
                      onClick={() => setEditingSet(null)}
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
        title="Delete Attribute Set?"
        message="Are you sure you want to delete this attribute set? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

export default AttributeSets;

