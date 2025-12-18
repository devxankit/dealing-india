import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiTag, FiCopy, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';
import Badge from '../../../shared/components/Badge';
import ConfirmModal from '../components/ConfirmModal';
import AnimatedSelect from '../components/AnimatedSelect';
import { formatCurrency, formatDateTime } from '../utils/adminHelpers';
import toast from 'react-hot-toast';

const PromoCodes = () => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');
  const [promoCodes, setPromoCodes] = useState([
    {
      id: 1,
      code: 'SAVE20',
      type: 'percentage',
      value: 20,
      minPurchase: 50,
      maxDiscount: 100,
      usageLimit: 100,
      usedCount: 45,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    },
    {
      id: 2,
      code: 'FLAT50',
      type: 'fixed',
      value: 50,
      minPurchase: 100,
      maxDiscount: 50,
      usageLimit: 50,
      usedCount: 32,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    },
    {
      id: 3,
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      minPurchase: 0,
      maxDiscount: 25,
      usageLimit: 1,
      usedCount: 0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingCode, setEditingCode] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const savedCodes = localStorage.getItem('admin-promocodes');
    if (savedCodes) {
      setPromoCodes(JSON.parse(savedCodes));
    } else {
      localStorage.setItem('admin-promocodes', JSON.stringify(promoCodes));
    }
  }, []);

  const filteredCodes = promoCodes.filter((code) => {
    const matchesSearch =
      !searchQuery ||
      code.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || code.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSave = (codeData) => {
    const updatedCodes = editingCode && editingCode.id
      ? promoCodes.map((c) => (c.id === editingCode.id ? { ...codeData, id: editingCode.id } : c))
      : [...promoCodes, { ...codeData, id: promoCodes.length > 0 ? Math.max(...promoCodes.map(c => c.id)) + 1 : 1, usedCount: 0 }];

    setPromoCodes(updatedCodes);
    localStorage.setItem('admin-promocodes', JSON.stringify(updatedCodes));
    setEditingCode(null);
    toast.success(editingCode && editingCode.id ? 'Promo code updated' : 'Promo code added');
  };

  const handleDelete = () => {
    const updatedCodes = promoCodes.filter((c) => c.id !== deleteModal.id);
    setPromoCodes(updatedCodes);
    localStorage.setItem('admin-promocodes', JSON.stringify(updatedCodes));
    setDeleteModal({ isOpen: false, id: null });
    toast.success('Promo code deleted');
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleStatus = (id) => {
    const updatedCodes = promoCodes.map((c) =>
      c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c
    );
    setPromoCodes(updatedCodes);
    localStorage.setItem('admin-promocodes', JSON.stringify(updatedCodes));
    toast.success('Status updated');
  };

  const columns = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary-600">{value}</span>
          <button
            onClick={() => copyToClipboard(value)}
            className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
            title="Copy code"
          >
            {copiedCode === value ? <FiCheck className="text-green-600" /> : <FiCopy />}
          </button>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="text-sm font-medium text-gray-800">
            {value === 'percentage' ? `${row.value}%` : formatCurrency(row.value)}
          </span>
          <p className="text-xs text-gray-500">
            {value === 'percentage' ? 'Percentage' : 'Fixed Amount'}
          </p>
        </div>
      ),
    },
    {
      key: 'minPurchase',
      label: 'Min Purchase',
      sortable: true,
      render: (value) => value > 0 ? formatCurrency(value) : 'No minimum',
    },
    {
      key: 'usageLimit',
      label: 'Usage',
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="text-sm font-medium text-gray-800">
            {row.usedCount} / {value === -1 ? '∞' : value}
          </span>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className="bg-primary-600 h-1.5 rounded-full"
              style={{ width: `${value === -1 ? 0 : Math.min((row.usedCount / value) * 100, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'endDate',
      label: 'Valid Until',
      sortable: true,
      render: (value) => formatDateTime(value),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value, row) => (
        <button
          onClick={() => toggleStatus(row.id)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${value === 'active'
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
        >
          {value}
        </button>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingCode(row)}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Promo Codes</h1>
          <p className="text-sm sm:text-base text-gray-600">Create and manage discount codes</p>
        </div>
        <button
          onClick={() => setEditingCode({ code: '', type: 'percentage', value: '', minPurchase: 0, maxDiscount: '', usageLimit: '', startDate: '', endDate: '', status: 'active' })}
          className="flex items-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm"
        >
          <FiPlus />
          <span>Add Promo Code</span>
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
              placeholder="Search promo codes..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'expired', label: 'Expired' },
            ]}
            className="min-w-[140px]"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <ExportButton
            data={filteredCodes}
            headers={[
              { label: 'Code', accessor: (row) => row.code },
              { label: 'Type', accessor: (row) => row.type },
              { label: 'Value', accessor: (row) => row.type === 'percentage' ? `${row.value}%` : formatCurrency(row.value) },
              { label: 'Min Purchase', accessor: (row) => formatCurrency(row.minPurchase) },
              { label: 'Usage', accessor: (row) => `${row.usedCount} / ${row.usageLimit}` },
              { label: 'Status', accessor: (row) => row.status },
            ]}
            filename="promo-codes"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <DataTable
          data={filteredCodes}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      </div>

      <AnimatePresence>
        {editingCode !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setEditingCode(null)}
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
                className={`bg-white ${isAppRoute ? 'rounded-b-3xl' : 'rounded-t-3xl'} sm:rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto`}
                style={{ willChange: 'transform' }}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {editingCode.id ? 'Edit Promo Code' : 'Add Promo Code'}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleSave({
                      code: formData.get('code').toUpperCase(),
                      type: formData.get('type'),
                      value: parseFloat(formData.get('value')),
                      minPurchase: parseFloat(formData.get('minPurchase')),
                      maxDiscount: parseFloat(formData.get('maxDiscount')),
                      usageLimit: parseInt(formData.get('usageLimit')) || -1,
                      startDate: formData.get('startDate'),
                      endDate: formData.get('endDate'),
                      status: formData.get('status'),
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiTag className="inline mr-2" />
                      Promo Code
                    </label>
                    <input
                      type="text"
                      name="code"
                      defaultValue={editingCode.code || ''}
                      placeholder="SAVE20"
                      required
                      maxLength={20}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <AnimatedSelect
                        name="type"
                        value={editingCode.type || 'percentage'}
                        onChange={(e) => setEditingCode({ ...editingCode, type: e.target.value })}
                        options={[
                          { value: 'percentage', label: 'Percentage' },
                          { value: 'fixed', label: 'Fixed Amount' },
                        ]}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Discount Value</label>
                      <input
                        type="number"
                        name="value"
                        defaultValue={editingCode.value || ''}
                        placeholder={editingCode.type === 'fixed' ? '50.00' : '20'}
                        required
                        min="0"
                        step={editingCode.type === 'fixed' ? '0.01' : '1'}
                        max={editingCode.type === 'percentage' ? '100' : ''}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Purchase</label>
                      <input
                        type="number"
                        name="minPurchase"
                        defaultValue={editingCode.minPurchase || '0'}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Discount</label>
                      <input
                        type="number"
                        name="maxDiscount"
                        defaultValue={editingCode.maxDiscount || ''}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limit</label>
                    <input
                      type="number"
                      name="usageLimit"
                      defaultValue={editingCode.usageLimit || ''}
                      placeholder="Leave empty for unlimited"
                      min="-1"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter -1 for unlimited usage</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="datetime-local"
                        name="startDate"
                        defaultValue={editingCode.startDate ? new Date(editingCode.startDate).toISOString().slice(0, 16) : ''}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="datetime-local"
                        name="endDate"
                        defaultValue={editingCode.endDate ? new Date(editingCode.endDate).toISOString().slice(0, 16) : ''}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <AnimatedSelect
                      name="status"
                      value={editingCode.status || 'active'}
                      onChange={(e) => setEditingCode({ ...editingCode, status: e.target.value })}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]}
                      required
                    />
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
                      onClick={() => setEditingCode(null)}
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
        title="Delete Promo Code?"
        message="Are you sure you want to delete this promo code? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

export default PromoCodes;

