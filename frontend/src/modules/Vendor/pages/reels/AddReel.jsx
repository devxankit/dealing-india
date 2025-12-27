import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiVideo } from "react-icons/fi";
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Reel</h1>
          <p className="text-gray-500 mt-1">Showcase your products with engaging video content.</p>
        </div>
        <button
          onClick={() => navigate("/vendor/reels/all-reels")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <FiX className="text-xl" />
          <span className="font-medium">Cancel</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <FiVideo className="text-xl" />
              </span>
              <h2 className="text-lg font-bold text-gray-800">Reel Details</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Product <span className="text-red-500">*</span>
                </label>
                <AnimatedSelect
                  value={formData.productId}
                  onChange={(value) => setFormData((prev) => ({ ...prev, productId: value }))}
                  options={[
                    { value: "", label: "Select a product to feature" },
                    ...vendorProducts.map((product) => ({
                      value: (product._id || product.id).toString(),
                      label: `${product.name} - ₹${product.price}`,
                    })),
                  ]}
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>

              {/* Video & Thumbnail */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Video URL <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      name="videoUrl"
                      value={formData.videoUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/video.mp4"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-gray-400"
                      required
                    />
                    <FiVideo className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Thumbnail URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      name="thumbnail"
                      value={formData.thumbnail}
                      onChange={handleChange}
                      placeholder="https://example.com/thumb.jpg"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-gray-400"
                    />
                    <FiUpload className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Publication Status
                </label>
                <div className="w-full md:w-1/2">
                  <AnimatedSelect
                    value={formData.status}
                    onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                    options={[
                      { value: "draft", label: "Save as Draft" },
                      { value: "active", label: "Publish Immediately" },
                      { value: "archived", label: "Archived" },
                    ]}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                </div>
              </div>

              {/* Social Proof Seeding */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Initial Engagement (Optional)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Likes</label>
                    <input
                      type="number"
                      name="likes"
                      value={formData.likes}
                      onChange={handleChange}
                      min="0"
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Comments</label>
                    <input
                      type="number"
                      name="comments"
                      value={formData.comments}
                      onChange={handleChange}
                      min="0"
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Shares</label>
                    <input
                      type="number"
                      name="shares"
                      value={formData.shares}
                      onChange={handleChange}
                      min="0"
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/vendor/reels/all-reels")}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <FiSave />
              {loading ? "Saving..." : "Publish Reel"}
            </button>
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-4">
          <div className="sticky top-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Mobile Preview</h3>
            <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-gray-800 relative aspect-[9/19] max-w-[300px] mx-auto">
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>

              {/* Video Content */}
              {formData.videoUrl || formData.thumbnail ? (
                <div className="relative w-full h-full">
                  {formData.videoUrl ? (
                    <video
                      src={formData.videoUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img src={formData.thumbnail} className="w-full h-full object-cover" alt="Preview" />
                  )}

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none"></div>

                  {/* Right Actions Bar */}
                  <div className="absolute right-4 bottom-20 flex flex-col gap-6 items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                        <span className="text-xl">❤️</span>
                      </div>
                      <span className="text-white text-xs font-medium">{formData.likes || 0}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                        <span className="text-xl">💬</span>
                      </div>
                      <span className="text-white text-xs font-medium">{formData.comments || 0}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                        <span className="text-xl">↗️</span>
                      </div>
                      <span className="text-white text-xs font-medium">{formData.shares || 0}</span>
                    </div>
                  </div>

                  {/* Bottom Info */}
                  <div className="absolute bottom-4 left-4 right-16 text-white text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
                        {vendor?.storeName?.[0] || 'V'}
                      </div>
                      <span className="font-semibold text-sm shadow-sm">{vendor?.storeName || 'Your Store'}</span>
                    </div>
                    <p className="text-sm line-clamp-2 leading-snug opacity-90">
                      {formData.productName ? `Check out ${formData.productName}!` : 'Product description will appear here...'}
                    </p>
                    {formData.productPrice && (
                      <div className="mt-2 inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
                        ₹ {formData.productPrice}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900">
                  <FiVideo className="text-4xl mb-2 opacity-50" />
                  <p className="text-xs">Preview will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddReel;
