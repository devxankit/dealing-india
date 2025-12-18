import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlus, FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import AnimatedSelect from '../../components/AnimatedSelect';
import toast from 'react-hot-toast';

const Cities = () => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');
  const [cities, setCities] = useState([
    { id: 1, name: 'New York', state: 'New York', country: 'USA', status: 'active' },
    { id: 2, name: 'Los Angeles', state: 'California', country: 'USA', status: 'active' },
    { id: 3, name: 'Chicago', state: 'Illinois', country: 'USA', status: 'active' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCity, setEditingCity] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const filteredCities = cities.filter((city) =>
    !searchQuery ||
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = (cityData) => {
    if (editingCity && editingCity.id) {
      setCities(cities.map((c) => (c.id === editingCity.id ? { ...cityData, id: editingCity.id } : c)));
      toast.success('City updated');
    } else {
      const newId = cities.length > 0 ? Math.max(...cities.map(c => c.id)) + 1 : 1;
      setCities([...cities, { ...cityData, id: newId }]);
      toast.success('City added');
    }
    setEditingCity(null);
  };

  const handleDelete = () => {
    setCities(cities.filter((c) => c.id !== deleteModal.id));
    setDeleteModal({ isOpen: false, id: null });
    toast.success('City deleted');
  };

  const columns = [
    {
      key: 'name',
      label: 'City Name',
      sortable: true,
      render: (value) => <span className="font-semibold text-gray-800">{value}</span>,
    },
    {
      key: 'state',
      label: 'State',
      sortable: true,
    },
    {
      key: 'country',
      label: 'Country',
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
            onClick={() => setEditingCity(row)}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Cities</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage serviceable cities</p>
        </div>
        <button
          onClick={() => setEditingCity({ name: '', state: '', country: '', status: 'active' })}
          className="flex items-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm"
        >
          <FiPlus />
          <span>Add City</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cities..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <DataTable
          data={filteredCities}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      </div>

      <AnimatePresence>
        {editingCity !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setEditingCity(null)}
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
                  {editingCity.id ? 'Edit City' : 'Add City'}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleSave({
                      name: formData.get('name'),
                      state: formData.get('state'),
                      country: formData.get('country'),
                      status: formData.get('status'),
                    });
                  }}
                  className="space-y-4"
                >
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingCity.name || ''}
                    placeholder="City Name"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    name="state"
                    defaultValue={editingCity.state || ''}
                    placeholder="State"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    name="country"
                    defaultValue={editingCity.country || ''}
                    placeholder="Country"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <AnimatedSelect
                    name="status"
                    value={editingCity.status || 'active'}
                    onChange={(e) => setEditingCity({ ...editingCity, status: e.target.value })}
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
                      onClick={() => setEditingCity(null)}
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
        title="Delete City?"
        message="Are you sure you want to delete this city? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

export default Cities;

