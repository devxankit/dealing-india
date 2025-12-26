import { useState, useEffect } from "react";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiHelpCircle,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmModal from "../../Admin/components/ConfirmModal";
import AnimatedSelect from "../../Admin/components/AnimatedSelect";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { getVendorProducts } from "../services/productService";
import {
  getVendorFAQs,
  createVendorFAQ,
  updateVendorFAQ,
  deleteVendorFAQ,
} from "../services/faqService";
import toast from "react-hot-toast";

const ProductFAQs = () => {
  const { vendor } = useVendorAuthStore();
  const [faqs, setFaqs] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFaq, setEditingFaq] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [productFilter, setProductFilter] = useState("all");

  const vendorId = vendor?.id;

  // Fetch products
  useEffect(() => {
    if (!vendorId) return;
    const fetchProducts = async () => {
      try {
        const response = await getVendorProducts({ limit: 1000 });
        if (response?.data?.products) {
          setProducts(response.data.products);
        } else if (response?.products) {
          setProducts(response.products);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Failed to load products");
      }
    };
    fetchProducts();
  }, [vendorId]);

  // Fetch FAQs
  useEffect(() => {
    if (!vendorId) return;
    const fetchFAQs = async () => {
      try {
        setIsLoading(true);
        const response = await getVendorFAQs({
          productId: productFilter === "all" ? "all" : productFilter,
          status: "all",
          limit: 1000,
        });
        // Handle both response structures
        if (response?.faqs) {
          setFaqs(response.faqs);
        } else if (response?.data?.faqs) {
          setFaqs(response.data.faqs);
        } else if (Array.isArray(response)) {
          setFaqs(response);
        }
      } catch (error) {
        console.error("Error fetching FAQs:", error);
        toast.error("Failed to load FAQs");
        setFaqs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFAQs();
  }, [vendorId, productFilter]);

  const filteredFaqs = faqs.filter(
    (faq) =>
      productFilter === "all" || faq.productId?.toString() === productFilter
  );

  const handleSave = async (faqData) => {
    try {
      if (editingFaq && editingFaq.id) {
        // Update existing FAQ
        const updatedFaq = await updateVendorFAQ(editingFaq.id, {
          productId: faqData.productId,
          question: faqData.question,
          answer: faqData.answer,
          order: faqData.order || 0,
          status: faqData.isActive ? "active" : "inactive",
        });
        setFaqs((prev) =>
          prev.map((f) => (f.id === editingFaq.id ? updatedFaq : f))
        );
        toast.success("FAQ updated");
      } else {
        // Create new FAQ
        const newFaq = await createVendorFAQ({
          productId: faqData.productId,
          question: faqData.question,
          answer: faqData.answer,
          order: faqData.order || 0,
          status: faqData.isActive ? "active" : "inactive",
        });
        setFaqs((prev) => [...prev, newFaq]);
        toast.success("FAQ added");
      }
      setEditingFaq(null);
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast.error(error.response?.data?.message || "Failed to save FAQ");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVendorFAQ(deleteModal.id);
      setFaqs((prev) => prev.filter((f) => f.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null });
      toast.success("FAQ deleted");
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast.error(error.response?.data?.message || "Failed to delete FAQ");
    }
  };

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view FAQs</p>
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
            <FiHelpCircle className="text-primary-600" />
            Product FAQs
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage frequently asked questions for products
          </p>
        </div>
        <button
          onClick={() => setEditingFaq({})}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          <FiPlus />
          <span>Add FAQ</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <AnimatedSelect
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          options={[
            { value: "all", label: "All Products" },
            ...products.map((product) => ({
              value: product._id?.toString() || product.id?.toString(),
              label: product.name,
            })),
          ]}
          className="w-full sm:w-auto min-w-[200px]"
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">Loading FAQs...</p>
          </div>
        ) : filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq) => (
            <div
              key={faq.id || faq._id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-600">
                      {faq.productName ||
                        products.find(
                          (p) =>
                            (p._id?.toString() || p.id?.toString()) ===
                            (faq.productId?.toString() || faq.productId)
                        )?.name ||
                        "Unknown Product"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedFaq(
                        expandedFaq === (faq.id || faq._id)
                          ? null
                          : faq.id || faq._id
                      )
                    }
                    className="w-full text-left">
                    <p className="font-semibold text-gray-800 mb-2">
                      {faq.question}
                    </p>
                  </button>
                  <AnimatePresence>
                    {expandedFaq === (faq.id || faq._id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2">
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setEditingFaq(faq)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <FiEdit />
                  </button>
                  <button
                    onClick={() =>
                      setDeleteModal({ isOpen: true, id: faq.id || faq._id })
                    }
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No FAQs found</p>
          </div>
        )}
      </div>

      {editingFaq !== null && (
        <FAQForm
          faq={editingFaq}
          products={products}
          onSave={handleSave}
          onClose={() => setEditingFaq(null)}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

const FAQForm = ({ faq, products, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    productId: faq?.productId?.toString() || faq?.productId || "",
    question: faq?.question || "",
    answer: faq?.answer || "",
    order: faq?.order || 1,
    isActive: faq?.status === "active" || faq?.isActive !== undefined
      ? faq.isActive
      : true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.question || !formData.answer) {
      toast.error("Please fill in all required fields");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {faq?.id || faq?._id ? "Edit FAQ" : "Add FAQ"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiChevronUp className="text-xl text-gray-600 rotate-180" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Product *
            </label>
            <select
              value={formData.productId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  productId: e.target.value,
                })
              }
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select Product</option>
              {products.map((product) => (
                <option
                  key={product._id || product.id}
                  value={product._id?.toString() || product.id?.toString()}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Question *
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) =>
                setFormData({ ...formData, question: e.target.value })
              }
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Answer *
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) =>
                setFormData({ ...formData, answer: e.target.value })
              }
              required
              rows="4"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
              {faq?.id ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFAQs;
