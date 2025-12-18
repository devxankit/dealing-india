import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../../components/ConfirmModal';
import AnimatedSelect from '../../components/AnimatedSelect';
import toast from 'react-hot-toast';

const ProductFAQs = () => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');
  const [faqs, setFaqs] = useState([
    {
      id: 1,
      productId: 1,
      productName: 'Sample Product',
      question: 'What is the warranty period?',
      answer: 'The product comes with a 1-year manufacturer warranty.',
      order: 1,
      status: 'active',
    },
    {
      id: 2,
      productId: 1,
      productName: 'Sample Product',
      question: 'How do I return this product?',
      answer: 'You can return the product within 30 days of purchase.',
      order: 2,
      status: 'active',
    },
    {
      id: 3,
      productId: 2,
      productName: 'Another Product',
      question: 'Is this product waterproof?',
      answer: 'Yes, this product is IP68 waterproof rated.',
      order: 1,
      status: 'active',
    },
  ]);
  const [editingFaq, setEditingFaq] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [productFilter, setProductFilter] = useState('all');

  const filteredFaqs = faqs.filter(
    (faq) => productFilter === 'all' || faq.productId.toString() === productFilter
  );

  const handleSave = (faqData) => {
    if (editingFaq && editingFaq.id) {
      setFaqs(faqs.map((f) => (f.id === editingFaq.id ? { ...faqData, id: editingFaq.id } : f)));
      toast.success('FAQ updated');
    } else {
      const newId = faqs.length > 0 ? Math.max(...faqs.map(f => f.id)) + 1 : 1;
      setFaqs([...faqs, { ...faqData, id: newId }]);
      toast.success('FAQ added');
    }
    setEditingFaq(null);
  };

  const handleDelete = () => {
    setFaqs(faqs.filter((f) => f.id !== deleteModal.id));
    setDeleteModal({ isOpen: false, id: null });
    toast.success('FAQ deleted');
  };

  const uniqueProducts = [...new Set(faqs.map((f) => ({ id: f.productId, name: f.productName })))];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Product FAQs</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage frequently asked questions for products</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <AnimatedSelect
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Products' },
              ...uniqueProducts.map((product) => ({
                value: product.id.toString(),
                label: product.name,
              })),
            ]}
            className="min-w-[160px] whitespace-nowrap"
          />
          <button
            onClick={() => setEditingFaq({})}
            className="flex items-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm whitespace-nowrap ml-auto"
          >
            <FiPlus />
            <span>Add FAQ</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredFaqs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No FAQs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                        {faq.productName}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${faq.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {faq.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">{faq.question}</h3>
                    {expandedFaq === faq.id && (
                      <p className="text-sm text-gray-600 mt-2">{faq.answer}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {expandedFaq === faq.id ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                    <button
                      onClick={() => setEditingFaq(faq)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, id: faq.id })}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit FAQ Modal */}
      <AnimatePresence>
        {editingFaq !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setEditingFaq(null)}
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
                  {editingFaq && editingFaq.id ? 'Edit FAQ' : 'Add FAQ'}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleSave({
                      productId: parseInt(formData.get('productId')),
                      productName: formData.get('productName'),
                      question: formData.get('question'),
                      answer: formData.get('answer'),
                      order: parseInt(formData.get('order')),
                      status: formData.get('status'),
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                    <input
                      type="number"
                      name="productId"
                      defaultValue={editingFaq?.productId || ''}
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                      type="text"
                      name="productName"
                      defaultValue={editingFaq?.productName || ''}
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                    <textarea
                      name="question"
                      defaultValue={editingFaq?.question || ''}
                      required
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                    <textarea
                      name="answer"
                      defaultValue={editingFaq?.answer || ''}
                      required
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                      <input
                        type="number"
                        name="order"
                        defaultValue={editingFaq?.order || 1}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <AnimatedSelect
                        name="status"
                        value={editingFaq?.status || 'active'}
                        onChange={(e) => {
                          setEditingFaq({ ...editingFaq, status: e.target.value });
                        }}
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
                      onClick={() => setEditingFaq(null)}
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
        title="Delete FAQ?"
        message="Are you sure you want to delete this FAQ? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

export default ProductFAQs;

