import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiVideo, FiPackage } from "react-icons/fi";
import { motion } from "framer-motion";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { createVendorReel } from "../../services/reelService";
import { getVendorProducts } from "../../services/productService";
import AnimatedSelect from "../../../../modules/Admin/components/AnimatedSelect";
import toast from "react-hot-toast";

const AddReel = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const [loading, setLoading] = useState(false);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [formData, setFormData] = useState({
    videoUrl: "",
    thumbnail: "",
    productId: "",
    productName: "",
    productPrice: "",
    vendorName: vendor?.storeName || vendor?.name || "",
    vendorId: vendor?.id || null,
    status: "draft",
    likes: 0,
    comments: 0,
    shares: 0,
  });

  useEffect(() => {
    loadVendorProducts();
  }, [vendor?.id]);

  const loadVendorProducts = async () => {
    if (!vendor?.id) return;

    try {
      const response = await getVendorProducts({ limit: 1000 });
      // Handle both response structures
      if (response?.data?.products) {
        setVendorProducts(response.data.products);
      } else if (response?.products) {
        setVendorProducts(response.products);
      } else if (Array.isArray(response)) {
        setVendorProducts(response);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  useEffect(() => {
    if (formData.productId) {
      const product = vendorProducts.find((p) => (p._id || p.id)?.toString() === formData.productId);
      if (product) {
        setFormData((prev) => ({
          ...prev,
          productName: product.name,
          productPrice: product.price,
          thumbnail: product.image || prev.thumbnail,
        }));
      }
    }
  }, [formData.productId, vendorProducts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.videoUrl) {
        toast.error("Please provide a video URL");
        setLoading(false);
        return;
      }

      if (!formData.productId) {
        toast.error("Please select a product");
        setLoading(false);
        return;
      }

      const reelData = {
        videoUrl: formData.videoUrl,
        thumbnail: formData.thumbnail || null,
        productId: formData.productId,
        status: formData.status,
        likes: parseInt(formData.likes) || 0,
        comments: parseInt(formData.comments) || 0,
        shares: parseInt(formData.shares) || 0,
        views: 0,
      };

      await createVendorReel(reelData);
      toast.success("Reel added successfully!");
      navigate("/vendor/reels/all-reels");
    } catch (error) {
      console.error("Error adding reel:", error);
      toast.error(error.response?.data?.message || "Failed to add reel. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Add New Reel
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create a new product reel with video content
          </p>
        </div>
        <button
          onClick={() => navigate("/vendor/reels/all-reels")}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <FiX className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Product <span className="text-red-500">*</span>
            </label>
            <AnimatedSelect
              value={formData.productId}
              onChange={(e) => setFormData((prev) => ({ ...prev, productId: e.target.value }))}
              options={[
                { value: "", label: "Select a product" },
                ...vendorProducts.map((product) => ({
                  value: (product._id || product.id).toString(),
                  label: `${product.name} - ₹${product.price}`,
                })),
              ]}
            />
            {formData.productId && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Selected: {formData.productName}
              </p>
            )}
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Video URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              name="videoUrl"
              value={formData.videoUrl}
              onChange={handleChange}
              placeholder="https://example.com/video.mp4"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter the URL of your video file (MP4, WebM, etc.)
            </p>
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Thumbnail Image URL
            </label>
            <input
              type="url"
              name="thumbnail"
              value={formData.thumbnail}
              onChange={handleChange}
              placeholder="https://example.com/thumbnail.jpg"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {formData.thumbnail && (
              <img
                src={formData.thumbnail}
                alt="Thumbnail preview"
                className="mt-2 w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <AnimatedSelect
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              options={[
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </div>

          {/* Engagement Stats (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Initial Likes
              </label>
              <input
                type="number"
                name="likes"
                value={formData.likes}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Initial Comments
              </label>
              <input
                type="number"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Initial Shares
              </label>
              <input
                type="number"
                name="shares"
                value={formData.shares}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/vendor/reels/all-reels")}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FiSave className="text-lg" />
            {loading ? "Saving..." : "Save Reel"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default AddReel;

